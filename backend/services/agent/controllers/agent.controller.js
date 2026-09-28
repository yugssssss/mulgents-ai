import redis from "../../../shared/redis/redis.js";
import { graph } from "../graph/supervisor.graph.js";
import { addMessage } from "../utils/memory.js";
import axios from "axios";
import fs from "fs/promises";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getDownloadUrl } from "../utils/getDownloadUrl.js";
import crypto from "crypto";

const resolveUrl = (raw) => {
  if (!raw) return "http://localhost:8002";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.includes(".onrender.com")) return `https://${raw}`;
  if (raw.includes(":")) return `https://mulgents-chat-service.onrender.com`;
  return `http://${raw}`;
};

// Process the LLM job asynchronously and store result in Redis
const processJob = async (jobId, { prompt, conversationId, agent, userId, filePath, fileMimetype, fileOriginalname }) => {
  const chatServiceUrl = resolveUrl(process.env.CHAT_SERVICE);

  try {
    let userImages = [];
    if (filePath && fileMimetype && fileMimetype.startsWith("image/")) {
      try {
        const fileBuffer = await fs.readFile(filePath);
        const fileName = `upload-${Date.now()}-${fileOriginalname}`;
        await uploadToS3(fileBuffer, fileName, fileMimetype);
        const imageUrl = await getDownloadUrl(fileName, 7 * 24 * 60 * 60);
        userImages.push(imageUrl);
      } catch (err) {
        console.error("Failed to upload user image to S3:", err);
      }
    }

    await addMessage(conversationId, "user", prompt);

    // Save user message to chat service (fire and forget errors here)
    try {
      await axios.post(`${chatServiceUrl}/save-message`, {
        conversationId, role: "user", content: prompt, images: userImages
      });
    } catch (e) {
      console.error("Failed to save user message:", e.message);
    }

    const result = await graph.invoke({ prompt, conversationId, userId, agent });

    await addMessage(conversationId, "assistant", result.response);

    // Save assistant message
    try {
      await axios.post(`${chatServiceUrl}/save-message`, {
        conversationId, role: "assistant", content: result.response,
        images: result.images, artifacts: result.artifacts || []
      });
    } catch (e) {
      console.error("Failed to save assistant message:", e.message);
    }

    // Store result in Redis (TTL: 5 minutes — enough for polling)
    await redis.set(`job:${jobId}`, JSON.stringify({
      status: "done",
      answer: result.response,
      images: result.images,
      artifacts: result.artifacts || []
    }), "EX", 300);

  } catch (error) {
    console.error("Job processing error:", error);
    await redis.set(`job:${jobId}`, JSON.stringify({
      status: "error",
      message: error.message || "Agent processing failed"
    }), "EX", 300);
  }

  // Clean up temp file if exists
  if (filePath) {
    fs.unlink(filePath).catch(() => {});
  }
};

// POST /chat — returns jobId immediately, processes in background
export const chat = async (req, res, next) => {
  try {
    const { prompt, conversationId, agent } = req.body;
    const userId = req.headers["x-user-id"];

    const jobId = crypto.randomUUID();

    // Mark job as pending in Redis
    await redis.set(`job:${jobId}`, JSON.stringify({ status: "pending" }), "EX", 300);

    // Start processing asynchronously (do NOT await)
    processJob(jobId, {
      prompt,
      conversationId,
      agent,
      userId,
      filePath: req.file?.path,
      fileMimetype: req.file?.mimetype,
      fileOriginalname: req.file?.originalname,
    });

    // Respond immediately with jobId — frontend will poll for result
    return res.json({ jobId, status: "pending" });

  } catch (error) {
    next(error);
  }
};

// GET /status/:jobId — poll this to get result
export const getJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const raw = await redis.get(`job:${jobId}`);

    if (!raw) {
      return res.status(404).json({ status: "not_found" });
    }

    const job = JSON.parse(raw);
    return res.json(job);

  } catch (error) {
    next(error);
  }
};