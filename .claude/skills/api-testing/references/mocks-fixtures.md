# Mocks and Fixtures Guide

This guide covers test data factories, auth mocking, and other test utilities.

## MongoDB Memory Server Setup

The global setup file (from [setup.md](./setup.md)) handles MongoDB lifecycle:

```typescript
// src/__tests__/setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  vi.clearAllMocks();
});
```

## Test Data Factories

Factories create valid test data with sensible defaults that can be overridden:

### Corridor Factory

```typescript
// src/__tests__/factories/corridor.factory.ts
import type { ICorridor } from '@/types/corridor';

let corridorCounter = 0;

export const createTestCorridor = (overrides: Partial<ICorridor> = {}): Partial<ICorridor> => {
  corridorCounter++;
  return {
    slug: `test-corridor-${corridorCounter}-${Date.now()}`,
    title: `Test Corridor ${corridorCounter}`,
    type: 'city-to-city',
    fromCity: 'New York',
    toCity: 'London',
    fromCountry: 'United States',
    toCountry: 'United Kingdom',
    distanceKm: 5500,
    avgLatencyMs: 75,
    mapImageUrl: 'https://example.com/map.png',
    status: 'DRAFT',
    dataCentersConnected: 5,
    activeCarriers: 3,
    subseaSystems: [],
    vendors: [],
    ...overrides,
  };
};

// For creating multiple corridors
export const createTestCorridors = (count: number, overrides: Partial<ICorridor> = []) => {
  return Array.from({ length: count }, (_, i) =>
    createTestCorridor({ title: `Corridor ${i + 1}`, ...overrides })
  );
};
```

### Vendor Factory

```typescript
// src/__tests__/factories/vendor.factory.ts
import type { IVendor } from '@/types/vendor';

let vendorCounter = 0;

export const createTestVendor = (overrides: Partial<IVendor> = {}): Partial<IVendor> => {
  vendorCounter++;
  return {
    name: `Test Vendor ${vendorCounter}`,
    slug: `test-vendor-${vendorCounter}-${Date.now()}`,
    email: `vendor${vendorCounter}@test.com`,
    website: 'https://example.com',
    description: 'A test vendor for unit testing',
    logo: 'https://example.com/logo.png',
    isActive: true,
    ...overrides,
  };
};
```

### User Factory

```typescript
// src/__tests__/factories/user.factory.ts
import type { IUser } from '@/types/user';

let userCounter = 0;

export const createTestUser = (overrides: Partial<IUser> = {}): Partial<IUser> => {
  userCounter++;
  return {
    email: `testuser${userCounter}@example.com`,
    name: `Test User ${userCounter}`,
    role: 'user',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

export const createTestAdmin = (overrides: Partial<IUser> = {}): Partial<IUser> => {
  return createTestUser({
    role: 'admin',
    ...overrides,
  });
};
```

## Authentication Mocking

Mock the auth utilities to control authentication state in tests:

```typescript
// src/__tests__/helpers/auth.mock.ts
import { vi } from 'vitest';
import { checkAdminSession } from '@/database/auth-utils';

// Type for mocked return value
type AdminSession = {
  isAdmin: boolean;
  user: { id: string; email: string; role: string; name?: string };
  session: Record<string, unknown>;
};

/**
 * Mock authenticated admin user
 */
export const mockAdminAuth = () => {
  vi.mocked(checkAdminSession).mockResolvedValue({
    isAdmin: true,
    user: {
      id: 'admin-test-id',
      email: 'admin@test.com',
      role: 'admin',
      name: 'Test Admin',
    },
    session: { id: 'session-123' },
  } as AdminSession);
};

/**
 * Mock authenticated regular user (non-admin)
 */
export const mockUserAuth = () => {
  vi.mocked(checkAdminSession).mockResolvedValue({
    isAdmin: false,
    user: {
      id: 'user-test-id',
      email: 'user@test.com',
      role: 'user',
      name: 'Test User',
    },
    session: { id: 'session-456' },
  } as AdminSession);
};

/**
 * Mock unauthenticated request
 */
export const mockUnauthenticated = () => {
  vi.mocked(checkAdminSession).mockResolvedValue(null);
};

/**
 * Mock custom auth scenario
 */
export const mockCustomAuth = (session: AdminSession | null) => {
  vi.mocked(checkAdminSession).mockResolvedValue(session);
};
```

### Using Auth Mocks in Tests

```typescript
// src/__tests__/api/corridors.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import * as appHandler from '@/app/api/corridors/route';
import { checkAdminSession } from '@/database/auth-utils';
import { mockAdminAuth, mockUserAuth, mockUnauthenticated } from '../helpers/auth.mock';

vi.mock('@/database/auth-utils');

describe('/api/corridors', () => {
  describe('as admin', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('allows creating corridors', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ /* ... */ }),
          });
          expect(res.status).toBe(201);
        },
      });
    });
  });

  describe('as regular user', () => {
    beforeEach(() => {
      mockUserAuth();
    });

    it('forbids creating corridors', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'POST' });
          expect(res.status).toBe(403);
        },
      });
    });
  });

  describe('when not authenticated', () => {
    beforeEach(() => {
      mockUnauthenticated();
    });

    it('returns 401', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          expect(res.status).toBe(401);
        },
      });
    });
  });
});
```

## Mocking External Services

### Mocking S3 Uploads

```typescript
// src/__tests__/helpers/s3.mock.ts
import { vi } from 'vitest';

export const mockS3Service = () => {
  return {
    upload: vi.fn().mockResolvedValue({
      url: 'https://s3.example.com/test-file.json',
      key: 'cables/test-file.json',
    }),
    download: vi.fn().mockResolvedValue({
      Body: Buffer.from(JSON.stringify({ cables: [] })),
    }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
};

// Usage in test
vi.mock('@/lib/Cable-data-Sync/S3Service', () => ({
  S3Service: vi.fn().mockImplementation(() => mockS3Service()),
}));
```

### Mocking Cloudinary

```typescript
// src/__tests__/helpers/cloudinary.mock.ts
import { vi } from 'vitest';

export const mockCloudinaryUpload = () => {
  vi.mock('@/lib/cloudinary', () => ({
    uploadImage: vi.fn().mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test/image.png',
      public_id: 'test-image-123',
    }),
    deleteImage: vi.fn().mockResolvedValue({ result: 'ok' }),
  }));
};
```

### Mocking Email Service (Resend)

```typescript
// src/__tests__/helpers/email.mock.ts
import { vi } from 'vitest';

export const mockEmailService = () => {
  vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({ id: 'email-mock-id' }),
      },
    })),
  }));
};
```

## Database Seeding Helpers

```typescript
// src/__tests__/helpers/seed.ts
import { Corridor } from '@/models/corridor.model';
import { Vendor } from '@/models/vendor.model';
import { createTestCorridor } from '../factories/corridor.factory';
import { createTestVendor } from '../factories/vendor.factory';

/**
 * Seed database with sample corridors
 */
export const seedCorridors = async (count = 5) => {
  const corridors = [];
  for (let i = 0; i < count; i++) {
    const corridor = await Corridor.create(
      createTestCorridor({ title: `Seeded Corridor ${i + 1}` })
    );
    corridors.push(corridor);
  }
  return corridors;
};

/**
 * Seed database with sample vendors
 */
export const seedVendors = async (count = 3) => {
  const vendors = [];
  for (let i = 0; i < count; i++) {
    const vendor = await Vendor.create(
      createTestVendor({ name: `Seeded Vendor ${i + 1}` })
    );
    vendors.push(vendor);
  }
  return vendors;
};

/**
 * Seed a complete test scenario
 */
export const seedFullScenario = async () => {
  const vendors = await seedVendors(3);
  const corridors = await seedCorridors(5);

  // Associate vendors with corridors
  await Corridor.findByIdAndUpdate(corridors[0]._id, {
    vendors: [vendors[0]._id, vendors[1]._id],
  });

  return { vendors, corridors };
};
```

## Request/Response Helpers

```typescript
// src/__tests__/helpers/request.ts

/**
 * Create JSON request body
 */
export const jsonBody = (data: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

/**
 * Assert standard success response
 */
export const expectSuccess = (json: unknown, status = 200) => {
  expect(json).toMatchObject({
    success: true,
  });
};

/**
 * Assert standard error response
 */
export const expectError = (json: unknown, errorPattern?: RegExp) => {
  expect(json).toMatchObject({
    success: false,
  });
  if (errorPattern) {
    expect(json.error).toMatch(errorPattern);
  }
};
```

## Factory Reset Utility

Reset factory counters between test suites if needed:

```typescript
// src/__tests__/helpers/reset.ts
export const resetFactories = () => {
  // Reset counters - import and reset each factory's counter
  // This is optional and usually not needed due to timestamps
};
```

## Common Test Patterns

### Testing with Related Documents

```typescript
it('creates corridor with vendor references', async () => {
  // First create vendors
  const vendor1 = await Vendor.create(createTestVendor());
  const vendor2 = await Vendor.create(createTestVendor());

  // Create corridor with vendor IDs
  const corridorData = createTestCorridor({
    vendors: [vendor1._id, vendor2._id],
  });

  await testApiHandler({
    appHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: 'POST',
        ...jsonBody(corridorData),
      });
      const json = await res.json();

      expect(json.data.vendors).toHaveLength(2);
    },
  });
});
```

### Testing Bulk Operations

```typescript
it('deletes multiple corridors', async () => {
  const corridors = await seedCorridors(3);
  const ids = corridors.map(c => c._id.toString());

  await testApiHandler({
    appHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: 'DELETE',
        ...jsonBody({ ids }),
      });

      expect(res.status).toBe(200);
    },
  });

  // Verify all deleted
  const remaining = await Corridor.countDocuments();
  expect(remaining).toBe(0);
});
```
