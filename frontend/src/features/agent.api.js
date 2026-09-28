import api from "../utils/axios";

// Poll for job result every 2 seconds until done or error (max 3 minutes)
const pollJobResult = async (jobId) => {
  const MAX_POLLS = 90; // 90 * 2s = 3 minutes max wait
  const POLL_INTERVAL = 2000; // 2 seconds

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    const { data } = await api.get(`/api/agent/status/${jobId}`, { timeout: 10000 });

    if (data.status === "done") return data;
    if (data.status === "error") throw new Error(data.message || "Agent processing failed");
    // status === "pending" — keep polling
  }

  throw new Error("Agent timed out after 3 minutes. Please try again.");
};

export const sendPrompt = async (payload) => {
  // Step 1: Submit the job — agent returns jobId immediately (< 1s)
  const { data } = await api.post("/api/agent/chat", payload, { timeout: 15000 });

  if (!data.jobId) {
    // Fallback: old API returned result directly
    return data;
  }

  // Step 2: Poll for the result
  return await pollJobResult(data.jobId);
};