# Anchor PDS Test Suite

Comprehensive test coverage for the Anchor Personal Data Server Phase 1 implementation.

## Test Structure

```
test/
├── auth.test.ts          # Authentication and token validation tests
├── validation.test.ts    # Input validation and utility function tests  
├── database.test.ts      # Database schema and query logic tests
├── integration.test.ts   # End-to-end API endpoint tests
└── README.md            # This file
```

## Running Tests

### Run All Tests

```bash
deno test --allow-net --allow-env
```

### Run Specific Test File

```bash
deno test --allow-net --allow-env test/validation.test.ts
```

### Run Tests with Coverage

```bash
deno test --allow-net --allow-env --coverage=coverage
deno coverage coverage
```

### Run Tests in Watch Mode

```bash
deno test --allow-net --allow-env --watch
```

## Test Categories

### 🔐 Authentication Tests (`auth.test.ts`)

- Token validation with invalid/malformed tokens
- Caching behavior
- Network error handling
- Edge cases in authentication flow

### ✅ Validation Tests (`validation.test.ts`)

- Checkin record validation (required/optional fields)
- Geographic coordinate validation
- Timestamp format validation
- Utility function testing (UUID generation, URI formatting)

### 🗄️ Database Tests (`database.test.ts`)

- Table schema validation
- SQLite row conversion logic
- Null value handling
- Pagination and limit enforcement

### 🌐 Integration Tests (`integration.test.ts`)

- Live endpoint testing against deployed PDS
- HTTP status code validation
- CORS and security header verification
- Authentication requirement enforcement
- Error response format validation

## Test Coverage

The test suite covers:

✅ **Core Functionality**

- Record validation and creation
- Authentication middleware
- Database operations
- API endpoint routing

✅ **Error Handling**

- Invalid input rejection
- Authentication failures
- Network error graceful handling
- Proper HTTP status codes

✅ **Security**

- Authentication requirements
- Input sanitization
- CORS configuration
- Rate limiting (Val Town provided)

✅ **Val Town Compatibility**

- SQLite service integration
- Hono framework usage
- Environment variable handling

## Notes

### Authentication Testing

Real authentication tests require valid AT Protocol tokens. The current tests focus on:

- Invalid token rejection
- Error handling paths
- Caching behavior

For full authentication testing, you would need:

- Valid test tokens from a development PDS
- Mock PDS endpoints for controlled testing

### Database Testing

Database tests focus on:

- Logic validation without requiring live database
- Type conversion correctness
- Edge case handling

For full database testing, you would need:

- Test database instance
- Migration testing
- Transaction handling

### Integration Testing

Integration tests run against the live deployed PDS at:
`https://tijs--95a9ca3049ee11f0a39776b3cceeab13.web.val.run`

These tests verify:

- Endpoint availability
- Error response formats
- Security configurations
- Val Town platform integration

## Adding New Tests

When adding new functionality, ensure tests cover:

1. **Happy Path**: Normal operation with valid inputs
2. **Error Cases**: Invalid inputs, missing data, malformed requests
3. **Edge Cases**: Boundary conditions, null values, empty data
4. **Security**: Authentication, authorization, input validation
5. **Integration**: End-to-end workflow testing

## CI/CD Integration

To integrate with continuous deployment:

```bash
# Add to deployment script
deno test --allow-net --allow-env --quiet
if [ $? -eq 0 ]; then
  echo "✅ Tests passed - proceeding with deployment"
  vt push
else
  echo "❌ Tests failed - deployment cancelled"
  exit 1
fi
```
