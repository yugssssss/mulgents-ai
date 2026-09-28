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

  // If not set at all, use local fallback
  if (!raw) return `http://localhost:${localPort}`;

  // Already a full URL
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  // Internal Render hostport like "mulgents-auth-service:8001"
  // or just a hostname — use HTTPS if it looks like a Render service
  if (raw.includes(".onrender.com")) return `https://${raw}`;

  // Render internal format "service-name:port" — use public URL instead
  if (raw.includes(":")) {
    return `https://${renderServiceName}.onrender.com`;
  }

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

const makeProxy = (serviceName, targetUrl) =>
  proxy(targetUrl, {
    timeout: 60000,
    proxyErrorHandler: (err, res, next) => {
      console.error(`❌ Proxy [${serviceName}] -> ${targetUrl} : ${err?.message}`);
      return res.status(503).json({
        message: `${serviceName} is unavailable. Please retry in a few seconds.`,
        code: err?.code
      });
    }
  });

app.use("/api/auth",    makeProxy("Auth Service",    authService));
app.use("/api/me",      protect, getCurrentUser);
app.use("/api/chat",    protect, proxyWithUser(chatService));
app.use("/api/agent",   protect, proxyWithUser(agentService));
app.use("/api/billing", protect, proxyWithUser(billingService));

app.get("/", (req, res) => {
  res.status(200).json({ service: "gateway", status: "ok" });
});

app.listen(port, () => {
  console.log(`Gateway running on port ${port}`);
});
