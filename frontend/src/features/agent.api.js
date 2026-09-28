import api from "../utils/axios";

// Pre-warm all backend services on first call to avoid cold-start timeouts
let warmedUp = false;
const warmup = async () => {
  if (warmedUp) return;
  try {
    await api.get("/api/warmup", { timeout: 12000 });
    warmedUp = true;
  } catch {
    // Ignore — warmup is best-effort
  }
};

export const sendPrompt = async (payload) => {
  // Fire warmup in the background so services wake up
  warmup();

  // Retry once on 503 (service cold-starting) after a 5s wait
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { data } = await api.post("/api/agent/chat", payload);
      return data;
    } catch (error) {
      const status = error?.response?.status;
      const isTimeout = error.code === "ECONNABORTED" || error.message?.includes("timeout");
      const isColdStart = status === 503 || isTimeout;

      if (isColdStart && attempt === 1) {
        // Service is waking up — wait 5s and retry once
        console.log("⏳ Service cold-starting, retrying in 5s...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      throw error;
    }
  }
};