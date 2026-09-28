import express from "express";
import { chat, getJobStatus } from "../controllers/agent.controller.js";
import multer from "../config/multer.js";

const router = express.Router();

router.post("/chat", multer.single("file"), chat);
router.get("/status/:jobId", getJobStatus);

export default router;