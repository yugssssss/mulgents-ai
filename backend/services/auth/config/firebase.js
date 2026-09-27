import { initializeApp, cert, getApps } from "firebase-admin/app";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let serviceAccount = null;

// Strategy 1: Read from FIREBASE_SERVICE_ACCOUNT env var (full JSON as a string)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
      raw = raw.substring(1, raw.length - 1);
    }
    serviceAccount = JSON.parse(raw);
    console.log("✅ Firebase: Loaded credentials from FIREBASE_SERVICE_ACCOUNT env var");
  } catch (err) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err.message);
  }
}

// Strategy 2: Read from individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) {
  serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID.trim(),
    client_email: process.env.FIREBASE_CLIENT_EMAIL.trim(),
    private_key: process.env.FIREBASE_PRIVATE_KEY,
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

// Normalize & clean private_key (strip outer quotes & replace escaped \n)
if (serviceAccount?.private_key) {
  let pk = serviceAccount.private_key.trim();
  if ((pk.startsWith('"') && pk.endsWith('"')) || (pk.startsWith("'") && pk.endsWith("'"))) {
    pk = pk.substring(1, pk.length - 1);
  }
  pk = pk.replace(/\\n/g, "\n");
  serviceAccount.private_key = pk;
}

if (!serviceAccount) {
  console.error("❌ Firebase: No credentials found! Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL + FIREBASE_PROJECT_ID env vars.");
}

let appInstance = null;

if (getApps().length > 0) {
  appInstance = getApps()[0];
} else {
  try {
    if (serviceAccount && serviceAccount.private_key && serviceAccount.client_email) {
      appInstance = initializeApp({ credential: cert(serviceAccount) });
      console.log("✅ Firebase Admin SDK initialized successfully");
    } else {
      console.warn("⚠️ Firebase: Service account missing or incomplete. Initializing default app.");
      appInstance = initializeApp();
    }
  } catch (err) {
    console.error("❌ Firebase initializeApp Error:", err.message);
    try {
      appInstance = initializeApp();
    } catch (e) {
      console.error("❌ Failed fallback initializeApp:", e.message);
    }
  }
}

export const app = appInstance;