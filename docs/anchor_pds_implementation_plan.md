# Anchor PDS Implementation Plan

Based on the development plan document and your specified preferences, here's a step-by-step implementation guide for building the Anchor Personal Data Server on Val Town.

## Overview

We'll build a lightweight PDS focused on `app.dropanchor.checkin` records using TypeScript + SQLite, with three main phases of functionality.

## Phase 1: Core Check-In Storage and Feeds

### 1.1 Authentication Setup

**Approach: Trust PDS-Issued Tokens (Simple)**

- Accept `Authorization: Bearer <token>` headers
- Extract user DID by calling `com.atproto.server.getSession` on the user's home PDS
- Cache DID/handle mapping after first verification to avoid repeated calls
- Validate that operations match the authenticated user's DID

**Implementation Steps:**
1. Create authentication middleware function
2. Parse Authorization header and extract token
3. Call user's home PDS to validate token and get DID
4. Store user context for request duration

### 1.2 Database Schema

**SQLite Table for Check-ins:**

```sql
CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,           -- record key (rkey)
    authorDid TEXT NOT NULL,       -- DID of user who created checkin
    text TEXT NOT NULL,           -- checkin message/venue name
    createdAt TEXT NOT NULL,      -- ISO timestamp
    latitude REAL,                -- WGS84 coordinates
    longitude REAL,               
    placeName TEXT,               -- venue/place name
    address TEXT,                 -- full address or JSON of address components
    uri TEXT NOT NULL,            -- full AT URI (at://did/collection/rkey)
    cid TEXT                      -- content hash (optional but recommended)
);

CREATE INDEX idx_checkins_author ON checkins(authorDid);
CREATE INDEX idx_checkins_created ON checkins(createdAt);
CREATE INDEX idx_checkins_location ON checkins(latitude, longitude);
```

### 1.3 Check-in Creation Endpoint

**Standard ATProto Record Creation:**

- Implement `com.atproto.repo.createRecord` XRPC method
- Restrict to `app.dropanchor.checkin` collection only
- Validate record schema against community lexicon types
- Generate unique rkey (UUID recommended)
- Store in SQLite and return AT URI + CID

**Implementation Steps:**
1. Create XRPC route handler for `createRecord`
2. Authenticate request and extract user DID
3. Validate collection is `app.dropanchor.checkin`
4. Validate record matches expected schema
5. Generate rkey and construct AT URI
6. Insert into database
7. Return response with uri and cid

### 1.4 Read Endpoints

**User Feed (Authenticated):**
- Endpoint: `/xrpc/app.dropanchor.listCheckins?user=<did>`
- Query user's own check-ins sorted by createdAt DESC
- Limit to 50 records per request
- Require authentication

**Global Feed:**
- Endpoint: `/xrpc/app.dropanchor.getGlobalFeed`
- Return recent check-ins from all users
- **Hard limit: 100 records maximum**
- Sort by createdAt DESC
- Require authentication to prevent scraping

**Implementation Steps:**
1. Create route handlers for both endpoints
2. Implement SQL queries with proper limits
3. Map database rows to proper JSON format
4. Add pagination support (cursor-based recommended)

### 1.5 Record Retrieval

**Individual Record Access:**
- Implement `com.atproto.sync.getRecord` for external clients
- Allow other servers/clients to fetch specific check-in records
- Required for federation and embedding

## Phase 2: Enhanced Features

### 2.1 Geospatial "Nearby" Queries

**Endpoint:** `/xrpc/app.dropanchor.getNearbyCheckins`
**Parameters:** `lat`, `lng`, `radiusKm`

**Implementation Strategy:**
1. Use bounding box pre-filtering for performance
2. Calculate `minLat`, `maxLat`, `minLng`, `maxLng` based on radius
3. SQL query with BETWEEN clauses on lat/lng
4. Apply Haversine distance formula for exact filtering
5. Sort by distance or recency

**SQL Approach:**
```sql
SELECT * FROM checkins 
WHERE latitude BETWEEN ? AND ? 
  AND longitude BETWEEN ? AND ?
  AND ((latitude - ?) * ? * (latitude - ?) * ? 
       + (longitude - ?) * (longitude - ?)) <= ?
ORDER BY createdAt DESC 
LIMIT 50;
```

### 2.2 Optional Feed Cross-Posting

**Settings-Controlled Feature:**
- Add user preference: `enableFeedPosts` (default: true)
- When enabled, create corresponding `app.bsky.feed.post` on user's home PDS
- Post includes embed reference to check-in record
- When disabled, only create check-in record

**Implementation:**
1. Add settings storage (user preferences table)
2. Check user preference after creating check-in
3. If enabled, call `createRecord` on user's home PDS
4. Create post with `app.bsky.embed.record` pointing to check-in

## Phase 3: Social Interactions

### 3.1 Likes Support

**Server-Side Proxy Approach:**
- Endpoint: `/xrpc/app.dropanchor.getCheckinLikes?uri=<checkinURI>`
- Proxy calls to Bluesky's `app.bsky.feed.getLikes`
- Return formatted like data
- No caching (direct pass-through initially)

**Implementation:**
1. Create proxy endpoint
2. Validate checkin URI belongs to our PDS
3. Call public Bluesky API
4. Format and return response
5. Handle rate limits gracefully

### 3.2 Comments on Check-ins

**Direct Check-in Comments (Anchor App Only):**
- Custom record type: `app.dropanchor.comment`
- Comments reference check-in URI directly
- Only creatable through Anchor app
- Independent of optional feed posts

**Schema for Comments:**
```sql
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    authorDid TEXT NOT NULL,
    checkinUri TEXT NOT NULL,    -- references the checkin being commented on
    text TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    uri TEXT NOT NULL,
    cid TEXT
);
```

**Endpoints:**
- Create: `com.atproto.repo.createRecord` with `app.dropanchor.comment`
- Read: `/xrpc/app.dropanchor.getCheckinComments?uri=<checkinURI>`

### 3.3 Interaction Retrieval

**On-Demand Loading:**
- No caching layer initially
- Call external APIs for each request
- Accept latency trade-off for simplicity
- Monitor performance for future caching decisions

## Implementation Timeline

### Week 1: Phase 1 Core
- [ ] Set up Val Town project with SQLite
- [ ] Implement authentication middleware
- [ ] Create database schema
- [ ] Build check-in creation endpoint
- [ ] Implement user and global feeds

### Week 2: Phase 1 Polish + Phase 2 Start
- [ ] Add record retrieval endpoints
- [ ] Test federation with external clients
- [ ] Implement geospatial nearby queries
- [ ] Add user settings for feed cross-posting

### Week 3: Phase 2 Complete + Phase 3 Start
- [ ] Complete optional feed integration
- [ ] Begin likes proxy implementation
- [ ] Design comment system schema
- [ ] Implement comment creation/retrieval

### Week 4: Phase 3 Complete
- [ ] Finish interaction endpoints
- [ ] Performance testing and optimization
- [ ] Documentation and deployment
- [ ] Integration testing with Anchor client

## Technical Considerations

### Performance
- Use database indexes for common queries
- Implement proper pagination
- Monitor query performance, especially geospatial

### Security
- Validate all input data
- Implement rate limiting
- Secure token handling
- Prevent data scraping through auth requirements

### Federation
- Ensure AT Protocol compliance
- Test with external clients
- Proper error handling for network calls
- Handle PDS discovery correctly

### Scalability Planning
- Monitor database size growth
- Plan for R*Tree spatial indexing if needed
- Consider caching layer for interactions
- Design for horizontal scaling if usage grows

## Key Architectural Decisions

### Authentication
- **Chosen:** Trust PDS-issued tokens with validation via home PDS
- **Alternative:** Full JWT validation with DID resolution
- **Rationale:** Simpler implementation, aligned with Bluesky client patterns

### Record Creation
- **Chosen:** Standard `com.atproto.repo.createRecord` endpoint
- **Alternative:** Custom simplified endpoint
- **Rationale:** Better AT Protocol compliance and federation support

### Feed Cross-Posting
- **Chosen:** Optional feature controlled by user settings
- **Default:** Enabled (creates both check-in and feed post)
- **Rationale:** Maintains social visibility while allowing privacy-focused users to opt out

### Global Feed Limits
- **Chosen:** Hard limit of 100 records maximum
- **Rationale:** Prevents performance issues and resource abuse

### Interactions Strategy
- **Chosen:** On-demand retrieval without caching
- **Rationale:** Simplicity for initial implementation, can add caching later

### Comments Architecture
- **Chosen:** Direct check-in references via custom comment records
- **Alternative:** Rely on feed post replies
- **Rationale:** Works regardless of feed post settings, provides consistent experience

This implementation plan prioritizes working functionality over optimization, allowing for iterative improvements as usage patterns emerge.

## Additional Resources

- [AT Protocol Documentation](https://atproto.com)
- [Bluesky API Documentation](https://docs.bsky.app)
- [Community Lexicon Repository](https://github.com/lexicon-community/lexicon)
- [Val Town Documentation](https://docs.val.town)

## Next Steps

1. Set up development environment on Val Town
2. Initialize SQLite database with schema
3. Begin Phase 1 implementation with authentication
4. Test each endpoint thoroughly before moving to next phase
5. Document API endpoints for client integration

---

*This plan is based on the detailed development document and incorporates specific architectural choices for the Anchor PDS implementation.*