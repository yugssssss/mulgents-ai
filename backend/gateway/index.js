import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import redis from "../shared/redis/redis.js";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
import { proxyWithUser } from "./utils/proxyWithHeaders.js";
import { protect } from "./middlewares/auth.middleware.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: (origin, callback) => {
    return callback(null, true);
  },
  credentials: true
}));

app.use("/uploads", express.static("uploads"));

app.use(helmet({
  crossOriginOpenerPolicy: false,
}));

app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Normalize any URL format: hostport, bare host, or full URL
const resolveServiceUrl = (envVar, renderServiceName, localPort) => {
  const raw = process.env[envVar];

  if (!raw) return `http://localhost:${localPort}`;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.includes(".onrender.com")) return `https://${raw}`;
  if (raw.includes(":")) return `https://${renderServiceName}.onrender.com`;
  return `http://${raw}`;
};

const authService    = resolveServiceUrl("AUTH_SERVICE",    "mulgents-auth-service",    8001);
const chatService    = resolveServiceUrl("CHAT_SERVICE",    "mulgents-chat-service",    8002);
const agentService   = resolveServiceUrl("AGENT_SERVICE",   "mulgents-agent-service",   8003);
const billingService = resolveServiceUrl("BILLING_SERVICE", "mulgents-billing-service", 8004);

console.log(`🔗 Auth    -> ${authService}`);
console.log(`🔗 Chat    -> ${chatService}`);
console.log(`🔗 Agent   -> ${agentService}`);
console.log(`🔗 Billing -> ${billingService}`);

// Warmup: ping a service URL to wake it from Render sleep
const pingService = (name, url) =>
  fetch(url, { signal: AbortSignal.timeout(10000) })
    .then(() => ({ name, status: "awake" }))
    .catch(e => ({ name, status: "waking", error: e.message }));

// /api/warmup — call this from the frontend before sending a message
app.get("/api/warmup", async (req, res) => {
  const results = await Promise.allSettled([
    pingService("auth",    authService),
    pingService("chat",    chatService),
    pingService("agent",   agentService),
    pingService("billing", billingService),
  ]);
  res.json({ warmup: results.map(r => r.value || r.reason) });
});

// Self-ping every 14 minutes to keep gateway itself awake on Render free tier
const GATEWAY_URL = process.env.GATEWAY_URL || `http://localhost:${port}`;
setInterval(() => {
  fetch(`${GATEWAY_URL}/`)
    .then(() => console.log("♻️  Gateway self-ping OK"))
    .catch(e => console.log("♻️  Gateway self-ping failed:", e.message));
}, 14 * 60 * 1000);

const makeProxy = (serviceName, targetUrl, timeoutMs = 60000) =>
  proxy(targetUrl, {
    timeout: timeoutMs,
    proxyErrorHandler: (err, res, next) => {
      console.error(`❌ Proxy [${serviceName}] -> ${targetUrl} : ${err?.message}`);
      return res.status(503).json({
        message: `${serviceName} is starting up. Please wait ~30 seconds and try again.`,
        code: err?.code
      });
    }
  });

app.use("/api/auth",    makeProxy("Auth Service",    authService));
app.use("/api/me",      protect, getCurrentUser);
app.use("/api/chat",    protect, proxyWithUser(chatService));
// Agent can take 120s: 50s cold-start + LLM processing time
app.use("/api/agent",   protect, proxyWithUser(agentService, 120000));
app.use("/api/billing", protect, proxyWithUser(billingService));

app.get("/", (req, res) => {
  res.status(200).json({ service: "gateway", status: "ok" });
});

app.listen(port, () => {
  console.log(`Gateway running on port ${port}`);
});
