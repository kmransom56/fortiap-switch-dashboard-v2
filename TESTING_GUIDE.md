# Testing Guide - FortiAP/Switch Dashboard

## Overview

This project has comprehensive test coverage across multiple layers:
- **Unit Tests**: Individual functions and modules
- **Integration Tests**: API endpoints and middleware
- **End-to-End Tests**: Full application functionality

## Running Tests

### All Tests

```bash
npm test
```

This runs all test suites and generates a coverage report.

### Specific Test Suites

```bash
# End-to-End Application Tests (tests actual pages and functionality)
npm test test/e2e.test.js

# Unit Tests
npm test test/server.unit.test.js
npm test test/cache.test.js
npm test test/logger.test.js

# Integration Tests
npm test test/api-endpoints.test.js
npm test test/middleware.test.js
npm test test/websocket.test.js
npm test test/server.test.js
```

### Watch Mode

```bash
npm run test:watch
```

Automatically re-runs tests when files change.

### With Coverage

```bash
npm test -- --coverage
```

Generates detailed coverage report in `coverage/` directory.

## Test Suites Explained

### 1. End-to-End Tests (`test/e2e.test.js`)

**Purpose**: Tests the complete application as a user would experience it.

**What it tests**:
- ✅ Main dashboard page loads correctly
- ✅ CSS and JavaScript files are served
- ✅ Navigation tabs are present
- ✅ API endpoints return data
- ✅ Health check works
- ✅ Error handling for invalid routes

**How it works**:
- Starts the server in development mode
- Makes HTTP requests to test pages and APIs
- Verifies responses are correct
- Tests both API data and fallback data

**Run individually**:
```bash
npm test test/e2e.test.js
```

**Expected result**: 18 tests passing

### 2. Unit Tests (`test/server.unit.test.js`)

**Purpose**: Tests individual functions in isolation.

**What it tests**:
- MemoryCache operations
- Data transformation functions
- Cache loading/saving
- Edge cases and error handling

**Run individually**:
```bash
npm test test/server.unit.test.js
```

**Expected result**: 12 tests passing

### 3. API Endpoint Tests (`test/api-endpoints.test.js`)

**Purpose**: Tests API response formats.

**What it tests**:
- FortiAP endpoint structure
- FortiSwitch endpoint structure
- Connected devices endpoint
- Topology endpoint
- Status and metrics endpoints

**Run individually**:
```bash
npm test test/api-endpoints.test.js
```

**Expected result**: 28 tests passing

### 4. Middleware Tests (`test/middleware.test.js`)

**Purpose**: Tests security and error handling middleware.

**What it tests**:
- Input sanitization (XSS protection)
- Error handler functionality
- Rate limiting configuration
- Validation middleware

**Run individually**:
```bash
npm test test/middleware.test.js
```

**Expected result**: 20 tests passing

### 5. WebSocket Tests (`test/websocket.test.js`)

**Purpose**: Tests real-time WebSocket functionality.

**What it tests**:
- WebSocket connections
- Channel subscriptions
- Broadcasting to clients
- Ping/pong keepalive
- Connection statistics

**Run individually**:
```bash
npm test test/websocket.test.js
```

**Expected result**: 17 tests passing

### 6. Cache Tests (`test/cache.test.js`)

**Purpose**: Tests caching mechanism.

**What it tests**:
- Cache storage and retrieval
- TTL expiration
- Cleanup mechanisms
- Statistics tracking

**Run individually**:
```bash
npm test test/cache.test.js
```

**Expected result**: 12 tests passing

### 7. Logger Tests (`test/logger.test.js`)

**Purpose**: Tests logging configuration.

**What it tests**:
- Logger methods exist
- Custom logging functions
- Middleware integration

**Run individually**:
```bash
npm test test/logger.test.js
```

**Expected result**: 13 tests passing

## Test Environment

Tests run in `NODE_ENV=test` mode by default, except for E2E tests which use `development` mode.

### Key Differences:

**Test Mode (`NODE_ENV=test`)**:
- Server doesn't start (to avoid port conflicts)
- Uses mock data
- Swagger spec simplified
- WebSocket not initialized

**Development Mode (E2E tests)**:
- Server starts on port 13999
- Uses real API calls (falls back to YAML data)
- Full Swagger spec generated
- WebSocket initialized

## Coverage Targets

Current coverage thresholds (in `jest.config.js`):
- **Statements**: 60%
- **Branches**: 60%
- **Functions**: 60%
- **Lines**: 60%

### Current Coverage:

```
Overall: 32.53%
├─ server.js: 47.12%
├─ websocket.js: 97.53% ✅
├─ config/: 90.16% ✅
├─ middleware: 62.74% ✅
└─ app.js: 15.39%
```

## Writing New Tests

### Unit Test Example

```javascript
describe('MyFunction', () => {
  test('should do something specific', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### API Test Example

```javascript
test('GET /api/endpoint should return data', async () => {
  const response = await request(app).get('/api/endpoint');

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('data');
});
```

### E2E Test Example

```javascript
test('Page should load correctly', async () => {
  const response = await request(app).get('/page');

  expect(response.status).toBe(200);
  expect(response.text).toContain('Expected Content');
});
```

## Troubleshooting Tests

### Tests Fail with "EADDRINUSE"

**Problem**: Port already in use

**Solution**:
```bash
# Find and kill process using port
lsof -i :13000
kill -9 <PID>
```

### Tests Pass Individually But Fail Together

**Problem**: Tests are interfering with each other

**Solution**:
- Ensure proper cleanup in `afterEach` and `afterAll`
- Use `jest.resetModules()` to reset state
- Check for shared resources (ports, files)

### Coverage Too Low

**Problem**: Coverage below 60% threshold

**Solution**:
- Add more unit tests for uncovered functions
- Test edge cases and error paths
- Focus on high-value, low-coverage files

### E2E Tests Timeout

**Problem**: E2E tests exceed timeout

**Solution**:
- Increase test timeout: `test('name', async () => {}, 10000)`
- Check server is starting correctly
- Verify cleanup in afterAll hook

## Continuous Integration

For CI/CD pipelines:

```bash
# Install dependencies
npm ci

# Run linter
npm run lint

# Run all tests
npm test

# Check for security vulnerabilities
npm audit
```

## Test Data

### Mock Data Locations:
- `dashboard_data.yaml` - Fallback data for FortiAPs/Switches
- `test/fixtures/` - Test fixtures (if any)
- In-memory mocks in individual test files

### Creating Test Data:

```javascript
// In test file
const mockData = {
  fortiaps: [
    { name: 'Test-AP', status: 'up', clients: 5 }
  ]
};
```

## Best Practices

1. **Test Naming**: Use descriptive names
   ```javascript
   // Good
   test('should return 400 when input is invalid')

   // Bad
   test('test1')
   ```

2. **Arrange-Act-Assert Pattern**:
   ```javascript
   test('example', () => {
     // Arrange
     const input = setupData();

     // Act
     const result = functionUnderTest(input);

     // Assert
     expect(result).toBe(expected);
   });
   ```

3. **One Assertion Per Test**: Focus each test on one thing

4. **Clean Up**: Always clean up resources
   ```javascript
   afterEach(() => {
     // Close connections, reset mocks, etc.
   });
   ```

5. **Avoid Test Interdependence**: Tests should run independently

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm test -- --watch` | Run tests in watch mode |
| `npm test -- --coverage` | Generate coverage report |
| `npm test test/e2e.test.js` | Run E2E tests only |
| `npm run lint` | Check code quality |
| `npm test -- --verbose` | Show detailed test output |

## Current Test Status

✅ **102 tests passing** (as of latest run)
- End-to-End: 18 tests
- Unit Tests: 12 tests
- API Tests: 28 tests
- Middleware: 20 tests
- WebSocket: 17 tests
- Cache: 12 tests
- Logger: 13 tests

🎯 **Zero linting errors**
📊 **Coverage**: 32.53% (target: 60-80%)
