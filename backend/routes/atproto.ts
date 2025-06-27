// ATProto endpoint handlers
import { Hono } from "https://esm.sh/hono@3.11.7";
import { validateToken } from "../../shared/auth.ts";
import {
  createAtUri,
  type CreateRecordRequest,
  generateCid,
  generateRkey,
  validateCheckinRecord,
} from "../../shared/types.ts";
import { createCheckinRecord, getCheckinByUri } from "../database/queries.ts";

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

// com.atproto.repo.createRecord
app.post("/com.atproto.repo.createRecord", async (c) => {
  // Authenticate request
  const authContext = await authenticateRequest(c);
  if (!authContext) {
    return c.json(
      { error: "AuthenticationRequired", message: "Authentication required to create records" },
      401,
    );
  }

  try {
    const body: CreateRecordRequest = await c.req.json();

    // Validate collection - only allow check-ins
    if (body.collection !== "app.dropanchor.checkin") {
      return c.json(
        {
          error: "InvalidRequest",
          message: "Only app.dropanchor.checkin records are supported",
        },
        400,
      );
    }

    // Validate record format
    const validatedRecord = validateCheckinRecord(body.record);

    // Generate rkey and create record
    const rkey = body.rkey || generateRkey();
    const uri = createAtUri(authContext.did, "app.dropanchor.checkin", rkey);
    const cid = generateCid();

    await createCheckinRecord(rkey, authContext.did, validatedRecord, uri, cid);

    return c.json({
      uri,
      cid,
    });
  } catch (error: any) {
    return c.json(
      {
        error: "InvalidRequest",
        message: error.message || "Invalid request",
      },
      400,
    );
  }
});

// com.atproto.sync.getRecord
app.get("/com.atproto.sync.getRecord", async (c) => {
  const uri = c.req.query("uri");

  if (!uri) {
    return c.json(
      { error: "InvalidRequest", message: "uri parameter required" },
      400,
    );
  }

  const record = await getCheckinByUri(uri);
  if (!record) {
    return c.json(
      { error: "RecordNotFound", message: "Record not found" },
      404,
    );
  }

  return c.json({
    uri: record.uri,
    cid: record.cid,
    value: {
      text: record.text,
      createdAt: record.createdAt,
      locations: record.locations,
      category: record.category,
      categoryGroup: record.categoryGroup,
      categoryIcon: record.categoryIcon,
    },
  });
});

export default app;
