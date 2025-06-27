// Authentication utilities shared between frontend and backend
export interface AuthContext {
  did: string;
  handle?: string;
}

// Cache for DID/handle mappings (in-memory for now)
const didCache = new Map<string, { did: string; handle?: string; expires: number }>();
const CACHE_TTL = 3600000; // 1 hour

export async function validateToken(token: string): Promise<AuthContext | null> {
  console.log(`🔐 Validating token: ${token.substring(0, 20)}... (length: ${token.length})`);
  
  // Check cache first
  const cached = didCache.get(token);
  if (cached && cached.expires > Date.now()) {
    console.log(`✅ Found cached auth context for token: ${cached.handle} (${cached.did})`);
    return { did: cached.did, handle: cached.handle };
  }

  // Extract potential PDS host from token (simplified approach)
  // In a real implementation, we'd need proper JWT parsing
  // For now, we'll try common PDS endpoints
  const commonPDSHosts = [
    "https://bsky.social",
    "https://staging.bsky.dev",
  ];

  for (const pdsHost of commonPDSHosts) {
    try {
      console.log(`🔍 Trying to validate token with ${pdsHost}`);
      
      const sessionResponse = await fetch(`${pdsHost}/xrpc/com.atproto.server.getSession`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`📡 Response from ${pdsHost}: ${sessionResponse.status} ${sessionResponse.statusText}`);

      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        console.log(`✅ Valid session from ${pdsHost}:`, JSON.stringify(session, null, 2));
        
        const authContext = {
          did: session.did,
          handle: session.handle,
        };

        // Cache the result
        didCache.set(token, {
          ...authContext,
          expires: Date.now() + CACHE_TTL,
        });

        console.log(`💾 Cached auth context: ${authContext.handle} (${authContext.did})`);
        return authContext;
      } else {
        const errorText = await sessionResponse.text();
        console.log(`❌ Auth failed with ${pdsHost} (${sessionResponse.status}): ${errorText}`);
      }
    } catch (error) {
      console.error(`❌ Exception validating token with ${pdsHost}:`, error);
      continue;
    }
  }

  console.log(`❌ Token validation failed with all PDS hosts`);
  return null;
}
