# Anchor Personal Data Server (PDS)

[![Tests](https://github.com/dropanchorapp/anchorPDS/actions/workflows/tests.yml/badge.svg)](https://github.com/dropanchorapp/anchorPDS/actions/workflows/tests.yml)

A specialized ATProto server for check-in records, providing location-based social features for the Anchor ecosystem.

This PDS powers the backend infrastructure for [Drop Anchor](https://dropanchor.app) - an *experimental* location-based social network built on the AT Protocol. While Drop Anchor provides the user interface and client experience, this PDS handles the storage, federation, and API endpoints for check-in records.

## 🚀 Live Service

**Production URL**: <https://anchorpds.val.run/>

## 📋 Current Features (Phase 1)

### Core Functionality

- **Check-in Records**: Create and store location-based check-ins using ATProto standard
- **Authentication**: Token validation via home PDS integration
- **Federation**: Full AT Protocol compliance for external client support
- **Global Feed**: View recent check-ins from all users (max 100 records)
- **User Feed**: View your own check-in history with pagination

### ATProto Endpoints

- `POST /xrpc/com.atproto.repo.createRecord` - Create check-in records
- `GET /xrpc/com.atproto.sync.getRecord` - Retrieve individual records

### Anchor-Specific Endpoints

- `GET /xrpc/app.dropanchor.listCheckins` - List user's check-ins (authenticated)
- `GET /xrpc/app.dropanchor.getGlobalFeed` - Global feed of recent check-ins
- `GET /health` - Service health check

## 🗄️ Data Model

### Check-in Records (v3 Schema)

Each check-in follows the AT Protocol lexicon standard with structured location data:

```json
{
  "$type": "app.dropanchor.checkin",
  "text": "Great coffee and climbing session!",
  "createdAt": "2025-06-27T10:30:00Z",
  "locations": [
    {
      "$type": "community.lexicon.location.geo",
      "latitude": "40.7128",
      "longitude": "-74.0060"
    },
    {
      "$type": "community.lexicon.location.address",
      "name": "Brooklyn Boulders",
      "street": "123 Main St",
      "locality": "New York",
      "region": "NY",
      "country": "US",
      "postalCode": "10001"
    }
  ],
  "category": "climbing",
  "categoryGroup": "Sports & Fitness",
  "categoryIcon": "🧗‍♂️"
}
```

#### Core Fields

- **text**: Message or venue name (required)
- **createdAt**: ISO timestamp (required)
- **locations**: Array of community.lexicon.location.* objects (optional)

#### Location Objects

- **geo**: GPS coordinates with latitude/longitude as strings
- **address**: Structured address with name, street, locality, region, country, postalCode

#### Categorization (Optional)

- **category**: [OpenStreetMap](https://wiki.openstreetmap.org/) category value
- **categoryGroup**: Human-readable group name
- **categoryIcon**: Unicode emoji representing the category

### Place Categorization

The PDS supports rich categorization based on [OpenStreetMap](https://wiki.openstreetmap.org/) standards with 11 custom category groups:

#### Anchor Category Groups

1. **🍽️ Food & Drink** - Restaurants, cafes, bars, food courts
2. **🎭 Entertainment** - Cinemas, theaters, nightlife, gaming
3. **🏃‍♂️ Sports & Fitness** - Gyms, climbing, swimming, sports venues
4. **🛍️ Shopping** - Retail stores, markets, malls, specialty shops
5. **🏨 Accommodation** - Hotels, hostels, guesthouses, camping
6. **🚌 Transportation** - Stations, airports, public transport
7. **🏛️ Services** - Banks, government, professional services
8. **🌳 Nature & Parks** - Parks, gardens, nature reserves, outdoor recreation
9. **🎨 Culture** - Museums, galleries, historic sites, libraries
10. **🏥 Health** - Hospitals, clinics, pharmacies, healthcare
11. **📚 Education** - Schools, universities, educational facilities

#### OpenStreetMap Integration

Categories map to OSM tags and values from these primary keys:

- **[amenity](https://wiki.openstreetmap.org/wiki/Key:amenity)** - Community facilities (66+ categories)
- **[leisure](https://wiki.openstreetmap.org/wiki/Key:leisure)** - Recreation and sports (40+ categories)  
- **[shop](https://wiki.openstreetmap.org/wiki/Key:shop)** - Retail and commercial (88+ categories)
- **[tourism](https://wiki.openstreetmap.org/wiki/Key:tourism)** - Tourist attractions and services (27+ categories)

For detailed category mappings, see [OSM Map Features](https://wiki.openstreetmap.org/wiki/Map_features).

### Storage

- SQLite database with proper indexing for performance
- Optimized for queries by author, timestamp, location, and categories
- User settings for feed preferences

## 🔐 Authentication

Uses ATProto token validation:

- Accepts Bearer tokens from any compatible PDS
- Validates tokens against home PDS (bsky.social, staging.bsky.dev)
- In-memory caching for performance (1-hour TTL)

## 🛠️ Technology Stack

- **Runtime**: Deno on Val Town platform
- **Framework**: Hono web framework
- **Database**: Val Town hosted SQLite
- **Protocol**: AT Protocol (ATProto) compliant
- **Language**: TypeScript with full type safety

## 📦 API Usage

### Create a Check-in

```bash
curl -X POST https://anchorpds.val.run/xrpc/com.atproto.repo.createRecord \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "app.dropanchor.checkin",
    "record": {
      "text": "Great coffee at the local café!",
      "createdAt": "2024-01-15T10:30:00Z",
      "locations": [
        {
          "$type": "community.lexicon.location.geo",
          "latitude": "40.7128",
          "longitude": "-74.0060"
        },
        {
          "$type": "community.lexicon.location.address",
          "name": "Central Perk Café",
          "street": "199 Lafayette St",
          "locality": "New York",
          "region": "NY",
          "country": "US"
        }
      ],
      "category": "cafe",
      "categoryGroup": "Food & Drink",
      "categoryIcon": "☕"
    }
  }'
```

### Get Global Feed

```bash
curl https://anchorpds.val.run/xrpc/app.dropanchor.getGlobalFeed?limit=10
```

### Get Your Check-ins

```bash
curl https://anchorpds.val.run/xrpc/app.dropanchor.listCheckins \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔄 Pagination

All feed endpoints support cursor-based pagination:

- `limit`: Number of records to return (default: 50, max: 100)
- `cursor`: Timestamp for pagination (optional)

## 🧪 Testing

Comprehensive test suite covering validation, database operations, and integration:

```bash
deno test test/
```

Tests include validation of the v3 schema with categories, community lexicon location formats, and API endpoint functionality.

## 🏗️ Development

### Requirements

- Deno runtime
- Val Town CLI (`vt`)
- TypeScript knowledge

### Local Development

```bash
# Type checking
deno check --allow-import backend/index.ts

# Linting
deno lint

# Testing
deno test tests/

# Formatting
deno fmt
```

### Deployment

Uses Val Town platform for hosting:

```bash
vt push
```

## 🚧 Roadmap

### Phase 2: Enhanced Features

- Geospatial "nearby" queries with radius search
- Optional feed cross-posting to home PDS
- Advanced location filtering

### Phase 3: Social Interactions

- Likes support via Bluesky API proxy
- Direct check-in comments
- Social interaction feeds

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is a specialized PDS implementation. For contributions:

1. Follow Val Town development guidelines
2. Maintain ATProto compliance
3. Include comprehensive tests
4. Use TypeScript with proper types

## 📞 Support

For issues or questions about the Anchor PDS implementation, please file an issue in the repository.
