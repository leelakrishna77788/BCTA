// Custom independent Admin API handler
import { 
  verifyIdTokenSimple, 
  getGoogleAccessToken, 
  deleteAuthUserREST, 
  deleteFirestoreDocREST, 
  getFirestoreDocREST,
  revokeTokensREST,
  createAuthUserREST,
  setFirestoreDocREST
} from "./adminUtils";

// Define local types if @vercel/node is missing
interface VercelRequest {
  method?: string;
  headers: Record<string, any>;
  body: any;
}
interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: any) => VercelResponse;
  setHeader: (name: string, value: string | string[]) => VercelResponse;
}

type AdminAction = "deleteUser" | "revokeTokens" | "createUser" | "bulkDeleteUsers";

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
    if ((saJson.startsWith("'") && saJson.endsWith("'")) || (saJson.startsWith('"') && saJson.endsWith('"'))) {
      saJson = saJson.slice(1, -1);
    }
    const serviceAccount = JSON.parse(saJson);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    const projectId = serviceAccount.project_id;

    // A. Verify client token
    let decoded;
    try {
      decoded = await verifyIdTokenSimple(idToken, projectId);
      console.log("[api/admin] Token verified for UID:", decoded.user_id);
    } catch (err: any) {
      console.error("[api/admin] Token verification failed:", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // B. Get Google Access Token for REST calls
    console.log("[api/admin] Obtaining Google Access Token...");
    const accessToken = await getGoogleAccessToken(serviceAccount, [
      'https://www.googleapis.com/auth/identitytoolkit',
      'https://www.googleapis.com/auth/datastore'
    ]);

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
        const apiKey = req.body.apiKey;
        if (!apiKey) return res.status(400).json({ error: "Missing apiKey. Send VITE_FIREBASE_API_KEY from the frontend." });

        console.log(`[api/admin] Creating user: ${email}`);
        let newUid;
        try {
          const authUser = await createAuthUserREST(apiKey, email, password);
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

      default:
        return res.status(501).json({ error: `Action '${action}' not implemented in baseline mode.` });
    }
  } catch (err: any) {
    console.error("[api/admin] Internal Error:", err.message);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

