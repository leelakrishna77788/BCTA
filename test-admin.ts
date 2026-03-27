import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!saEnv) {
  console.error("FIREBASE_SERVICE_ACCOUNT missing");
  process.exit(1);
}

try {
  let saJson = saEnv.trim();
  if ((saJson.startsWith("'") && saJson.endsWith("'")) || 
      (saJson.startsWith('"') && saJson.endsWith('"'))) {
    saJson = saJson.slice(1, -1);
  }
  const serviceAccount = JSON.parse(saJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Successfully initialized Firebase Admin!");
  process.exit(0);
} catch (err) {
  console.error("Initialization failed:", err.message);
  process.exit(1);
}
