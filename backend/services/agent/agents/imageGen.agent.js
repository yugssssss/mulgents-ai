import axios from "axios";
import { getModel } from "../utils/model.js";

import { uploadToS3 } from "../utils/uploadToS3.js";
import { getDownloadUrl } from "../utils/getDownloadUrl.js";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";

export const imageAgent = async (state) => {
  try {
    const llm = getModel("image");

    const promptResponse = await llm.invoke(`
Write a detailed, high quality visual prompt for an image generator based on this request: "${state.prompt}".
IMPORTANT: Output ONLY the descriptive image prompt text. Do NOT say "I cannot generate images", do NOT include conversational filler, intro, outro, explanations, or markdown code blocks.
`);

    let enhancedPrompt = "";
    if (typeof promptResponse?.content === "string") {
      enhancedPrompt = promptResponse.content;
    } else if (Array.isArray(promptResponse?.content)) {
      enhancedPrompt = promptResponse.content
        .map((c) => (typeof c === "string" ? c : c.text || ""))
        .join(" ");
    } else if (promptResponse?.content && typeof promptResponse.content === "object") {
      enhancedPrompt = promptResponse.content.text || JSON.stringify(promptResponse.content);
    }

    enhancedPrompt = (enhancedPrompt || "")
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    if (
      !enhancedPrompt ||
      enhancedPrompt.toLowerCase().includes("cannot generate") ||
      enhancedPrompt.toLowerCase().includes("can't generate")
    ) {
      enhancedPrompt = state.prompt;
    }

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      enhancedPrompt
    )}`;

    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 30000,
    });

    const imageBuffer = Buffer.from(imageResponse.data);
    const fileName = `image-${Date.now()}.png`;

    await uploadToS3(imageBuffer, fileName, "image/png");

    const downloadUrl = await getDownloadUrl(fileName, 24 * 60 * 60);

    return {
      ...state,
      images: [downloadUrl],
      response: `![Generated Image](${downloadUrl})\n\n[Download Image](${downloadUrl})`,
    };
  } catch (error) {
    console.log("Image Agent Error:", error);
    return {
      ...state,
      response: "❌ Failed to generate image.",
    };
  }
};