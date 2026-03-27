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
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchDelete`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      localIds: [uid]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`REST deleteAuthUser failed: ${JSON.stringify(data)}`);
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
    const data = await response.json();
    throw new Error(`REST deleteFirestoreDoc failed: ${JSON.stringify(data)}`);
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
