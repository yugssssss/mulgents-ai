import fs from "fs";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createVectorStore } from "../utils/vectorStore.js";
import {
  HumanMessage,
  SystemMessage
} from "@langchain/core/messages";
import { getModel } from "../utils/model.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import redis from "../../../shared/redis/redis.js";

const PDF_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

async function getCachedDocs(conversationId) {
  const raw = await redis.get(`pdf-context:${conversationId}`);
  if (!raw) return null;
  const chunks = JSON.parse(raw);
  return chunks.map(text => ({ pageContent: text }));
}

async function cacheDocs(conversationId, docs) {
  const chunks = docs.map(d => d.pageContent);
  await redis.set(
    `pdf-context:${conversationId}`,
    JSON.stringify(chunks),
    "EX",
    PDF_CACHE_TTL
  );
}

export const pdfRagAgent = async (state) => {
  let collectionName = null;
  let docs = null;
  let newUpload = false;

  try {
    const llm = getModel("pdf-rag");

    if (!state.file) {
      // No file attached — use cached chunks from Redis
      docs = await getCachedDocs(state.conversationId);
      if (!docs) {
        return {
          ...state,
          response: "📎 No PDF found for this conversation. Please upload a PDF first."
        };
      }
      console.log("Using cached PDF chunks from Redis:", docs.length, "chunks");
    } else {
      // New file uploaded: parse, chunk, and cache for this conversation
      const buffer = fs.readFileSync(state.file.path);
      const pdf = new PDFParse({ data: buffer });
      const result = await pdf.getText();
      const text = result.text;

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      });

      docs = await splitter.createDocuments([text]);
      newUpload = true;

      await cacheDocs(state.conversationId, docs);
      console.log("PDF parsed and cached:", docs.length, "chunks for conversation:", state.conversationId);
    }

    // Build vector store and run similarity search
    collectionName = `pdf-${state.conversationId}-${Date.now()}`;
    const vectorStore = await createVectorStore(collectionName, docs);

    // Clean query for vector retrieval to prevent instruction-word dilution
    const cleanQuery = state.prompt
      .replace(/\b(rate|rating|score|evaluate|assessment|out of \d+|scale of \d+|compare|summarize|give a score)\b/gi, "")
      .trim() || state.prompt;

    let relevantDocs;
    if (docs.length <= 10) {
      relevantDocs = docs;
    } else {
      relevantDocs = await vectorStore.similaritySearch(cleanQuery, 10);
    }
    console.log("Retrieved relevant docs count:", relevantDocs.length);

    const context = relevantDocs
      .map(doc => doc.pageContent)
      .join("\n\n");

    const messages = [
      new SystemMessage(`
You are CortexAI PDF Assistant.

Rules:
- Base your answers, facts, and analysis on the uploaded PDF context.
- You are allowed and encouraged to reason, synthesize, evaluate, rate, or summarize based on the facts provided in the PDF context when requested by the user.
- Do NOT invent or hallucinate core facts or skills that are not present in the PDF context.
- If the requested topic or document content is completely absent from the PDF context, reply: "I couldn't find this information in the uploaded PDF."
- Use Markdown formatting.
`),
      new HumanMessage(`
Context:
${context}

Question:
${state.prompt}
`)
    ];

    const response = await llm.invoke(messages);

    let content = response.content;
    if (Array.isArray(content)) {
      content = content.map(c => (typeof c === "string" ? c : c.text || "")).join("");
    }

    return {
      ...state,
      docs,
      response: content
    };

  } catch (error) {
    console.error("PDF RAG Agent Error:", error);
    return {
      ...state,
      response: `❌ Failed to process PDF: ${error.message}`
    };
  } finally {
    if (newUpload && state.file && state.file.path) {
      try {
        if (fs.existsSync(state.file.path)) {
          fs.unlinkSync(state.file.path);
        }
      } catch (err) {
        console.log("File cleanup error:", err.message);
      }
    }
    if (collectionName && process.env.QDRANT_URL) {
      try {
        const client = new QdrantClient({
          url: process.env.QDRANT_URL,
          apiKey: process.env.QDRANT_API_KEY,
          checkCompatibility: false
        });
        await client.deleteCollection(collectionName);
      } catch (err) {
        console.log("Qdrant cleanup warning:", err.message);
      }
    }
  }
};