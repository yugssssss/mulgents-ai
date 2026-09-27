import { initializeApp, cert, getApps } from "firebase-admin/app";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let serviceAccount = null;

// Strategy 1: Read from FIREBASE_SERVICE_ACCOUNT env var (full JSON as a string)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("✅ Firebase: Loaded credentials from FIREBASE_SERVICE_ACCOUNT env var");
  } catch (err) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err.message);
  }
}

// Strategy 2: Read from individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) {
  serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
  console.log("✅ Firebase: Loaded credentials from individual env vars");
}

// Strategy 3: Read from local serviceAccount.json (dev only)
if (!serviceAccount) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const localPath = path.join(__dirname, "../serviceAccount.json");
    if (fs.existsSync(localPath)) {
      const fileData = fs.readFileSync(localPath, "utf8");
      serviceAccount = JSON.parse(fileData);
      console.log("✅ Firebase: Loaded credentials from local serviceAccount.json");
    }
  } catch (err) {
    console.log("No local serviceAccount.json found.");
  }
}

// Normalize private_key newlines
if (serviceAccount?.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

if (!serviceAccount) {
  console.error("❌ Firebase: No credentials found! Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL + FIREBASE_PROJECT_ID env vars.");
}

export const app = getApps().length > 0
  ? getApps()[0]
  : initializeApp(
      serviceAccount
        ? { credential: cert(serviceAccount) }
        : {}
    );