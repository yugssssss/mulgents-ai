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
    origin:"http://localhost:5173",
    credentials:true
}));
app.use(
  "/uploads",
  express.static("uploads")
);
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api/auth",proxy(process.env.AUTH_SERVICE))
app.use("/api/me",protect,getCurrentUser)
app.use("/api/chat",protect,proxyWithUser(process.env.CHAT_SERVICE))
app.use("/api/agent",protect,proxyWithUser(process.env.AGENT_SERVICE))
app.use("/api/billing",protect,proxyWithUser(process.env.BILLING_SERVICE))


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
