import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "AIzaSy_fallback_key",
  model: "text-embedding-004"
});