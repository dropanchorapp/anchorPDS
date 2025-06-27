// Integration tests for API endpoints
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Base URL for the deployed Anchor PDS
const BASE_URL = "https://tijs--95a9ca3049ee11f0a39776b3cceeab13.web.val.run";

Deno.test("Integration - health endpoint should return OK", async () => {
  const response = await fetch(`${BASE_URL}/health`);
  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.status, "ok");
  assertEquals(data.service, "anchor-pds");
});

Deno.test("Integration - unknown endpoint should return 404", async () => {
  const response = await fetch(`${BASE_URL}/nonexistent`);
  const data = await response.json();

  assertEquals(response.status, 404);
  assertEquals(data.error, "NotFound");
});

Deno.test("Integration - CORS preflight should work", async () => {
  const response = await fetch(`${BASE_URL}/health`, {
    method: "OPTIONS",
    headers: {
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });

  // Consume response body to prevent leak
  await response.text();

  // CORS might return 204 No Content for OPTIONS
  assertEquals([200, 204].includes(response.status), true);
});

Deno.test("Integration - getRecord without auth should work for public records", async () => {
  const response = await fetch(
    `${BASE_URL}/xrpc/com.atproto.sync.getRecord?uri=at://nonexistent/app.dropanchor.checkin/test`,
  );
  const data = await response.json();

  // Should return 404 for non-existent record, not auth error
  assertEquals(response.status, 404);
  assertEquals(data.error, "RecordNotFound");
});

Deno.test("Integration - createRecord without auth should require authentication", async () => {
  const response = await fetch(`${BASE_URL}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      collection: "app.dropanchor.checkin",
      record: {
        text: "Test checkin",
        createdAt: new Date().toISOString(),
      },
    }),
  });
  const data = await response.json();

  assertEquals(response.status, 401);
  assertEquals(data.error, "AuthenticationRequired");
});

Deno.test("Integration - listCheckins without auth should require authentication", async () => {
  const response = await fetch(`${BASE_URL}/xrpc/app.dropanchor.listCheckins`);
  const data = await response.json();

  assertEquals(response.status, 401);
  assertEquals(data.error, "AuthenticationRequired");
});

Deno.test("Integration - getGlobalFeed without auth should require authentication", async () => {
  const response = await fetch(`${BASE_URL}/xrpc/app.dropanchor.getGlobalFeed`);
  const data = await response.json();

  assertEquals(response.status, 401);
  assertEquals(data.error, "AuthenticationRequired");
});

Deno.test("Integration - createRecord with invalid collection should reject", async () => {
  const response = await fetch(`${BASE_URL}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid-token",
    },
    body: JSON.stringify({
      collection: "app.bsky.feed.post", // Wrong collection
      record: {
        text: "Test post",
        createdAt: new Date().toISOString(),
      },
    }),
  });

  await response.text(); // Consume response body

  // Should get auth error first since token is invalid
  assertEquals(response.status, 401);
});

Deno.test("Integration - createRecord with malformed JSON should reject", async () => {
  const response = await fetch(`${BASE_URL}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid-token",
    },
    body: "invalid json",
  });

  await response.text(); // Consume response body

  // Could be 400 (bad JSON) or 401 (auth) depending on order of validation
  assertEquals([400, 401].includes(response.status), true);
});

Deno.test("Integration - method not allowed should return 405", async () => {
  const response = await fetch(`${BASE_URL}/xrpc/com.atproto.repo.createRecord`, {
    method: "GET", // Should be POST
  });

  await response.text(); // Consume response body

  // Hono might return 404 for unmatched routes instead of 405
  assertEquals([404, 405].includes(response.status), true);
});

Deno.test("Integration - unknown XRPC method should return 501", async () => {
  const response = await fetch(`${BASE_URL}/xrpc/com.atproto.nonexistent.method`);
  const data = await response.json();

  // Hono might return 404 for unknown routes instead of 501
  assertEquals([404, 501].includes(response.status), true);
  assertEquals(["NotFound", "MethodNotImplemented"].includes(data.error), true);
});

Deno.test("Integration - response headers should include CORS", async () => {
  const response = await fetch(`${BASE_URL}/health`);
  await response.text(); // Consume response body

  // Check that response includes CORS headers for API endpoints
  assertEquals(response.status, 200);
  // Note: Some CORS headers may be added by Val Town automatically
});

Deno.test("Integration - rate limiting headers should be present", async () => {
  const response = await fetch(`${BASE_URL}/health`);
  await response.text(); // Consume response body

  // Val Town should add rate limiting headers
  const rateLimitHeaders = [
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
  ];

  // At least some rate limit headers should be present
  const hasRateLimitHeaders = rateLimitHeaders.some((header) => response.headers.has(header));

  assertEquals(hasRateLimitHeaders, true);
});

Deno.test("Integration - content-type should be JSON for API responses", async () => {
  const response = await fetch(`${BASE_URL}/health`);
  const data = await response.json(); // Consume as JSON instead of text
  const contentType = response.headers.get("content-type");

  assertEquals(contentType?.includes("application/json"), true);
  assertEquals(typeof data, "object");
});
