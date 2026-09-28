import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true, // Don't connect immediately — connect on first use
  retryStrategy(times) {
    if (times > 20) return null; // Stop retrying after 20 attempts (avoid SIGTERM from log flood)
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redis.on("connect", () => {
  console.log("✅ Redis Connected");
});

redis.on("error", (err) => {
  console.log("⚠️ Redis Connection Error:", err.message);
});

// Connect lazily
redis.connect().catch(() => {});

export default redis;