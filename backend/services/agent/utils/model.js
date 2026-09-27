import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenRouter } from "@langchain/openrouter";
import dotenv from "dotenv";

dotenv.config();

export const getModel = (agent) => {
  const openRouterKey = process.env.OPENROUTER_API_KEY || "dummy_openrouter_key";
  const googleKey = process.env.GOOGLE_API_KEY || "dummy_google_key";
  const groqKey = process.env.GROQ_API_KEY || "dummy_groq_key";

  switch (agent) {
    case "coding":
    case "image":
      return new ChatOpenRouter({
        apiKey: openRouterKey,
        model: "deepseek/deepseek-chat",
        temperature: 0,
        maxTokens: 4500,
      });

    case "vision":
      return new ChatGoogleGenerativeAI({
        model: "gemini-3.6-flash",
        apiKey: googleKey,
      });

    case "search":
    case "chat":
    default:
      return new ChatGroq({
        apiKey: groqKey,
        model: "openai/gpt-oss-20b",
        temperature: 0,
        maxTokens: 2048,
        maxRetries: 2,
      });
  }
};