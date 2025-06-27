# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Anchor Personal Data Server (PDS) - a specialized ATProto server focused on `app.dropanchor.checkin` records, built for deployment on Val Town using Deno and SQLite.

## Val Town Platform Requirements

This project follows Val Town's specific development guidelines:

### Core Standards
- Generate code in TypeScript or TSX with appropriate types
- **Never bake secrets into code** - always use environment variables via `Deno.env.get('keyname')`
- Use `https://esm.sh` for npm dependencies to ensure server/browser compatibility
- Prefer official SDKs over direct API calls

### Val Town Services
- **SQLite**: Use `import { sqlite } from "https://esm.town/v/stevekrouse/sqlite"`
  - Table schema changes require new table names (e.g., add `_v2`, `_v3`)
  - Results accessed via `result.rows` array format
- **Blob Storage**: `import { blob } from "https://esm.town/v/std/blob"`
- **Email**: `import { email } from "https://esm.town/v/std/email"`

### Framework (Hono)
- Use Hono for API endpoints: `import { Hono } from "https://esm.sh/hono@3.11.7"`
- **Never** use `serveStatic` middleware - use Val Town utilities instead
- Entry point: `export default app.fetch`
- Always include error unwrapping: `app.onError((err, c) => { throw err; })`

### Platform Limitations
- **Redirects**: Use `new Response(null, { status: 302, headers: { Location: "/path" }})` 
- **Storage**: Do NOT use Deno KV module
- **Browser APIs**: Avoid `alert()`, `prompt()`, `confirm()`
- **Error Handling**: Let errors bubble up with context rather than catching and logging

### Architecture

The system implements a three-phase architecture:

1. **Phase 1: Core Check-In Storage and Feeds**
   - Authentication via PDS-issued token validation
   - SQLite database for check-in records
   - Standard ATProto `com.atproto.repo.createRecord` endpoints
   - User and global feed endpoints

2. **Phase 2: Enhanced Features**
   - Geospatial "nearby" queries using bounding box pre-filtering + Haversine distance
   - Optional feed cross-posting to user's home PDS (user-controlled setting)

3. **Phase 3: Social Interactions**
   - Likes support via server-side proxy to Bluesky API
   - Direct check-in comments using custom `app.dropanchor.comment` records
   - On-demand interaction retrieval without caching

### Key Design Decisions

- **Authentication**: Trust PDS-issued tokens with validation via home PDS calls
- **Record Creation**: Standard ATProto compliance using `com.atproto.repo.createRecord`
- **Federation**: Full AT Protocol compliance for external client support
- **Database**: SQLite with proper indexing for performance (author, timestamp, location)
- **Global Feed**: Hard limit of 100 records maximum to prevent resource abuse

## Development Commands

This is a Deno project configured for Val Town deployment:

- **Lint**: `deno lint` (configured to exclude no-explicit-any rule)
- **Type Check**: `deno check --allow-import <file>` (requires import flag for Val Town types)
- **Run**: Deploy to Val Town (no local dev server setup documented)
- **Run Tests and Formatting**: Always run tests and format code after big changes to ensure code quality and consistency

## Project Structure

Following Val Town's recommended directory structure:

```
backend/
├── database/
│   ├── migrations.ts    # Schema definitions with table versioning
│   └── queries.ts       # DB query functions with proper type conversion
├── routes/
│   ├── atproto.ts       # ATProto standard endpoints
│   └── anchor.ts        # Anchor-specific endpoints
└── index.ts             # Main Hono app entry point
shared/
├── auth.ts              # Authentication utilities
└── types.ts             # Shared types and validation functions
```

## Database Schema

Core table structure using Val Town SQLite:

```sql
-- Current tables (change table names for schema updates)
anchor_checkins_v1 (
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

anchor_user_settings_v1 (
    did TEXT PRIMARY KEY,
    enableFeedPosts BOOLEAN DEFAULT TRUE
);
```

**Important**: SQLite results use `result.rows` array format. Type conversion required:
```typescript
// Convert SQLite values to proper types
id: String(row[0]),
latitude: row[4] ? Number(row[4]) : undefined
```

## Key Endpoints

- `com.atproto.repo.createRecord` - Standard record creation (check-ins only)
- `com.atproto.sync.getRecord` - Individual record retrieval for federation
- `/xrpc/app.dropanchor.listCheckins` - User's own check-ins (authenticated)
- `/xrpc/app.dropanchor.getGlobalFeed` - Recent check-ins from all users (max 100)
- `/xrpc/app.dropanchor.getNearbyCheckins` - Geospatial queries with lat/lng/radius
- `/xrpc/app.dropanchor.getCheckinLikes` - Proxy to Bluesky likes API
- `/xrpc/app.dropanchor.getCheckinComments` - Direct check-in comments

## Runtime Configuration

- **Platform**: Val Town (Deno runtime)
- **Database**: Val Town hosted SQLite service
- **Authentication**: Token validation via external PDS calls with in-memory caching
- **Federation**: AT Protocol compliant
- **API Framework**: Hono with proper error unwrapping
- **Entry Point**: `backend/index.ts` exports `app.fetch`
- **Production URL**: https://anchorpds.val.run/

## Development Workflow

This project uses the Val Town CLI (`vt`) for local development and deployment:

### Local Development

- Create and edit files locally in this directory structure
- Use `deno check --allow-import <file>` for type checking
- Use `deno lint` for code linting
- Test logic locally where possible

### Val Town CLI Commands

- **Install**: `npm install -g @valtown/vt` or `deno install -A -f https://esm.town/v/std/vt`
- **Login**: `vt login` to authenticate with Val Town
- **Create Val**: `vt create <filename>` to create a new val from local file
- **Update Val**: `vt update <val-name> <filename>` to update existing val
- **Push Changes**: `vt push` to sync local directory with Val Town

### Deployment Process

1. Develop and test locally using this directory structure
2. Use `vt create backend/index.ts` to deploy main HTTP endpoint
3. Database initialization runs automatically on startup
4. Environment variables managed through Val Town dashboard
5. CORS handled automatically by Val Town platform
6. Monitor via Val Town dashboard logs and analytics

### Val Town Specifics

- Entry point: `backend/index.ts` exports `app.fetch`
- No local development server - deploy to Val Town to test HTTP endpoints
- Use Val Town dashboard for environment variables and secrets
- All imports must be compatible with Deno runtime