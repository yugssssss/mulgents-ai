import { initializeApp, cert } from "firebase-admin/app";

import serviceAccount from "../serviceAccount.json" with { type: "json" };

const formattedServiceAccount = {
  ...serviceAccount,
  private_key: serviceAccount.private_key
    ? serviceAccount.private_key.replace(/\\n/g, "\n")
    : undefined,
};

export const app = initializeApp({
  credential: cert(formattedServiceAccount),
});