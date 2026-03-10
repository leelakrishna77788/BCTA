const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
// IMPORTANT: You will need to download a serviceAccountKey.json file from 
// Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
// and place it in the server/config/ directory.

try {
    let serviceAccount;
    try {
        serviceAccount = require('./serviceAccountKey.json');
    } catch (err) {
        console.warn("⚠️ Warning: serviceAccountKey.json not found in server/config/");
        console.warn("⚠️ Please download it from Firebase Console -> Project Settings -> Service Accounts");
        console.warn("⚠️ Alternatively, set GOOGLE_APPLICATION_CREDENTIALS environment variable.");
    }

    if (serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
            credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault()
        });
        console.log("Firebase Admin SDK initialized successfully.");
    } else {
        // Fallback for development if no key is provided yet
        admin.initializeApp();
        console.log("Firebase Admin SDK initialized (without explicit credentials - may have limited access).");
    }
} catch (error) {
    console.error("Error initializing Firebase Admin:", error);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
