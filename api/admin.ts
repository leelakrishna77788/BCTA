// Custom independent Admin API handler
import { 
  verifyIdTokenSimple, 
  getGoogleAccessToken, 
  deleteAuthUserREST, 
  deleteFirestoreDocREST, 
  getFirestoreDocREST,
  revokeTokensREST,
  createAuthUserREST,
  setFirestoreDocREST,
  getAllFcmTokens,
  sendFCMNotification
} from "./adminUtils";

// ── In-memory access token cache (survives across warm requests on Vercel) ──
let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

async function getCachedAccessToken(serviceAccount: any, scopes: string[]): Promise<string> {
  const now = Date.now();
  // Reuse token if it has >60s left before expiry
  if (cachedAccessToken && cachedTokenExpiry > now + 60_000) {
    return cachedAccessToken;
  }
  cachedAccessToken = await getGoogleAccessToken(serviceAccount, scopes);
  cachedTokenExpiry = now + 3500_000; // ~58 min (tokens last 1hr)
  return cachedAccessToken;
}

import { VercelRequest, VercelResponse } from '@vercel/node';

type AdminAction = "deleteUser" | "revokeTokens" | "createUser" | "bulkDeleteUsers" | "broadcastNotification";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Health check for GET
  if (req.method === "GET") {
    console.log("[api/admin] GET health check (Independent Mode)");
    return res.status(200).json({ status: "alive", message: "BCTA Admin API (Independent) is ready" });
  }

  console.log(`[api/admin] Method: ${req.method}, Action: ${req.body?.action}`);

  // Only POST allowed for actions
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed. Use POST.` });
  }

  // 1. Verify caller identity
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: missing or malformed token" });
  }
  const idToken = authHeader.replace("Bearer ", "");

  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saEnv) {
    return res.status(500).json({ error: "FIREBASE_SERVICE_ACCOUNT environment variable is missing." });
  }

  try {
    let saJson = saEnv.trim();
    // Recursively strip any surrounding quotes (single or double)
    while ((saJson.startsWith("'") && saJson.endsWith("'")) || (saJson.startsWith('"') && saJson.endsWith('"'))) {
      saJson = saJson.slice(1, -1).trim();
    }
    
    console.log("[api/admin] Parsing service account JSON...");
    const serviceAccount = JSON.parse(saJson);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    const projectId = serviceAccount.project_id;

    // A+B. Verify client token AND get Google Access Token in PARALLEL
    const scopes = [
      'https://www.googleapis.com/auth/identitytoolkit',
      'https://www.googleapis.com/auth/datastore'
    ];
    let decoded: any;
    let accessToken: string;
    try {
      const [decodedResult, tokenResult] = await Promise.all([
        verifyIdTokenSimple(idToken, projectId),
        getCachedAccessToken(serviceAccount, scopes)
      ]);
      decoded = decodedResult;
      accessToken = tokenResult;
      console.log("[api/admin] Token verified for UID:", decoded.user_id);
    } catch (err: any) {
      console.error("[api/admin] Auth/token error:", err.message);
      return res.status(401).json({ error: err.message || "Invalid or expired token" });
    }

    // C. Verify caller has admin/superadmin role in Firestore via REST
    console.log("[api/admin] Verifying caller role via REST...");
    const callerData = await getFirestoreDocREST(projectId, accessToken, "users", decoded.user_id);
    if (!callerData) {
      return res.status(403).json({ error: "Caller profile not found in database" });
    }

    const callerRole = callerData?.role as string;
    if (!["admin", "superadmin"].includes(callerRole)) {
      return res.status(403).json({ error: "Insufficient permissions: Admin role required" });
    }

    const { action, uid } = req.body as {
      action: AdminAction;
      uid?: string;
    };

    if (!action) {
      return res.status(400).json({ error: "Missing action in request body" });
    }

    // D. Route the action
    switch (action) {
      case "deleteUser": {
        if (!uid) return res.status(400).json({ error: "Missing uid for deleteUser action" });
        console.log(`[api/admin] Deleting user: ${uid}`);
        
        // 1. Delete from Auth via REST
        await deleteAuthUserREST(projectId, accessToken, uid);
        
        // 2. Delete from Firestore via REST
        await deleteFirestoreDocREST(projectId, accessToken, "users", uid);
        
        return res.status(200).json({ message: `User ${uid} deleted successfully` });
      }

      case "revokeTokens": {
        if (!uid) return res.status(400).json({ error: "Missing uid for revokeTokens action" });
        console.log(`[api/admin] Revoking tokens for user: ${uid}`);
        await revokeTokensREST(projectId, accessToken, uid);
        return res.status(200).json({ message: `Tokens revoked successfully for user ${uid}` });
      }

      case "createUser": {
        const { email, password, profile } = req.body as any;
        if (!email) return res.status(400).json({ error: "Missing email for createUser" });
        if (!password) return res.status(400).json({ error: "Missing password for createUser" });

        console.log(`[api/admin] Creating user: ${email}`);
        let newUid;
        try {
          // Uses Admin Identity Toolkit (service account) — no client tokens generated
          const authUser = await createAuthUserREST(projectId, accessToken, email, password);
          newUid = authUser.localId;
        } catch (authErr: any) {
          console.error(`[api/admin] createAuthUserREST failed:`, authErr.message);
          return res.status(400).json({ error: `Auth creation failed: ${authErr.message}` });
        }

        console.log(`[api/admin] Created Auth user ${newUid}. Saving Firestore profile...`);
        try {
          const profileWithUid = {
            ...profile,
            uid: newUid
          };
          await setFirestoreDocREST(projectId, accessToken, "users", newUid, profileWithUid);
        } catch (dbErr: any) {
          console.error(`[api/admin] setFirestoreDocREST failed:`, dbErr.message);
          // Rollback: Delete the Auth user since profile creation failed
          console.log(`[api/admin] Rolling back Auth user ${newUid}...`);
          try {
            await deleteAuthUserREST(projectId, accessToken, newUid);
          } catch (rollbackErr: any) {
            console.error(`[api/admin] CRITICAL: Rollback failed for ${newUid}:`, rollbackErr.message);
          }
          return res.status(500).json({ 
            error: `Profile creation failed: ${dbErr.message}. The account has been rolled back, you can try again immediately.`,
            uid: newUid 
          });
        }

        return res.status(200).json({ message: `User ${newUid} created successfully`, uid: newUid });
      }

      case "bulkDeleteUsers": {
        const { uids } = req.body as { uids?: string[] };
        if (!uids || !Array.isArray(uids)) return res.status(400).json({ error: "Missing or invalid uids for bulkDeleteUsers" });
        console.log(`[api/admin] Bulk deleting users: ${uids.length}`);
        
        for (const userId of uids) {
          try {
            await deleteAuthUserREST(projectId, accessToken, userId);
            await deleteFirestoreDocREST(projectId, accessToken, "users", userId);
          } catch (e: any) {
            console.error(`[api/admin] Failed to delete user ${userId}:`, e.message);
            // continue with others
          }
        }
        return res.status(200).json({ message: `${uids.length} users processed for deletion` });
      }

      case "broadcastNotification": {
        const { title, body, data } = req.body as { title: string; body: string; data?: any };
        if (!title || !body) return res.status(400).json({ error: "Missing title or body for broadcastNotification" });

        console.log(`[api/admin] Broadcasting notification: ${title}`);
        
        // 1. Get all tokens
        const tokens = await getAllFcmTokens(projectId, accessToken);
        if (tokens.length === 0) {
          return res.status(200).json({ message: "No devices registered for notifications.", tokenCount: 0 });
        }

        // 2. Send via FCM
        const results = await sendFCMNotification(projectId, accessToken, tokens, title, body, data);
        const successCount = results.filter(r => r.success).length;

        return res.status(200).json({ 
          message: `Broadcast complete. Sent to ${successCount}/${tokens.length} devices.`,
          successCount,
          totalCount: tokens.length
        });
      }

      default:
        return res.status(501).json({ error: `Action '${action}' not implemented in baseline mode.` });
    }
  } catch (err: any) {
    console.error("[api/admin] Internal Error:", err.message);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

