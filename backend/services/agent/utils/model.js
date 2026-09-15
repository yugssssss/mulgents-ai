import { ChatGoogleGenerativeAI }
  from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq"
import dotenv from "dotenv"
dotenv.config()
import { ChatOpenRouter } from "@langchain/openrouter";

const openRouter = new ChatOpenRouter({
  model: "deepseek/deepseek-chat",
  temperature: 0,
  maxTokens: 4500,
});


export const gemini =
  new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    apiKey: process.env.GOOGLE_API_KEY,
  });

// openai/gpt-oss-20b is a standard instruction model — no <think> tags.
const groq = new ChatGroq({
  model: "openai/gpt-oss-20b",
  temperature: 0,
  maxTokens: 2048,
  maxRetries: 2,
})

// openai/gpt-oss-120b for image prompt engineering.
// The 20b safety-filtered model refuses image-style prompts; 120b handles them correctly.
const groqImage = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0.7,
  maxTokens: 512,
  maxRetries: 2,
})


export const getModel =
  (agent) => {

    switch (agent) {

      case "coding":
        return openRouter;

      case "image":
        // OpenRouter deepseek-chat is used for image prompt engineering.
        // Groq's OpenAI OSS models refuse image-related prompt generation tasks.
        return openRouter;

      case "search":
        return groq;

      case "chat":
        return groq;
      case "vision":
        return gemini;
      default:
        return groq;

    }

  }