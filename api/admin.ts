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
  sendFCMNotification,
  deleteFilteredDocumentsREST
} from "./adminUtils.js"; // ✅ FIXED (.js required)

import type { VercelRequest, VercelResponse } from "@vercel/node";

// Token cache
let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

async function getCachedAccessToken(serviceAccount: any, scopes: string[]) {
  const now = Date.now();
  if (cachedAccessToken && cachedTokenExpiry > now + 60_000) {
    return cachedAccessToken;
  }
  cachedAccessToken = await getGoogleAccessToken(serviceAccount, scopes);
  cachedTokenExpiry = now + 3500_000;
  return cachedAccessToken;
}

type AdminAction =
  | "deleteUser"
  | "revokeTokens"
  | "createUser"
  | "bulkDeleteUsers"
  | "broadcastNotification";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "alive" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idToken = authHeader.replace("Bearer ", "");

  try {
    let saRaw = process.env.FIREBASE_SERVICE_ACCOUNT || "{}";

    if (saRaw.startsWith("'") && saRaw.endsWith("'")) {
      saRaw = saRaw.slice(1, -1);
    }

    // Attempt to parse service account JSON. If parsing fails due to unescaped
    // newlines or other escape issues, try a safe fallback by normalizing
    // literal newline characters to escaped "\\n" sequences and parse again.
    let serviceAccount: any = null;
    try {
      serviceAccount = JSON.parse(saRaw);
    } catch (parseErr) {
      console.warn("[admin] FIREBASE_SERVICE_ACCOUNT JSON.parse failed, attempting fallback fix", parseErr?.message);
      try {
        const repaired = saRaw.replace(/\r?\n/g, "\\n");
        serviceAccount = JSON.parse(repaired);
        console.info("[admin] Repaired FIREBASE_SERVICE_ACCOUNT by escaping newlines.");
      } catch (secondErr) {
        console.error("[admin] Failed to parse FIREBASE_SERVICE_ACCOUNT after repair. Raw value (truncated):", saRaw.slice(0, 200));
        throw secondErr;
      }
    }

    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    const projectId = serviceAccount.project_id;

    const scopes = [
      "https://www.googleapis.com/auth/identitytoolkit",
      "https://www.googleapis.com/auth/datastore"
    ];

    const [decoded, accessToken] = await Promise.all([
      verifyIdTokenSimple(idToken, projectId),
      getCachedAccessToken(serviceAccount, scopes)
    ]);

    const caller = await getFirestoreDocREST(
      projectId,
      accessToken,
      "users",
      decoded.user_id
    );

    if (!caller || !["admin", "superadmin"].includes(caller.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    console.log("[admin] API BODY:", req.body);
    const { action, uid } = req.body as {
      action: AdminAction;
      uid?: string;
    };

    switch (action) {
      case "deleteUser":
        if (!uid) return res.status(400).json({ error: "Missing uid" });

        await deleteAuthUserREST(projectId, accessToken, uid);
        await deleteFirestoreDocREST(projectId, accessToken, "users", uid);

        return res.status(200).json({ message: "Deleted" });

      case "revokeTokens":
        if (!uid) return res.status(400).json({ error: "Missing uid" });

        await revokeTokensREST(projectId, accessToken, uid);
        return res.status(200).json({ message: "Revoked" });

      case "createUser": {
        const { email, password, profile } = req.body as any;

        const authUser = await createAuthUserREST(
          projectId,
          accessToken,
          email,
          password
        );

        await setFirestoreDocREST(
          projectId,
          accessToken,
          "users",
          authUser.localId,
          { ...profile, uid: authUser.localId }
        );

        return res.status(200).json({ uid: authUser.localId });
      }

      case "bulkDeleteUsers": {
        const { uids } = req.body as { uids: string[] };

        for (const id of uids) {
          await deleteAuthUserREST(projectId, accessToken, id);
          await deleteFirestoreDocREST(projectId, accessToken, "users", id);
        }

        return res.status(200).json({ message: "Bulk delete done" });
      }

      case "broadcastNotification": {
        const { title, body, data } = req.body;

        const tokens = await getAllFcmTokens(projectId, accessToken);

        const results = await sendFCMNotification(
          projectId,
          accessToken,
          tokens,
          title,
          body,
          data
        );

        return res.status(200).json({ results });
      }

      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}