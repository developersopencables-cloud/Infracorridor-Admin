# Test Setup Guide

## Installation

Install the required dev dependencies:

```bash
npm install -D vitest @vitest/coverage-v8 mongodb-memory-server next-test-api-route-handler
```

## Vitest Configuration

Create `vitest.config.ts` in the project root:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        '.next',
        'src/__tests__',
        '**/*.d.ts',
        'vitest.config.ts',
      ],
    },
    testTimeout: 30000, // MongoDB memory server can be slow to start
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Global Setup File

Create `src/__tests__/setup.ts`:

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose to in-memory database
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Clean up connections
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // Clear all mocks
  vi.clearAllMocks();
});
```

## TypeScript Configuration

Ensure `tsconfig.json` includes the test directory:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "vitest.config.ts"]
}
```

Or create a separate `tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

## Directory Structure

After setup, your test directories should look like:

```
src/
├── __tests__/
│   ├── setup.ts              # Global test setup
│   ├── factories/            # Test data factories
│   │   ├── corridor.factory.ts
│   │   ├── vendor.factory.ts
│   │   └── user.factory.ts
│   ├── helpers/              # Test utilities
│   │   └── auth.mock.ts
│   └── api/                  # Integration tests
│       ├── corridors.integration.test.ts
│       └── vendors.integration.test.ts
├── validators/
│   └── corridor.validator.unit.test.ts
└── utils/
    └── validation.unit.test.ts
```

## Verifying Setup

Create a simple test to verify the setup works:

```typescript
// src/__tests__/setup.test.ts
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

describe('Test Setup', () => {
  it('connects to in-memory MongoDB', () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  it('has empty collections', async () => {
    const collections = Object.keys(mongoose.connection.collections);
    for (const name of collections) {
      const count = await mongoose.connection.collections[name].countDocuments();
      expect(count).toBe(0);
    }
  });
});
```

Run `npm test` to verify everything is configured correctly.

## Troubleshooting

### MongoDB Memory Server Download Issues

If you see download errors, you can configure a custom MongoDB version:

```typescript
// src/__tests__/setup.ts
mongoServer = await MongoMemoryServer.create({
  binary: {
    version: '6.0.4', // Use a specific version
  },
});
```

### Path Alias Issues

If `@/` imports don't resolve, ensure Vitest config has the correct alias and that it matches `tsconfig.json` paths.

### Slow Test Startup

MongoDB Memory Server downloads the binary on first run. Subsequent runs use the cached binary. If tests are still slow, consider increasing `testTimeout` in `vitest.config.ts`.
