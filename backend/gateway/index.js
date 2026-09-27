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
import cookieParser from "cookie-parser"
dotenv.config();
const app = express();
const port=process.env.PORT || 5000
app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, postman) or any web origin
      return callback(null, true);
    },
    credentials: true
}));
app.use(
  "/uploads",
  express.static("uploads")
);
app.use(helmet({
  crossOriginOpenerPolicy: false, // Required for Firebase signInWithPopup to work
}));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
const formatUrl = (url, fallback) => {
  if (!url) return fallback;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `http://${url}`;
  }
  return url;
};

const authService = formatUrl(process.env.AUTH_SERVICE, "http://localhost:8001");
const chatService = formatUrl(process.env.CHAT_SERVICE, "http://localhost:8002");
const agentService = formatUrl(process.env.AGENT_SERVICE, "http://localhost:8003");
const billingService = formatUrl(process.env.BILLING_SERVICE, "http://localhost:8004");

app.use("/api/auth", proxy(authService));
app.use("/api/me", protect, getCurrentUser);
app.use("/api/chat", protect, proxyWithUser(chatService));
app.use("/api/agent", protect, proxyWithUser(agentService));
app.use("/api/billing", protect, proxyWithUser(billingService));


app.get("/", (req, res) => {
  res.status(200).json({
    service: "gateway",
    status: "ok"
  });
});


app.listen(port, () => {
  console.log(
    `Gateway running on ${port}`
  );
});
