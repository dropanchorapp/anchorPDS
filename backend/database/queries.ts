// Database query functions for Anchor PDS
import { sqlite } from "https://esm.town/v/stevekrouse/sqlite";
import { SETTINGS_TABLE_NAME, TABLE_NAME } from "./migrations.ts";
import type { CheckinRecord, LocationItem } from "../../shared/types.ts";

export interface StoredCheckin extends CheckinRecord {
  id: string;
  authorDid: string;
  uri: string;
  cid?: string;
}

// Create a check-in record
export async function createCheckinRecord(
  rkey: string,
  authorDid: string,
  record: CheckinRecord,
  uri: string,
  cid: string,
): Promise<void> {
  const locationsJson = record.locations ? JSON.stringify(record.locations) : null;

  await sqlite.execute(
    `
    INSERT INTO ${TABLE_NAME} (
      id, authorDid, text, createdAt, locations, category, categoryGroup, categoryIcon, uri, cid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      rkey,
      authorDid,
      record.text,
      record.createdAt,
      locationsJson,
      record.category || null,
      record.categoryGroup || null,
      record.categoryIcon || null,
      uri,
      cid,
    ],
  );
}

// Get check-in record by URI
export async function getCheckinByUri(uri: string): Promise<StoredCheckin | null> {
  const result = await sqlite.execute(
    `
    SELECT * FROM ${TABLE_NAME} WHERE uri = ?
  `,
    [uri],
  );

  if (!result || !result.rows || result.rows.length === 0) return null;

  const row = result.rows[0];
  const locationsJson = row[4] ? String(row[4]) : null;
  let locations: LocationItem[] | undefined;

  if (locationsJson) {
    try {
      locations = JSON.parse(locationsJson);
    } catch (error) {
      console.error("Failed to parse locations JSON:", error);
    }
  }

  return {
    $type: "app.dropanchor.checkin",
    id: String(row[0]),
    authorDid: String(row[1]),
    text: String(row[2]),
    createdAt: String(row[3]),
    locations,
    category: row[5] ? String(row[5]) : undefined,
    categoryGroup: row[6] ? String(row[6]) : undefined,
    categoryIcon: row[7] ? String(row[7]) : undefined,
    uri: String(row[8]),
    cid: row[9] ? String(row[9]) : undefined,
  };
}

// Get check-ins by author DID
export async function getCheckinsByAuthor(
  authorDid: string,
  limit = 50,
  cursor?: string,
): Promise<StoredCheckin[]> {
  let sql = `
    SELECT * FROM ${TABLE_NAME} 
    WHERE authorDid = ?
  `;
  const params: any[] = [authorDid];

  if (cursor) {
    sql += ` AND createdAt < ?`;
    params.push(cursor);
  }

  sql += ` ORDER BY createdAt DESC LIMIT ?`;
  params.push(limit);

  const result = await sqlite.execute(sql, params);
  if (!result || !result.rows) return [];

  return result.rows.map((row: any) => {
    const locationsJson = row[4] ? String(row[4]) : null;
    let locations: LocationItem[] | undefined;

    if (locationsJson) {
      try {
        locations = JSON.parse(locationsJson);
      } catch (error) {
        console.error("Failed to parse locations JSON:", error);
      }
    }

    return {
      $type: "app.dropanchor.checkin" as const,
      id: String(row[0]),
      authorDid: String(row[1]),
      text: String(row[2]),
      createdAt: String(row[3]),
      locations,
      category: row[5] ? String(row[5]) : undefined,
      categoryGroup: row[6] ? String(row[6]) : undefined,
      categoryIcon: row[7] ? String(row[7]) : undefined,
      uri: String(row[8]),
      cid: row[9] ? String(row[9]) : undefined,
    };
  });
}

// Get global feed (max 100 records as per plan)
export async function getGlobalFeed(
  limit = 50,
  cursor?: string,
): Promise<StoredCheckin[]> {
  const maxLimit = Math.min(limit, 100); // Hard limit as per implementation plan

  let sql = `
    SELECT * FROM ${TABLE_NAME}
  `;
  const params: any[] = [];

  if (cursor) {
    sql += ` WHERE createdAt < ?`;
    params.push(cursor);
  }

  sql += ` ORDER BY createdAt DESC LIMIT ?`;
  params.push(maxLimit);

  const result = await sqlite.execute(sql, params);
  if (!result || !result.rows) return [];

  return result.rows.map((row: any) => {
    const locationsJson = row[4] ? String(row[4]) : null;
    let locations: LocationItem[] | undefined;

    if (locationsJson) {
      try {
        locations = JSON.parse(locationsJson);
      } catch (error) {
        console.error("Failed to parse locations JSON:", error);
      }
    }

    return {
      $type: "app.dropanchor.checkin" as const,
      id: String(row[0]),
      authorDid: String(row[1]),
      text: String(row[2]),
      createdAt: String(row[3]),
      locations,
      category: row[5] ? String(row[5]) : undefined,
      categoryGroup: row[6] ? String(row[6]) : undefined,
      categoryIcon: row[7] ? String(row[7]) : undefined,
      uri: String(row[8]),
      cid: row[9] ? String(row[9]) : undefined,
    };
  });
}

// Get user settings
export async function getUserSettings(did: string): Promise<{ enableFeedPosts: boolean }> {
  const result = await sqlite.execute(
    `
    SELECT enableFeedPosts FROM ${SETTINGS_TABLE_NAME} WHERE did = ?
  `,
    [did],
  );

  if (!result || !result.rows || result.rows.length === 0) {
    // Return default settings
    return { enableFeedPosts: true };
  }

  return { enableFeedPosts: Boolean(result.rows[0][0]) };
}

// Update user settings
export async function updateUserSettings(
  did: string,
  settings: { enableFeedPosts: boolean },
): Promise<void> {
  await sqlite.execute(
    `
    INSERT OR REPLACE INTO ${SETTINGS_TABLE_NAME} (did, enableFeedPosts) 
    VALUES (?, ?)
  `,
    [did, settings.enableFeedPosts],
  );
}
