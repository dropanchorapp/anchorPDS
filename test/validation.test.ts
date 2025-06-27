// Validation tests for checkin records
import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createAtUri, generateCid, generateRkey, validateCheckinRecord } from "../shared/types.ts";

Deno.test("Validation - valid lexicon-compliant checkin record should pass", () => {
  const validRecord = {
    $type: "app.dropanchor.checkin",
    text: "Coffee at Central Perk",
    createdAt: "2025-06-15T13:00:00Z",
    locations: [
      {
        $type: "community.lexicon.location.geo",
        latitude: "40.7128",
        longitude: "-74.0060",
      },
      {
        $type: "community.lexicon.location.address",
        street: "123 Bedford St",
        locality: "New York",
        region: "NY",
        name: "Central Perk",
      },
    ],
  };

  const result = validateCheckinRecord(validRecord);
  assertEquals(result.$type, "app.dropanchor.checkin");
  assertEquals(result.text, "Coffee at Central Perk");
  assertEquals(result.locations?.length, 2);
});

Deno.test("Validation - minimal valid record should pass", () => {
  const minimalRecord = {
    text: "Quick checkin",
    createdAt: "2025-06-15T13:00:00Z",
  };

  const result = validateCheckinRecord(minimalRecord);
  assertEquals(result.$type, "app.dropanchor.checkin");
  assertEquals(result.text, "Quick checkin");
  assertEquals(result.locations, undefined);
});

Deno.test("Validation - missing text should throw error", () => {
  const invalidRecord = {
    createdAt: "2025-06-15T13:00:00Z",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "Record must have a text field",
  );
});

Deno.test("Validation - missing createdAt should throw error", () => {
  const invalidRecord = {
    text: "Test checkin",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "Record must have a createdAt field",
  );
});

Deno.test("Validation - invalid createdAt should throw error", () => {
  const invalidRecord = {
    text: "Test checkin",
    createdAt: "not-a-date",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "createdAt must be a valid ISO timestamp",
  );
});

Deno.test("Validation - text over 300 characters should throw error", () => {
  const longText = "x".repeat(301);
  const invalidRecord = {
    text: longText,
    createdAt: "2025-06-15T13:00:00Z",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "text must be 300 characters or less",
  );
});

Deno.test("Validation - invalid geo location should throw error", () => {
  const invalidRecord = {
    text: "Test checkin",
    createdAt: "2025-06-15T13:00:00Z",
    locations: [
      {
        $type: "community.lexicon.location.geo",
        latitude: "91", // Invalid: > 90
        longitude: "0",
      },
    ],
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "latitude must be a valid number between -90 and 90",
  );
});

Deno.test("Validation - geo location with missing longitude should throw error", () => {
  const invalidRecord = {
    text: "Test checkin",
    createdAt: "2025-06-15T13:00:00Z",
    locations: [
      {
        $type: "community.lexicon.location.geo",
        latitude: "40.7128",
        // Missing longitude
      },
    ],
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "geo location must have longitude as string",
  );
});

Deno.test("Validation - unsupported location type should throw error", () => {
  const invalidRecord = {
    text: "Test checkin",
    createdAt: "2025-06-15T13:00:00Z",
    locations: [
      {
        $type: "unknown.location.type",
        someField: "value",
      },
    ],
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "Unsupported location type: unknown.location.type",
  );
});

Deno.test("Validation - locations not array should throw error", () => {
  const invalidRecord = {
    text: "Test checkin",
    createdAt: "2025-06-15T13:00:00Z",
    locations: "not an array",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "locations must be an array",
  );
});

Deno.test("Validation - null record should throw error", () => {
  assertThrows(
    () => validateCheckinRecord(null),
    Error,
    "Record must be an object",
  );
});

Deno.test("Validation - non-object record should throw error", () => {
  assertThrows(
    () => validateCheckinRecord("not an object"),
    Error,
    "Record must be an object",
  );
});

Deno.test("Utils - generateRkey should create valid UUID", () => {
  const rkey = generateRkey();

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assertEquals(uuidRegex.test(rkey), true);
});

Deno.test("Utils - generateRkey should create unique values", () => {
  const rkey1 = generateRkey();
  const rkey2 = generateRkey();

  assertEquals(rkey1 !== rkey2, true);
});

Deno.test("Utils - createAtUri should format correctly", () => {
  const uri = createAtUri(
    "did:plc:example123",
    "app.dropanchor.checkin",
    "test-rkey-123",
  );

  assertEquals(uri, "at://did:plc:example123/app.dropanchor.checkin/test-rkey-123");
});

Deno.test("Utils - generateCid should create non-empty string", () => {
  const cid = generateCid();

  assertEquals(typeof cid, "string");
  assertEquals(cid.length > 0, true);
  assertEquals(cid.startsWith("baf"), true);
});

Deno.test("Utils - generateCid should create unique values", () => {
  const cid1 = generateCid();
  const cid2 = generateCid();

  assertEquals(cid1 !== cid2, true);
});

// Category Field Tests

Deno.test("Category - valid record with all category fields should pass", () => {
  const recordWithCategories = {
    $type: "app.dropanchor.checkin",
    text: "Great coffee break!",
    createdAt: "2025-06-27T10:30:00Z",
    locations: [{
      $type: "community.lexicon.location.address",
      name: "Central Perk",
      locality: "New York",
    }],
    category: "cafe",
    categoryGroup: "Food & Drink",
    categoryIcon: "☕",
  };

  const result = validateCheckinRecord(recordWithCategories);
  assertEquals(result.category, "cafe");
  assertEquals(result.categoryGroup, "Food & Drink");
  assertEquals(result.categoryIcon, "☕");
});

Deno.test("Category - valid record with partial category fields should pass", () => {
  const recordWithPartialCategories = {
    text: "Quick visit",
    createdAt: "2025-06-27T10:30:00Z",
    category: "restaurant",
    categoryIcon: "🍽️",
    // categoryGroup intentionally omitted
  };

  const result = validateCheckinRecord(recordWithPartialCategories);
  assertEquals(result.category, "restaurant");
  assertEquals(result.categoryGroup, undefined);
  assertEquals(result.categoryIcon, "🍽️");
});

Deno.test("Category - record without category fields should pass (backward compatibility)", () => {
  const recordWithoutCategories = {
    text: "No categories here",
    createdAt: "2025-06-27T10:30:00Z",
  };

  const result = validateCheckinRecord(recordWithoutCategories);
  assertEquals(result.category, undefined);
  assertEquals(result.categoryGroup, undefined);
  assertEquals(result.categoryIcon, undefined);
});

Deno.test("Category - empty category string should throw error", () => {
  const invalidRecord = {
    text: "Test",
    createdAt: "2025-06-27T10:30:00Z",
    category: "",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "category must be a non-empty string",
  );
});

Deno.test("Category - non-string category should throw error", () => {
  const invalidRecord = {
    text: "Test",
    createdAt: "2025-06-27T10:30:00Z",
    category: 123,
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "category must be a non-empty string",
  );
});

Deno.test("Category - category longer than 50 characters should throw error", () => {
  const invalidRecord = {
    text: "Test",
    createdAt: "2025-06-27T10:30:00Z",
    category: "this_is_a_very_long_category_name_that_exceeds_the_fifty_character_limit_imposed_by_validation",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "category must be 50 characters or less",
  );
});

Deno.test("Category - empty categoryGroup string should throw error", () => {
  const invalidRecord = {
    text: "Test",
    createdAt: "2025-06-27T10:30:00Z",
    categoryGroup: "",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "categoryGroup must be a non-empty string",
  );
});

Deno.test("Category - categoryGroup longer than 50 characters should throw error", () => {
  const invalidRecord = {
    text: "Test",
    createdAt: "2025-06-27T10:30:00Z",
    categoryGroup: "this_is_a_very_long_category_group_name_that_definitely_exceeds_fifty_characters",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "categoryGroup must be 50 characters or less",
  );
});

Deno.test("Category - empty categoryIcon string should throw error", () => {
  const invalidRecord = {
    text: "Test",
    createdAt: "2025-06-27T10:30:00Z",
    categoryIcon: "",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "categoryIcon must be a non-empty string",
  );
});

Deno.test("Category - categoryIcon longer than 10 characters should throw error", () => {
  const invalidRecord = {
    text: "Test", 
    createdAt: "2025-06-27T10:30:00Z",
    categoryIcon: "🍽️🍺🧗‍♂️🏨🌳🛒📚💊🏛️",
  };

  assertThrows(
    () => validateCheckinRecord(invalidRecord),
    Error,
    "categoryIcon must be 10 characters or less",
  );
});

Deno.test("Category - categoryIcon with valid length should pass", () => {
  const validRecord = {
    text: "Test",
    createdAt: "2025-06-27T10:30:00Z",
    categoryIcon: "🍽️",  // Single emoji should be under 10 chars
  };

  const result = validateCheckinRecord(validRecord);
  assertEquals(result.categoryIcon, "🍽️");
});

Deno.test("Category - real-world category combinations should pass", () => {
  const testCases = [
    {
      category: "restaurant",
      categoryGroup: "Food & Drink", 
      categoryIcon: "🍽️",
    },
    {
      category: "climbing",
      categoryGroup: "Sports & Fitness",
      categoryIcon: "🧗‍♂️",
    },
    {
      category: "museum",
      categoryGroup: "Culture",
      categoryIcon: "🏛️",
    },
    {
      category: "hotel",
      categoryGroup: "Accommodation",
      categoryIcon: "🏨",
    },
  ];

  testCases.forEach((testCase, index) => {
    const record = {
      text: `Test case ${index + 1}`,
      createdAt: "2025-06-27T10:30:00Z",
      ...testCase,
    };

    const result = validateCheckinRecord(record);
    assertEquals(result.category, testCase.category);
    assertEquals(result.categoryGroup, testCase.categoryGroup);
    assertEquals(result.categoryIcon, testCase.categoryIcon);
  });
});
