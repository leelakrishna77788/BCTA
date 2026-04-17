import crypto from 'crypto';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  private_key_id: string;
}

/**
 * Signs a JWT for Google OAuth 2.0 using the service account private key.
 */
function signJwt(payload: any, serviceAccount: ServiceAccount): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id
  };

  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  
  const signature = crypto.sign(
    'sha256',
    Buffer.from(unsignedToken),
    serviceAccount.private_key
  );
  
  return `${unsignedToken}.${signature.toString('base64url')}`;
}

/**
 * Obtains a Google Access Token using the service account.
 */
export async function getGoogleAccessToken(serviceAccount: ServiceAccount, scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: scopes.join(' ')
  };

  const jwt = signJwt(payload, serviceAccount);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * Very basic Firebase ID Token verification (checks audience and issuer).
 * Note: For production, you should also verify the signature using public keys.
 */
export async function verifyIdTokenSimple(idToken: string, projectId: string) {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error("Invalid token format");
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Token expired");
    }
    
    // Check issuer
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
       throw new Error("Invalid issuer");
    }
    
    // Check audience
    if (payload.aud !== projectId) {
      throw new Error("Invalid audience");
    }

    return payload;
  } catch (err: any) {
    throw new Error(`Token verification failed: ${err.message}`);
  }
}

/**
 * Deletes a user from Firebase Auth via REST API.
 */
export async function deleteAuthUserREST(projectId: string, accessToken: string, uid: string) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      localId: uid
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data.error && data.error.message === 'USER_NOT_FOUND') {
      console.warn(`Auth user ${uid} not found, skipping auth deletion.`);
      return { skipped: true };
    }
    throw new Error(`REST deleteAuthUser failed: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Revokes tokens for a user via REST API.
 */
export async function revokeTokensREST(projectId: string, accessToken: string, uid: string) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      localId: uid,
      validSince: String(Math.floor(Date.now() / 1000))
    })
  });

  const data = await response.json();
  if (!response.ok) {
    if (data.error && data.error.message === 'USER_NOT_FOUND') {
      console.warn(`Auth user ${uid} not found, skipping token revocation.`);
      return { skipped: true };
    }
    throw new Error(`REST revokeTokens failed: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Deletes a document from Firestore via REST API.
 */
export async function deleteFirestoreDocREST(projectId: string, accessToken: string, collection: string, docId: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok && response.status !== 404) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`REST deleteFirestoreDoc failed: ${JSON.stringify(data) || response.statusText}`);
  }
  return true;
}

/**
 * Fetches a document from Firestore via REST API.
 */
export async function getFirestoreDocREST(projectId: string, accessToken: string, collection: string, docId: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    const data = await response.json();
    throw new Error(`REST getFirestoreDoc failed: ${JSON.stringify(data)}`);
  }

  const data = await response.json();
  // Map Firestore REST format to simple object
  const fields = data.fields || {};
  const result: any = { uid: docId };
  for (const [key, value] of Object.entries(fields)) {
    const val = value as any;
    result[key] = val.stringValue || val.integerValue || val.booleanValue || val.doubleValue || val.timestampValue || val;
  }
  return result;
}

/**
 * Creates a user via Firebase Admin Identity Toolkit REST API.
 * Uses the service account access token (NOT the public signUp endpoint)
 * to avoid generating client-side auth tokens that could displace the
 * current admin's session.
 */
export async function createAuthUserREST(projectId: string, accessToken: string, email: string, password?: string) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      emailVerified: false,
      disabled: false
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `REST createAuthUser failed: ${JSON.stringify(data)}`);
  }
  // Admin endpoint returns { localId } directly
  return { localId: data.localId || data.uid || data.users?.[0]?.localId };
}

/**
 * Creates or overwrites a document in Firestore via REST API
 */
export async function setFirestoreDocREST(projectId: string, accessToken: string, collection: string, docId: string, fieldsObj: any) {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(fieldsObj)) {
    if (v === undefined) continue;
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'number') {
      if (Number.isInteger(v)) fields[k] = { integerValue: v.toString() };
      else fields[k] = { doubleValue: v };
    }
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (v === null) fields[k] = { nullValue: null };
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`REST setFirestoreDoc failed: ${JSON.stringify(data)}`);
  }
  return data;
}

