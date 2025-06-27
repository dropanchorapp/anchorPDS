// Shared types and interfaces for Anchor PDS

/**
 * Anchor PDS CheckinRecord Definition
 *
 * This is the canonical structure for check-in records in the Anchor PDS.
 * It follows AT Protocol lexicon standards and uses structured location data.
 *
 * Structure:
 * - Core fields: text (message), createdAt (ISO timestamp)
 * - Locations: Array of community.lexicon.location.* objects (geo and/or address)
 * - Categories: Optional OSM-based categorization with icon support
 *
 * Example:
 * {
 *   "$type": "app.dropanchor.checkin",
 *   "text": "Great coffee and climbing session!",
 *   "createdAt": "2025-06-27T10:30:00Z",
 *   "locations": [
 *     {
 *       "$type": "community.lexicon.location.geo",
 *       "latitude": "40.7128",
 *       "longitude": "-74.0060"
 *     },
 *     {
 *       "$type": "community.lexicon.location.address",
 *       "street": "123 Main St",
 *       "locality": "New York",
 *       "region": "NY",
 *       "country": "US",
 *       "postalCode": "10001",
 *       "name": "Brooklyn Boulders"
 *     }
 *   ],
 *   "category": "climbing",
 *   "categoryGroup": "Sports & Fitness",
 *   "categoryIcon": "🧗‍♂️"
 * }
 */

// Community lexicon location types
export interface CommunityGeoLocation {
  $type: "community.lexicon.location.geo";
  latitude: string;
  longitude: string;
}

export interface CommunityAddressLocation {
  $type: "community.lexicon.location.address";
  street?: string;
  locality?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  name?: string;
}

export type LocationItem = CommunityGeoLocation | CommunityAddressLocation;

// Main check-in record following the lexicon (clean structure, no legacy fields)
export interface CheckinRecord {
  $type?: "app.dropanchor.checkin";
  text: string; // checkin message/venue name
  createdAt: string; // ISO timestamp
  locations?: LocationItem[]; // Array of community.lexicon.location.* objects
  // Optional place categorization fields (OSM-based)
  category?: string; // OSM category value (e.g., "restaurant", "climbing", "hotel")
  categoryGroup?: string; // Human-readable group (e.g., "Food & Drink", "Sports & Fitness")
  categoryIcon?: string; // Unicode emoji icon (e.g., "🍽️", "🧗‍♂️", "🏨")
}

export interface StoredCheckin extends CheckinRecord {
  id: string;
  authorDid: string;
  uri: string;
  cid?: string;
}

export interface CheckinResponse {
  uri: string;
  cid: string;
  value: CheckinRecord;
  author: {
    did: string;
  };
}

export interface FeedResponse {
  checkins: CheckinResponse[];
  cursor?: string;
}

export interface CreateRecordRequest {
  collection: string;
  record: CheckinRecord;
  rkey?: string;
}

export interface CreateRecordResponse {
  uri: string;
  cid: string;
}

// Validation functions
export function validateCheckinRecord(record: any): CheckinRecord {
  if (typeof record !== "object" || record === null) {
    throw new Error("Record must be an object");
  }

  if (!record.text || typeof record.text !== "string") {
    throw new Error("Record must have a text field");
  }

  if (record.text.length > 300) {
    throw new Error("text must be 300 characters or less");
  }

  if (!record.createdAt || typeof record.createdAt !== "string") {
    throw new Error("Record must have a createdAt field");
  }

  // Validate ISO timestamp
  if (isNaN(Date.parse(record.createdAt))) {
    throw new Error("createdAt must be a valid ISO timestamp");
  }

  const validatedRecord: CheckinRecord = {
    $type: "app.dropanchor.checkin",
    text: record.text,
    createdAt: record.createdAt,
  };

  // Validate locations array if present
  if (record.locations !== undefined) {
    if (!Array.isArray(record.locations)) {
      throw new Error("locations must be an array");
    }

    const validatedLocations: LocationItem[] = [];

    for (const location of record.locations) {
      if (!location.$type) {
        throw new Error("Each location must have a $type field");
      }

      if (location.$type === "community.lexicon.location.geo") {
        const geoLocation = validateGeoLocation(location);
        validatedLocations.push(geoLocation);
      } else if (location.$type === "community.lexicon.location.address") {
        const addressLocation = validateAddressLocation(location);
        validatedLocations.push(addressLocation);
      } else {
        throw new Error(`Unsupported location type: ${location.$type}`);
      }
    }

    if (validatedLocations.length > 0) {
      validatedRecord.locations = validatedLocations;
    }
  }

  // Validate optional category fields
  if (record.category !== undefined) {
    if (typeof record.category !== "string" || record.category.length === 0) {
      throw new Error("category must be a non-empty string");
    }
    if (record.category.length > 50) {
      throw new Error("category must be 50 characters or less");
    }
    validatedRecord.category = record.category;
  }

  if (record.categoryGroup !== undefined) {
    if (typeof record.categoryGroup !== "string" || record.categoryGroup.length === 0) {
      throw new Error("categoryGroup must be a non-empty string");
    }
    if (record.categoryGroup.length > 50) {
      throw new Error("categoryGroup must be 50 characters or less");
    }
    validatedRecord.categoryGroup = record.categoryGroup;
  }

  if (record.categoryIcon !== undefined) {
    if (typeof record.categoryIcon !== "string" || record.categoryIcon.length === 0) {
      throw new Error("categoryIcon must be a non-empty string");
    }
    if (record.categoryIcon.length > 10) {
      throw new Error("categoryIcon must be 10 characters or less");
    }
    validatedRecord.categoryIcon = record.categoryIcon;
  }

  return validatedRecord;
}

function validateGeoLocation(location: any): CommunityGeoLocation {
  if (!location.latitude || typeof location.latitude !== "string") {
    throw new Error("geo location must have latitude as string");
  }

  if (!location.longitude || typeof location.longitude !== "string") {
    throw new Error("geo location must have longitude as string");
  }

  // Validate that the strings represent valid numbers
  const lat = parseFloat(location.latitude);
  const lng = parseFloat(location.longitude);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error("latitude must be a valid number between -90 and 90");
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    throw new Error("longitude must be a valid number between -180 and 180");
  }

  return {
    $type: "community.lexicon.location.geo",
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

function validateAddressLocation(location: any): CommunityAddressLocation {
  const validatedAddress: CommunityAddressLocation = {
    $type: "community.lexicon.location.address",
  };

  // All address fields are optional
  if (location.street !== undefined) {
    if (typeof location.street !== "string") {
      throw new Error("street must be a string");
    }
    validatedAddress.street = location.street;
  }

  if (location.locality !== undefined) {
    if (typeof location.locality !== "string") {
      throw new Error("locality must be a string");
    }
    validatedAddress.locality = location.locality;
  }

  if (location.region !== undefined) {
    if (typeof location.region !== "string") {
      throw new Error("region must be a string");
    }
    validatedAddress.region = location.region;
  }

  if (location.country !== undefined) {
    if (typeof location.country !== "string") {
      throw new Error("country must be a string");
    }
    validatedAddress.country = location.country;
  }

  if (location.postalCode !== undefined) {
    if (typeof location.postalCode !== "string") {
      throw new Error("postalCode must be a string");
    }
    validatedAddress.postalCode = location.postalCode;
  }

  if (location.name !== undefined) {
    if (typeof location.name !== "string") {
      throw new Error("name must be a string");
    }
    validatedAddress.name = location.name;
  }

  return validatedAddress;
}

// Utility functions
export function generateRkey(): string {
  return crypto.randomUUID();
}

export function createAtUri(did: string, collection: string, rkey: string): string {
  return `at://${did}/${collection}/${rkey}`;
}

export function generateCid(): string {
  // Simple CID generation (in production, use proper IPLD/DAG-CBOR)
  return `baf${Math.random().toString(36).substring(2, 15)}`;
}
