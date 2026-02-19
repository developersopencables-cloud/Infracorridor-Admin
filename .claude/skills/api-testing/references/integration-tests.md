# Integration Testing Guide

Integration tests verify that API routes work correctly with the database and authentication.

## Testing Next.js 16 App Router API Routes

Use `next-test-api-route-handler` to test API routes in isolation:

```typescript
// src/__tests__/api/corridors.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import * as appHandler from '@/app/api/corridors/route';
import { checkAdminSession } from '@/database/auth-utils';
import { Corridor } from '@/models/corridor.model';
import { createTestCorridor } from '../factories/corridor.factory';

// Mock auth module
vi.mock('@/database/auth-utils');

describe('GET /api/corridors', () => {
  beforeEach(() => {
    // Setup admin auth by default
    vi.mocked(checkAdminSession).mockResolvedValue({
      isAdmin: true,
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      session: {},
    });
  });

  it('returns empty array when no corridors exist', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data).toEqual([]);
      },
    });
  });

  it('returns corridors list', async () => {
    // Seed test data
    await Corridor.create(createTestCorridor({ title: 'Corridor 1' }));
    await Corridor.create(createTestCorridor({ title: 'Corridor 2' }));

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data).toHaveLength(2);
      },
    });
  });

  it('filters by status', async () => {
    await Corridor.create(createTestCorridor({ status: 'DRAFT' }));
    await Corridor.create(createTestCorridor({ status: 'PUBLISHED' }));

    await testApiHandler({
      appHandler,
      url: '/api/corridors?status=PUBLISHED',
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        const json = await res.json();

        expect(json.data).toHaveLength(1);
        expect(json.data[0].status).toBe('PUBLISHED');
      },
    });
  });

  it('returns 401 for unauthenticated request', async () => {
    vi.mocked(checkAdminSession).mockResolvedValue(null);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/unauthorized/i);
      },
    });
  });
});
```

## Testing POST Endpoints

```typescript
describe('POST /api/corridors', () => {
  beforeEach(() => {
    vi.mocked(checkAdminSession).mockResolvedValue({
      isAdmin: true,
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      session: {},
    });
  });

  it('creates corridor with valid data', async () => {
    const newCorridor = createTestCorridor();

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCorridor),
        });
        const json = await res.json();

        expect(res.status).toBe(201);
        expect(json.success).toBe(true);
        expect(json.data.title).toBe(newCorridor.title);
        expect(json.data._id).toBeDefined();
      },
    });

    // Verify in database
    const saved = await Corridor.findOne({ slug: newCorridor.slug });
    expect(saved).not.toBeNull();
  });

  it('returns 400 for missing required fields', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Missing slug and type' }),
        });
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toBeDefined();
      },
    });
  });

  it('returns 409 for duplicate slug', async () => {
    const existingCorridor = createTestCorridor({ slug: 'duplicate-slug' });
    await Corridor.create(existingCorridor);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createTestCorridor({ slug: 'duplicate-slug' })),
        });
        const json = await res.json();

        expect(res.status).toBe(409);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/already exists|duplicate/i);
      },
    });
  });

  it('returns 403 for non-admin user', async () => {
    vi.mocked(checkAdminSession).mockResolvedValue({
      isAdmin: false,
      user: { id: 'user-1', email: 'user@test.com', role: 'user' },
      session: {},
    });

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createTestCorridor()),
        });
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.success).toBe(false);
      },
    });
  });
});
```

## Testing Dynamic Route Parameters

For routes like `/api/corridors/[id]`:

```typescript
// src/__tests__/api/corridors-id.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import * as appHandler from '@/app/api/corridors/[id]/route';
import { checkAdminSession } from '@/database/auth-utils';
import { Corridor } from '@/models/corridor.model';
import { createTestCorridor } from '../factories/corridor.factory';

vi.mock('@/database/auth-utils');

describe('GET /api/corridors/[id]', () => {
  beforeEach(() => {
    vi.mocked(checkAdminSession).mockResolvedValue({
      isAdmin: true,
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      session: {},
    });
  });

  it('returns corridor by ID', async () => {
    const corridor = await Corridor.create(createTestCorridor());

    await testApiHandler({
      appHandler,
      params: { id: corridor._id.toString() },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data._id).toBe(corridor._id.toString());
      },
    });
  });

  it('returns 404 for non-existent ID', async () => {
    const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format

    await testApiHandler({
      appHandler,
      params: { id: fakeId },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/not found/i);
      },
    });
  });

  it('returns 400 for invalid ID format', async () => {
    await testApiHandler({
      appHandler,
      params: { id: 'invalid-id' },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
      },
    });
  });
});

describe('PUT /api/corridors/[id]', () => {
  beforeEach(() => {
    vi.mocked(checkAdminSession).mockResolvedValue({
      isAdmin: true,
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      session: {},
    });
  });

  it('updates corridor', async () => {
    const corridor = await Corridor.create(createTestCorridor());

    await testApiHandler({
      appHandler,
      params: { id: corridor._id.toString() },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated Title' }),
        });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data.title).toBe('Updated Title');
      },
    });

    // Verify in database
    const updated = await Corridor.findById(corridor._id);
    expect(updated?.title).toBe('Updated Title');
  });

  it('returns 404 when updating non-existent corridor', async () => {
    const fakeId = '507f1f77bcf86cd799439011';

    await testApiHandler({
      appHandler,
      params: { id: fakeId },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated' }),
        });

        expect(res.status).toBe(404);
      },
    });
  });
});

describe('DELETE /api/corridors/[id]', () => {
  beforeEach(() => {
    vi.mocked(checkAdminSession).mockResolvedValue({
      isAdmin: true,
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      session: {},
    });
  });

  it('deletes corridor', async () => {
    const corridor = await Corridor.create(createTestCorridor());

    await testApiHandler({
      appHandler,
      params: { id: corridor._id.toString() },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'DELETE' });

        expect(res.status).toBe(200);
      },
    });

    // Verify deleted
    const deleted = await Corridor.findById(corridor._id);
    expect(deleted).toBeNull();
  });

  it('returns 404 when deleting non-existent corridor', async () => {
    const fakeId = '507f1f77bcf86cd799439011';

    await testApiHandler({
      appHandler,
      params: { id: fakeId },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'DELETE' });

        expect(res.status).toBe(404);
      },
    });
  });
});
```

## Testing Query Parameters

```typescript
describe('GET /api/corridors with query params', () => {
  it('paginates results', async () => {
    // Create 15 corridors
    for (let i = 0; i < 15; i++) {
      await Corridor.create(createTestCorridor({ title: `Corridor ${i}` }));
    }

    await testApiHandler({
      appHandler,
      url: '/api/corridors?page=1&limit=10',
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        const json = await res.json();

        expect(json.data).toHaveLength(10);
        expect(json.pagination.total).toBe(15);
        expect(json.pagination.page).toBe(1);
      },
    });
  });

  it('searches by title', async () => {
    await Corridor.create(createTestCorridor({ title: 'New York London' }));
    await Corridor.create(createTestCorridor({ title: 'Singapore Tokyo' }));

    await testApiHandler({
      appHandler,
      url: '/api/corridors?search=york',
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        const json = await res.json();

        expect(json.data).toHaveLength(1);
        expect(json.data[0].title).toContain('York');
      },
    });
  });
});
```

## Testing Error Scenarios

```typescript
describe('API Error Handling', () => {
  it('handles database connection errors', async () => {
    // Mock mongoose to throw
    vi.spyOn(Corridor, 'find').mockRejectedValueOnce(new Error('DB connection failed'));

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/server error|failed/i);
      },
    });
  });

  it('handles validation errors gracefully', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distanceKm: 'not-a-number', // Invalid type
          }),
        });
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
      },
    });
  });
});
```

## Test Organization Tips

1. **Group by HTTP method** - Makes it easy to find tests for specific operations
2. **Test both success and failure** - Every endpoint should test happy path and error cases
3. **Seed data in tests** - Create test data within each test or `beforeEach` for isolation
4. **Clean up between tests** - Global setup handles this, but verify if issues arise
5. **Use descriptive test names** - Should read like documentation
