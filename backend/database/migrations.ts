// Database schema and migrations for Anchor PDS
import { sqlite } from "https://esm.town/v/stevekrouse/sqlite";

const TABLE_NAME = "anchor_checkins_v3"; // v3: Clean structure with locations array + categories, no legacy fields
const SETTINGS_TABLE_NAME = "anchor_user_settings_v1";

// Initialize database schema
export async function initializeDatabase() {
  // Create checkins table (v3 - clean structure: locations array + categories, no legacy fields)
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id TEXT PRIMARY KEY,           -- record key (rkey)
      authorDid TEXT NOT NULL,       -- DID of user who created checkin
      text TEXT NOT NULL,           -- checkin message/venue name
      createdAt TEXT NOT NULL,      -- ISO timestamp
      locations TEXT,               -- JSON array of location objects (community.lexicon.location.*)
      category TEXT,                -- OSM category value (e.g., "restaurant", "climbing")
      categoryGroup TEXT,           -- Human-readable group (e.g., "Food & Drink", "Sports & Fitness")
      categoryIcon TEXT,            -- Unicode emoji icon (e.g., "🍽️", "🧗‍♂️")
      uri TEXT NOT NULL,            -- full AT URI (at://did/collection/rkey)
      cid TEXT                      -- content hash (optional but recommended)
    )
  `);

  // Create indexes for performance
  try {
    await sqlite.execute(
      `CREATE INDEX IF NOT EXISTS idx_checkins_v3_author ON ${TABLE_NAME}(authorDid)`,
    );
    await sqlite.execute(
      `CREATE INDEX IF NOT EXISTS idx_checkins_v3_created ON ${TABLE_NAME}(createdAt)`,
    );
    await sqlite.execute(
      `CREATE INDEX IF NOT EXISTS idx_checkins_v3_category ON ${TABLE_NAME}(category)`,
    );
    await sqlite.execute(
      `CREATE INDEX IF NOT EXISTS idx_checkins_v3_categorygroup ON ${TABLE_NAME}(categoryGroup)`,
    );
    // Note: JSON queries for location will be slower but more flexible
  } catch (error) {
    console.log("Indexes may already exist:", error);
  }

  // Create user settings table
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS ${SETTINGS_TABLE_NAME} (
      did TEXT PRIMARY KEY,
      enableFeedPosts BOOLEAN DEFAULT TRUE
    )
  `);
}

export { SETTINGS_TABLE_NAME, TABLE_NAME };
