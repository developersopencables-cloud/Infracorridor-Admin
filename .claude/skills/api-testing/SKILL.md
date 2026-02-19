---
name: api-testing
description: Guidelines for testing Next.js 16 API routes with Vitest and mongodb-memory-server
---

# API Testing Skill

## When to Use

Use this skill when:
- Writing unit tests for validators, utilities, or business logic
- Writing integration tests for API routes
- Setting up test infrastructure for this project
- Debugging failing tests or improving coverage

## Quick Reference

### Test File Naming

| Type | Pattern | Location |
|------|---------|----------|
| Unit tests | `*.unit.test.ts` | Same directory as source |
| Integration tests | `*.integration.test.ts` | `src/__tests__/api/` |
| Test utilities | `*.ts` | `src/__tests__/` |

### Required Dependencies

```bash
npm install -D vitest @vitest/coverage-v8 mongodb-memory-server next-test-api-route-handler
```

### Test Organization Pattern

```typescript
describe('ComponentName or /api/route', () => {
  describe('methodName or HTTP_METHOD', () => {
    it('does expected behavior when given valid input', async () => {});
    it('returns error when given invalid input', async () => {});
    it('handles edge case correctly', async () => {});
  });
});
```

### Common Commands

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run with coverage report
```

## API Route Test Checklist

For each API route, ensure coverage of:

### GET Endpoints
- [ ] Returns data with correct `{ success: true, data }` format
- [ ] Filters/search params work correctly
- [ ] Pagination works (if applicable)
- [ ] Returns 404 for non-existent resources
- [ ] Returns 401 for unauthenticated requests

### POST Endpoints
- [ ] Creates resource with valid data (201)
- [ ] Validates required fields (400)
- [ ] Handles duplicate/conflict errors (409)
- [ ] Returns 401 for unauthenticated requests
- [ ] Admin routes return 403 for non-admin users

### PUT/PATCH Endpoints
- [ ] Updates existing resource (200)
- [ ] Returns 404 for non-existent resources
- [ ] Validates update payload (400)
- [ ] Returns 401/403 appropriately

### DELETE Endpoints
- [ ] Removes resource (200 or 204)
- [ ] Returns 404 for non-existent resources
- [ ] Returns 401/403 appropriately

## Response Format

This project uses a standard response format:

```typescript
// Success
{ success: true, data: T, message?: string }

// Error
{ success: false, error: string }
```

## References

- [Setup Guide](./references/setup.md) - Dependencies, config, global setup
- [Unit Testing](./references/unit-tests.md) - Validators, utils, models
- [Integration Testing](./references/integration-tests.md) - API route testing
- [Mocks & Fixtures](./references/mocks-fixtures.md) - MongoDB mock, auth mock, factories
