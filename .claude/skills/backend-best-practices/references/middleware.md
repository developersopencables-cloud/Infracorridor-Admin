# Middleware & Utilities Reference

Production middleware patterns for InfraCorridors.

## Table of Contents
1. [Rate Limiting](#rate-limiting)
2. [Request Validation Wrapper](#request-validation-wrapper)
3. [Auth Middleware](#auth-middleware)
4. [Environment Validation](#environment-validation)
5. [Database Transactions](#database-transactions)
6. [Input Sanitization](#input-sanitization)

## Rate Limiting

### LRU-Based Rate Limiter

```typescript
// src/utils/rate-limit.ts
import { LRUCache } from 'lru-cache';

interface RateLimitConfig {
  interval: number;     // Time window in ms
  limit: number;        // Max requests per window
  keyPrefix?: string;   // Optional prefix for keys
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export const createRateLimiter = (config: RateLimitConfig) => {
  const { interval, limit, keyPrefix = '' } = config;

  const cache = new LRUCache<string, { count: number; resetAt: number }>({
    max: 10000,
    ttl: interval,
  });

  return {
    check: (identifier: string): RateLimitResult => {
      const key = `${keyPrefix}${identifier}`;
      const now = Date.now();
      const record = cache.get(key);

      if (!record || now >= record.resetAt) {
        // New window
        cache.set(key, { count: 1, resetAt: now + interval });
        return { allowed: true, remaining: limit - 1, resetAt: now + interval };
      }

      if (record.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: record.resetAt };
      }

      record.count += 1;
      cache.set(key, record);
      return {
        allowed: true,
        remaining: limit - record.count,
        resetAt: record.resetAt,
      };
    },

    reset: (identifier: string): void => {
      cache.delete(`${keyPrefix}${identifier}`);
    },
  };
};

// Pre-configured limiters
export const apiLimiter = createRateLimiter({
  interval: 60 * 1000,  // 1 minute
  limit: 100,
  keyPrefix: 'api:',
});

export const authLimiter = createRateLimiter({
  interval: 15 * 60 * 1000,  // 15 minutes
  limit: 5,
  keyPrefix: 'auth:',
});

export const uploadLimiter = createRateLimiter({
  interval: 60 * 60 * 1000,  // 1 hour
  limit: 20,
  keyPrefix: 'upload:',
});
```

### Rate Limit Middleware Usage

```typescript
import { NextRequest } from 'next/server';
import { apiLimiter, authLimiter } from '@/utils/rate-limit';
import { rateLimited } from '@/utils/api-response';

// Get client identifier
const getClientId = (request: NextRequest): string => {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
};

// Check rate limit
const checkRateLimit = (request: NextRequest, limiter = apiLimiter) => {
  const clientId = getClientId(request);
  const result = limiter.check(clientId);

  if (!result.allowed) {
    return rateLimited();
  }

  return null; // Allowed
};

// Usage in route
export async function POST(request: NextRequest) {
  const rateLimitError = checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  // ... rest of handler
}

// Stricter limit for auth endpoints
export async function POST(request: NextRequest) {
  const rateLimitError = checkRateLimit(request, authLimiter);
  if (rateLimitError) return rateLimitError;

  // ... login logic
}
```

## Request Validation Wrapper

### Higher-Order Route Handler

```typescript
// src/utils/route-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ZodSchema, ZodError } from 'zod';
import connectMongoose from '@/database/mongoose-connection';
import { checkSession, requireRole, AuthResult, Role } from '@/database/auth-utils';
import {
  validationError,
  unauthorized,
  forbidden,
  serverError,
} from '@/utils/api-response';
import { apiLimiter } from '@/utils/rate-limit';

interface RouteConfig<TBody = unknown> {
  // Authentication
  requireAuth?: boolean;
  allowedRoles?: Role[];

  // Rate limiting
  rateLimit?: boolean;

  // Validation
  bodySchema?: ZodSchema<TBody>;

  // Database
  connectDb?: boolean;
}

interface RouteContext<TBody = unknown> {
  request: NextRequest;
  auth: AuthResult | null;
  body: TBody;
  params: Record<string, string>;
}

type RouteHandler<TBody = unknown> = (
  context: RouteContext<TBody>
) => Promise<NextResponse>;

export const createRouteHandler = <TBody = unknown>(
  config: RouteConfig<TBody>,
  handler: RouteHandler<TBody>
) => {
  return async (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      // Rate limiting
      if (config.rateLimit !== false) {
        const clientId =
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          'unknown';
        const result = apiLimiter.check(clientId);
        if (!result.allowed) {
          return NextResponse.json(
            { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
            { status: 429 }
          );
        }
      }

      // Authentication
      let auth: AuthResult | null = null;
      if (config.requireAuth !== false) {
        const headersList = await headers();
        auth = await checkSession(headersList);

        if (!auth) return unauthorized();

        if (config.allowedRoles && !requireRole(auth, config.allowedRoles)) {
          return forbidden();
        }
      }

      // Database connection
      if (config.connectDb !== false) {
        await connectMongoose();
      }

      // Body validation
      let body: TBody = {} as TBody;
      if (config.bodySchema) {
        const rawBody = await request.json();
        const parsed = config.bodySchema.safeParse(rawBody);
        if (!parsed.success) {
          const err = parsed.error.errors[0];
          return validationError(`${err.path.join('.')}: ${err.message}`);
        }
        body = parsed.data;
      }

      // Execute handler
      const resolvedParams = await params;
      return await handler({ request, auth, body, params: resolvedParams });

    } catch (error) {
      if (error instanceof ZodError) {
        return validationError(error.errors[0].message);
      }
      return serverError(error);
    }
  };
};
```

### Usage Example

```typescript
import { createRouteHandler } from '@/utils/route-handler';
import { createEntitySchema } from '@/validators/entity.validator';
import { successResponse, conflict } from '@/utils/api-response';

export const POST = createRouteHandler(
  {
    requireAuth: true,
    allowedRoles: ['admin', 'editor'],
    bodySchema: createEntitySchema,
    rateLimit: true,
  },
  async ({ body, auth }) => {
    // body is already validated and typed
    const { name, description } = body;

    const existing = await EntityModel.findOne({ name }).lean();
    if (existing) {
      return conflict(`Entity "${name}" already exists`);
    }

    const doc = await EntityModel.create({
      _id: new mongoose.Types.ObjectId(),
      ...body,
      createdBy: auth?.userId,
    });

    return successResponse(transformDoc(doc.toObject()), 'Created', 201);
  }
);
```

## Auth Middleware

### Role-Based Access Control

```typescript
// src/database/auth-utils.ts
import { auth } from '@/database/auth';
import { headers as getHeaders } from 'next/headers';

export type Role = 'user' | 'admin' | 'editor' | 'viewer';

export interface AuthResult {
  userId: string;
  email: string;
  role: Role;
  isAdmin: boolean;
}

export const checkSession = async (
  headersList: Awaited<ReturnType<typeof getHeaders>>
): Promise<AuthResult | null> => {
  try {
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user) return null;

    const role = (session.user.role as Role) || 'user';

    return {
      userId: session.user.id,
      email: session.user.email,
      role,
      isAdmin: role === 'admin',
    };
  } catch {
    return null;
  }
};

export const requireRole = (
  auth: AuthResult | null,
  allowedRoles: Role[]
): boolean => {
  if (!auth) return false;
  return allowedRoles.includes(auth.role);
};

// Shorthand for admin-only
export const checkAdminSession = async (
  headersList: Awaited<ReturnType<typeof getHeaders>>
): Promise<AuthResult | null> => {
  const auth = await checkSession(headersList);
  if (!auth?.isAdmin) return null;
  return auth;
};

// Permission matrix helper
const PERMISSIONS: Record<string, Role[]> = {
  'corridors:read': ['admin', 'editor', 'viewer', 'user'],
  'corridors:write': ['admin', 'editor'],
  'corridors:delete': ['admin'],
  'users:read': ['admin'],
  'users:write': ['admin'],
  'sync:execute': ['admin'],
};

export const hasPermission = (auth: AuthResult | null, permission: string): boolean => {
  if (!auth) return false;
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(auth.role);
};
```

## Environment Validation

```typescript
// src/utils/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // App
  NEXT_PUBLIC_BASE_URL: z.string().url('Invalid NEXT_PUBLIC_BASE_URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // AWS
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().min(1, 'AWS_S3_BUCKET is required'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // Email
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),

  // Auth (optional based on provider)
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export const validateEnv = (): Env => {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map(e => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error(`Environment validation failed:\n${errors}`);
    throw new Error('Invalid environment configuration');
  }

  cachedEnv = result.data;
  return cachedEnv;
};

// Type-safe env access
export const env = (): Env => validateEnv();

// Usage
// import { env } from '@/utils/env';
// const dbUri = env().MONGODB_URI;
```

## Database Transactions

```typescript
// src/utils/transaction.ts
import mongoose, { ClientSession } from 'mongoose';

type TransactionCallback<T> = (session: ClientSession) => Promise<T>;

export const withTransaction = async <T>(
  callback: TransactionCallback<T>
): Promise<T> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await callback(session);

    await session.commitTransaction();
    return result;

  } catch (error) {
    await session.abortTransaction();
    throw error;

  } finally {
    session.endSession();
  }
};

// Usage example
export async function createCorridorWithVendors(data: CreateCorridorInput) {
  return withTransaction(async (session) => {
    // Create corridor
    const [corridor] = await CorridorModel.create(
      [{
        _id: new mongoose.Types.ObjectId(),
        ...data,
      }],
      { session }
    );

    // Update vendor references
    if (data.vendorIds?.length) {
      await VendorModel.updateMany(
        { _id: { $in: data.vendorIds } },
        { $push: { corridorIds: corridor._id } },
        { session }
      );
    }

    // Create audit log
    await AuditLogModel.create(
      [{
        action: 'CREATE',
        entityType: 'Corridor',
        entityId: corridor._id,
        userId: data.createdBy,
      }],
      { session }
    );

    return corridor;
  });
}
```

### Retry Logic for Transactions

```typescript
export const withRetryableTransaction = async <T>(
  callback: TransactionCallback<T>,
  maxRetries = 3
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(callback);
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable (transient)
      const isTransient =
        error instanceof Error &&
        (error.message.includes('WriteConflict') ||
         error.message.includes('TransientTransactionError'));

      if (!isTransient || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 100)
      );
    }
  }

  throw lastError;
};
```

## Input Sanitization

```typescript
// src/utils/sanitize.ts
import mongoose from 'mongoose';

// Escape regex special characters
export const sanitizeSearch = (input: string | null): string => {
  if (!input) return '';
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
};

// Remove MongoDB operators from user input
export const sanitizeMongoQuery = <T extends Record<string, unknown>>(
  obj: T
): T => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip keys starting with $
    if (key.startsWith('$')) continue;

    if (typeof value === 'string') {
      // Remove $ from string values
      result[key] = value.replace(/[$]/g, '');
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeMongoQuery(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeMongoQuery(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
};

// Validate and sanitize ObjectId
export const sanitizeObjectId = (id: string | null | undefined): string | null => {
  if (!id) return null;
  const trimmed = id.trim();
  return mongoose.Types.ObjectId.isValid(trimmed) ? trimmed : null;
};

// Sanitize array of ObjectIds
export const sanitizeObjectIdArray = (ids: unknown): string[] => {
  if (!Array.isArray(ids)) return [];
  return ids
    .map(id => (typeof id === 'string' ? sanitizeObjectId(id) : null))
    .filter((id): id is string => id !== null);
};

// Sanitize HTML (basic XSS prevention for text fields)
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Sanitize URL
export const sanitizeUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};
```
