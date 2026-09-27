import { TavilySearch } from "@langchain/tavily";

export const searchTool = new TavilySearch({
  tavilyApiKey: process.env.TAVILY_API_KEY || "tvly-dev-dummy-key",
  maxResults: 5,
  topic: "general",
  includeImages: true
});
