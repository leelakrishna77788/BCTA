const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

let serviceAccount;
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;

if (serviceAccountPath) {
    try {
        serviceAccount = require(serviceAccountPath);
    } catch (err) {
        console.warn(`⚠️ Warning: Service account not found at ${serviceAccountPath}`);
    }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log("Using Google Application Credentials");
} else {
    try {
        serviceAccount = require('./serviceAccountKey.json');
    } catch (err) {
        console.warn("⚠️ Warning: serviceAccountKey.json not found in server/config/");
        console.warn("⚠️ Please download it from Firebase Console -> Project Settings -> Service Accounts");
        console.warn("⚠️ Or set GOOGLE_APPLICATION_CREDENTIALS environment variable");
    }
}

try {
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized with service account.");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
        console.log("Firebase Admin SDK initialized with application default credentials.");
    } else {
        console.error("❌ Error: No Firebase credentials found. Server may not function correctly.");
    }
} catch (error) {
    console.error("Error initializing Firebase Admin:", error.message);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
