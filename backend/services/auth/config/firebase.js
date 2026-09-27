import { initializeApp, cert, getApps } from "firebase-admin/app";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let serviceAccount = null;

// 1. Try reading from FIREBASE_SERVICE_ACCOUNT JSON environment variable
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err.message);
  }
}

// 2. Try individual environment variables
if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY) {
  serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
}

// 3. Fallback to local serviceAccount.json file if present
if (!serviceAccount) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const localPath = path.join(__dirname, "../serviceAccount.json");
    if (fs.existsSync(localPath)) {
      const fileData = fs.readFileSync(localPath, "utf8");
      serviceAccount = JSON.parse(fileData);
    }
  } catch (err) {
    console.log("No local serviceAccount.json file found.");
  }
}

if (serviceAccount && serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

export const app = getApps().length > 0
  ? getApps()[0]
  : initializeApp(
      serviceAccount
        ? { credential: cert(serviceAccount) }
        : {}
    );