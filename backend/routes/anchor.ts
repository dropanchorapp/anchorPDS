// Anchor-specific endpoint handlers
import { Hono } from "https://esm.sh/hono@3.11.7";
import { validateToken } from "../../shared/auth.ts";
import { type FeedResponse } from "../../shared/types.ts";
import { getCheckinsByAuthor, getGlobalFeed } from "../database/queries.ts";

const app = new Hono();

// Middleware for authentication
async function authenticateRequest(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  return await validateToken(token);
}

// Debug endpoint for testing authentication
app.get("/debug/auth", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({
      error: "No auth header",
      authHeader: authHeader || "missing",
    });
  }

  const token = authHeader.substring(7);
  console.log(`🔍 Debug auth endpoint called with token: ${token.substring(0, 20)}...`);

  try {
    const authContext = await validateToken(token);
    if (authContext) {
      return c.json({
        success: true,
        did: authContext.did,
        handle: authContext.handle,
      });
    } else {
      return c.json({
        error: "Token validation failed",
        tokenPrefix: token.substring(0, 20),
      });
    }
  } catch (error) {
    return c.json({
      error: "Exception during validation",
      message: error.message,
      tokenPrefix: token.substring(0, 20),
    });
  }
});

// app.dropanchor.listCheckins
app.get("/app.dropanchor.listCheckins", async (c) => {
  // Authenticate request
  const authContext = await authenticateRequest(c);
  if (!authContext) {
    return c.json(
      { error: "AuthenticationRequired", message: "Authentication required to list check-ins" },
      401,
    );
  }

  const userDid = c.req.query("user") || authContext.did;
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const cursor = c.req.query("cursor");

  // Only allow users to view their own check-ins
  if (userDid !== authContext.did) {
    return c.json(
      {
        error: "Forbidden",
        message: "Can only access your own check-ins",
      },
      403,
    );
  }

  const checkins = await getCheckinsByAuthor(userDid, limit, cursor);

  const response: FeedResponse = {
    checkins: checkins.map((checkin) => ({
      uri: checkin.uri,
      cid: checkin.cid,
      value: {
        text: checkin.text,
        createdAt: checkin.createdAt,
        locations: checkin.locations,
        category: checkin.category,
        categoryGroup: checkin.categoryGroup,
        categoryIcon: checkin.categoryIcon,
      },
      author: {
        did: checkin.authorDid,
      },
    })),
    cursor: checkins.length > 0 ? checkins[checkins.length - 1].createdAt : undefined,
  };

  return c.json(response);
});

// app.dropanchor.getGlobalFeed
app.get("/app.dropanchor.getGlobalFeed", async (c) => {
  // Authenticate request to prevent scraping
  const authContext = await authenticateRequest(c);
  if (!authContext) {
    return c.json(
      { error: "AuthenticationRequired", message: "Authentication required to access global feed" },
      401,
    );
  }

  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const cursor = c.req.query("cursor");

  const checkins = await getGlobalFeed(limit, cursor);

  const response: FeedResponse = {
    checkins: checkins.map((checkin) => ({
      uri: checkin.uri,
      cid: checkin.cid,
      value: {
        text: checkin.text,
        createdAt: checkin.createdAt,
        locations: checkin.locations,
        category: checkin.category,
        categoryGroup: checkin.categoryGroup,
        categoryIcon: checkin.categoryIcon,
      },
      author: {
        did: checkin.authorDid,
      },
    })),
    cursor: checkins.length > 0 ? checkins[checkins.length - 1].createdAt : undefined,
  };

  return c.json(response);
});

export default app;
