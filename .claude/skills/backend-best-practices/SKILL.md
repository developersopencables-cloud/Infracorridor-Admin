---
name: backend-best-practices
description: Backend development for Next.js 16 API routes with MongoDB/Mongoose. Use when creating or modifying API endpoints, Mongoose models, Zod validators, or database operations. Enforces strict data integrity rules, retry-safe operations, schema-validator parity, RESTful patterns, and production-grade error handling.
---

# Backend Development Guide

This skill enforces production-grade backend patterns for InfraCorridors.

## Core Rules (Non-Negotiable)

### 1. ID Ownership
- Client must NEVER send `_id` in POST requests
- Server generates all document IDs using `new mongoose.Types.ObjectId()`
- Never use `randomUUID()` for Mongo documents

### 2. Schema-API Contract Parity
- Optional in API → optional in Mongoose schema
- Required in schema → enforced in POST/PUT validation
- Zod schema MUST mirror Mongoose schema exactly

### 3. Single Source of Truth
- Never store duplicate or derivable state
- Forbidden: `status` + `isPublished` together
- Compute derived data at read time

### 4. Timestamps
- Always use `timestamps: true` in Mongoose schemas
- Never manually set `createdAt` or `updatedAt`
- Never use pre-save hooks for timestamps

### 5. Type-Based Field Cleanup
When type changes (e.g., `city-to-city` → `country-to-country`):
- Remove all incompatible fields
- Set cleared fields to `undefined` explicitly
- No hybrid/zombie documents allowed

### 6. Array Safety (Critical)
```typescript
const safeVendorIds = Array.isArray(vendorIds) ? vendorIds : [];
const invalidId = safeVendorIds.find(id => !mongoose.Types.ObjectId.isValid(id));
if (invalidId) {
  return errorResponse('INVALID_ID', `Invalid ID: ${invalidId}`, 400);
}
```

### 7. Unique Constraints
- **Primary guarantee**: Database unique indexes
- **Secondary check**: `findOne()` before create (for better error messages)
- Return 409 Conflict for duplicates
- Catch Mongo error code 11000

### 8. HTTP Method Semantics
| Method | Purpose | ID Location | Body |
|--------|---------|-------------|------|
| GET | Read | Path param `/entities/:id` | None |
| POST | Create | None (server generates) | Full resource |
| PUT | Full replace | Path param | Full resource |
| PATCH | Partial update | Path param | Partial fields |
| DELETE | Remove | Path param | None |

### 9. Read-Only GET
- Never fix or normalize bad data in GET
- GET reflects stored state only
- If normalization needed → write migration

### 10. Backend Authority
- Backend is final authority on business logic
- Never rely on frontend correctness
- All validation enforced server-side

### 11. RESTful Patterns
- Enforce plural resource names for REST endpoints (e.g., /entities not /entity).
- Include HTTP cache headers (ETag, Cache-Control) on GET list/detail endpoints.
- Standardize structured logging (with request ID, route, user) instead of just console logs.
- Separate controller logic from business/service logic in code structure.
- Expose a health check endpoint (e.g., /health) for monitoring.
- Emit basic metrics (latency, error rates) for services.

### common rules
- Document and test all validation edge cases, including missing fields, wrong types, and extra unexpected fields.
- Define expected HTTP error codes for edge conditions (404 not found, 400 bad request, 409 conflict).
- Include edge case tests for auth failures (missing token, expired token, insufficient role).
- Test rate limit enforcement and appropriate 429 responses.
- Verify behavior for boundary conditions like empty arrays, very large inputs, and pagination limits.
- Write test scenarios for concurrent requests and duplicate submissions (idempotency).
- Ensure tests cover DB failures and handle them gracefully.

## RESTful Route Patterns

Use ID in path, not query params:
```
GET    /api/entities          # List all
GET    /api/entities/:id      # Get one
POST   /api/entities          # Create
PUT    /api/entities/:id      # Full update
PATCH  /api/entities/:id      # Partial update
DELETE /api/entities/:id      # Delete (returns 204)
```

## Standard Response Envelope

```typescript
// Success response
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    pagination?: PaginationMeta;
    requestId?: string;
  };
}

// Error response
interface ErrorResponse {
  success: false;
  error: {
    code: string;        // Machine-readable: 'VALIDATION_ERROR', 'NOT_FOUND'
    message: string;     // Human-readable description
    details?: unknown;   // Additional context (dev only)
  };
}

// Pagination meta
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

## Response Transformation

Always transform Mongoose docs before returning:
```typescript
// Transform _id to id, exclude internal fields
const transformDoc = <T extends { _id: unknown; __v?: number }>(
  doc: T
): Omit<T, '_id' | '__v'> & { id: string } => {
  const { _id, __v, ...rest } = doc;
  return { id: String(_id), ...rest };
};

// Usage
const doc = await Model.findById(id).lean();
return successResponse(transformDoc(doc));
```

## Error Handling Utilities

Create `src/utils/api-response.ts`:
```typescript
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

const requestId = () => nanoid(10);

export const successResponse = <T>(
  data: T,
  message?: string,
  status = 200,
  meta?: Record<string, unknown>
) => {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      meta: { requestId: requestId(), ...meta },
    },
    { status }
  );
};

export const errorResponse = (
  code: string,
  message: string,
  status: number,
  details?: unknown
) => {
  const response: ErrorResponse = {
    success: false,
    error: { code, message },
  };
  if (process.env.NODE_ENV === 'development' && details) {
    response.error.details = details;
  }
  console.error(`[${requestId()}] ${code}: ${message}`, details);
  return NextResponse.json(response, { status });
};

// Common error responses
export const notFound = (resource: string) =>
  errorResponse('NOT_FOUND', `${resource} not found`, 404);

export const unauthorized = () =>
  errorResponse('UNAUTHORIZED', 'Authentication required', 401);

export const forbidden = () =>
  errorResponse('FORBIDDEN', 'Insufficient permissions', 403);

export const conflict = (message: string) =>
  errorResponse('CONFLICT', message, 409);

export const validationError = (message: string) =>
  errorResponse('VALIDATION_ERROR', message, 400);

export const serverError = (error: unknown) =>
  errorResponse(
    'SERVER_ERROR',
    error instanceof Error ? error.message : 'Internal server error',
    500,
    error
  );
```

## Role-Based Authorization

```typescript
// src/database/auth-utils.ts
type Role = 'user' | 'admin' | 'editor' | 'viewer';

interface AuthResult {
  userId: string;
  role: Role;
  isAdmin: boolean;
}

export const checkSession = async (
  headersList: Headers
): Promise<AuthResult | null> => {
  // ... session verification
};

export const requireRole = (
  auth: AuthResult | null,
  allowedRoles: Role[]
): boolean => {
  if (!auth) return false;
  return allowedRoles.includes(auth.role);
};

// Usage in route
const auth = await checkSession(headersList);
if (!requireRole(auth, ['admin', 'editor'])) {
  return forbidden();
}
```

## Input Sanitization

```typescript
// src/utils/sanitize.ts

// Escape regex special characters
export const sanitizeSearch = (input: string | null): string => {
  if (!input) return '';
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
};

// Sanitize for MongoDB queries (prevent injection)
export const sanitizeQuery = (obj: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = value.replace(/[$]/g, '');
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeQuery(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Validate and sanitize ObjectId
export const sanitizeObjectId = (id: string): string | null => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return id.trim();
};
```

## Pagination Helper

```typescript
// src/utils/pagination.ts
interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export const getPagination = (searchParams: URLSearchParams, options: PaginationOptions = {}) => {
  const { maxLimit = 100 } = options;

  let page = parseInt(searchParams.get('page') || '1', 10);
  let limit = parseInt(searchParams.get('limit') || '20', 10);

  page = Math.max(1, page);
  limit = Math.min(Math.max(1, limit), maxLimit);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});
```

## Transactions for Multi-Collection Writes

```typescript
export async function createWithRelations(data: CreateInput) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const [entity] = await EntityModel.create(
      [{ _id: new mongoose.Types.ObjectId(), ...data }],
      { session }
    );

    await RelatedModel.updateMany(
      { _id: { $in: data.relatedIds } },
      { $push: { entityIds: entity._id } },
      { session }
    );

    await session.commitTransaction();
    return entity;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

## Rate Limiting

```typescript
// src/utils/rate-limit.ts
import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  interval: number;  // ms
  limit: number;
}

export const rateLimit = (options: RateLimitOptions) => {
  const cache = new LRUCache<string, number[]>({
    max: 500,
    ttl: options.interval,
  });

  return {
    check: (key: string): { allowed: boolean; remaining: number } => {
      const now = Date.now();
      const timestamps = cache.get(key) || [];
      const valid = timestamps.filter(t => now - t < options.interval);

      if (valid.length >= options.limit) {
        return { allowed: false, remaining: 0 };
      }

      valid.push(now);
      cache.set(key, valid);
      return { allowed: true, remaining: options.limit - valid.length };
    },
  };
};

// Usage
const limiter = rateLimit({ interval: 60000, limit: 100 });

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { allowed, remaining } = limiter.check(ip);

  if (!allowed) {
    return errorResponse('RATE_LIMITED', 'Too many requests', 429);
  }
  // ...
}
```

## Environment Validation

```typescript
// src/utils/env.ts
import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().url(),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
});

export const validateEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment validation failed:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};

// Call at app startup
validateEnv();
```

## HTTP Status Codes

| Code | When to Use |
|------|-------------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (created) |
| 204 | Successful DELETE (no content) |
| 400 | Validation error, malformed request |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate, uniqueness violation) |
| 429 | Rate limit exceeded |
| 500 | Server error |

## Validation Checklist

- [ ] ID in path for GET/:id, PUT, PATCH, DELETE
- [ ] No `_id` accepted in POST body
- [ ] Unique DB indexes defined (true uniqueness guarantee)
- [ ] All arrays coerced with `Array.isArray()` fallback
- [ ] All ObjectId arrays validated
- [ ] 409 returned for duplicates + Mongo 11000 caught
- [ ] Zod validation at API boundary
- [ ] Response transformed: `_id` → `id`, no `__v`
- [ ] Standard response envelope used
- [ ] Role-based auth checked (not just admin)
- [ ] Input sanitized (regex, query injection)
- [ ] DELETE returns 204 No Content
- [ ] Transactions used for multi-collection writes
- [ ] Rate limiting on mutation endpoints

## References

- **API Patterns**: See [references/api-patterns.md](references/api-patterns.md)
- **Schema Patterns**: See [references/schema-patterns.md](references/schema-patterns.md)
- **Middleware**: See [references/middleware.md](references/middleware.md)
