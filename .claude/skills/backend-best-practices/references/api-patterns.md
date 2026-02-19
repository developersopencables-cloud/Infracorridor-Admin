# API Patterns Reference

Production-grade API patterns for InfraCorridors.

## Table of Contents
1. [Complete CRUD Route (Dynamic ID)](#complete-crud-route-dynamic-id)
2. [List Route with Pagination](#list-route-with-pagination)
3. [PATCH vs PUT](#patch-vs-put)
4. [Centralized Error Handling](#centralized-error-handling)
5. [Structured Logging](#structured-logging)
6. [Response Transformation](#response-transformation)
7. [Query Parameter Handling](#query-parameter-handling)

## Complete CRUD Route (Dynamic ID)

### File Structure
```
src/app/api/entities/
├── route.ts           # GET (list), POST (create)
└── [id]/
    └── route.ts       # GET (one), PUT, PATCH, DELETE
```

### List & Create (`/api/entities/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import mongoose from 'mongoose';
import connectMongoose from '@/database/mongoose-connection';
import { checkSession, requireRole } from '@/database/auth-utils';
import { EntityModel } from '@/models';
import { createEntitySchema } from '@/validators/entity.validator';
import {
  successResponse,
  validationError,
  conflict,
  unauthorized,
  forbidden,
  serverError,
} from '@/utils/api-response';
import { getPagination, buildPaginationMeta } from '@/utils/pagination';
import { sanitizeSearch } from '@/utils/sanitize';
import { transformDoc, transformDocs } from '@/utils/transform';

// GET /api/entities - List with pagination
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const auth = await checkSession(headersList);

    if (!auth) return unauthorized();
    if (!requireRole(auth, ['admin', 'editor', 'viewer'])) return forbidden();

    await connectMongoose();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPagination(searchParams);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const sanitized = sanitizeSearch(search);
    if (sanitized) {
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      EntityModel.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EntityModel.countDocuments(query),
    ]);

    return successResponse(
      transformDocs(items),
      undefined,
      200,
      { pagination: buildPaginationMeta(page, limit, total) }
    );
  } catch (error) {
    return serverError(error);
  }
}

// POST /api/entities - Create
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const auth = await checkSession(headersList);

    if (!auth) return unauthorized();
    if (!requireRole(auth, ['admin', 'editor'])) return forbidden();

    await connectMongoose();

    const body = await request.json();
    const parsed = createEntitySchema.safeParse(body);

    if (!parsed.success) {
      const err = parsed.error.errors[0];
      return validationError(`${err.path.join('.')}: ${err.message}`);
    }

    const { name, description, relatedIds = [] } = parsed.data;

    // Array safety
    const safeRelatedIds = Array.isArray(relatedIds) ? relatedIds : [];
    const invalidId = safeRelatedIds.find(
      id => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidId) {
      return validationError(`Invalid relatedId: ${invalidId}`);
    }

    // Uniqueness check (for better error message)
    const existing = await EntityModel.findOne({ name: name.trim() }).lean();
    if (existing) {
      return conflict(`Entity with name "${name}" already exists`);
    }

    const doc = await EntityModel.create({
      _id: new mongoose.Types.ObjectId(),
      name: name.trim(),
      description: description?.trim(),
      relatedIds: safeRelatedIds,
    });

    return successResponse(
      transformDoc(doc.toObject()),
      'Entity created successfully',
      201
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return conflict('Entity already exists');
    }
    return serverError(error);
  }
}
```

### Single Item Operations (`/api/entities/[id]/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import mongoose from 'mongoose';
import connectMongoose from '@/database/mongoose-connection';
import { checkSession, requireRole } from '@/database/auth-utils';
import { EntityModel } from '@/models';
import { updateEntitySchema, patchEntitySchema } from '@/validators/entity.validator';
import {
  successResponse,
  noContent,
  validationError,
  notFound,
  conflict,
  unauthorized,
  forbidden,
  serverError,
} from '@/utils/api-response';
import { transformDoc } from '@/utils/transform';

type Params = Promise<{ id: string }>;

// GET /api/entities/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return validationError('Invalid ID format');
    }

    const headersList = await headers();
    const auth = await checkSession(headersList);

    if (!auth) return unauthorized();

    await connectMongoose();

    const doc = await EntityModel.findById(id).lean();
    if (!doc) return notFound('Entity');

    return successResponse(transformDoc(doc));
  } catch (error) {
    return serverError(error);
  }
}

// PUT /api/entities/:id - Full replacement
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return validationError('Invalid ID format');
    }

    const headersList = await headers();
    const auth = await checkSession(headersList);

    if (!auth) return unauthorized();
    if (!requireRole(auth, ['admin', 'editor'])) return forbidden();

    await connectMongoose();

    const body = await request.json();
    const parsed = updateEntitySchema.safeParse(body);

    if (!parsed.success) {
      const err = parsed.error.errors[0];
      return validationError(`${err.path.join('.')}: ${err.message}`);
    }

    const existing = await EntityModel.findById(id);
    if (!existing) return notFound('Entity');

    const { name, description, relatedIds = [], status } = parsed.data;

    // Array safety
    const safeRelatedIds = Array.isArray(relatedIds) ? relatedIds : [];

    // Full replacement - all fields
    const updateData = {
      name: name.trim(),
      description: description?.trim() || '',
      relatedIds: safeRelatedIds,
      status,
    };

    const updated = await EntityModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    return successResponse(transformDoc(updated!), 'Entity updated successfully');
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return conflict('Entity with this name already exists');
    }
    return serverError(error);
  }
}

// PATCH /api/entities/:id - Partial update
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return validationError('Invalid ID format');
    }

    const headersList = await headers();
    const auth = await checkSession(headersList);

    if (!auth) return unauthorized();
    if (!requireRole(auth, ['admin', 'editor'])) return forbidden();

    await connectMongoose();

    const body = await request.json();
    const parsed = patchEntitySchema.safeParse(body);

    if (!parsed.success) {
      const err = parsed.error.errors[0];
      return validationError(`${err.path.join('.')}: ${err.message}`);
    }

    const existing = await EntityModel.findById(id);
    if (!existing) return notFound('Entity');

    // Build partial update (only provided fields)
    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name.trim();
    }
    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description?.trim() || '';
    }
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }
    if (parsed.data.relatedIds !== undefined) {
      const safeIds = Array.isArray(parsed.data.relatedIds)
        ? parsed.data.relatedIds
        : [];
      updateData.relatedIds = safeIds;
    }

    const updated = await EntityModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    return successResponse(transformDoc(updated!), 'Entity updated successfully');
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return conflict('Entity with this name already exists');
    }
    return serverError(error);
  }
}

// DELETE /api/entities/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return validationError('Invalid ID format');
    }

    const headersList = await headers();
    const auth = await checkSession(headersList);

    if (!auth) return unauthorized();
    if (!requireRole(auth, ['admin'])) return forbidden();

    await connectMongoose();

    const existing = await EntityModel.findById(id);
    if (!existing) return notFound('Entity');

    await EntityModel.findByIdAndDelete(id);

    return noContent(); // 204 No Content
  } catch (error) {
    return serverError(error);
  }
}
```

## List Route with Pagination

```typescript
// Full pagination with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Pagination
  const { page, limit, skip } = getPagination(searchParams, { maxLimit: 50 });

  // Filters
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

  const query: Record<string, unknown> = {};

  if (status && status !== 'ALL') query.status = status;
  if (type) query.type = type;

  // Search
  const search = sanitizeSearch(searchParams.get('search'));
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
    ];
  }

  // Execute with count
  const [items, total] = await Promise.all([
    Model.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Model.countDocuments(query),
  ]);

  return successResponse(
    transformDocs(items),
    undefined,
    200,
    { pagination: buildPaginationMeta(page, limit, total) }
  );
}
```

## PATCH vs PUT

### Zod Schemas

```typescript
// Base schema (shared fields)
const entityBaseSchema = z.object({
  name: z.string().min(1).trim(),
  description: z.string().optional(),
  relatedIds: z.array(z.string()).default([]),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

// POST - create (no _id)
export const createEntitySchema = entityBaseSchema;

// PUT - full replacement (all fields required)
export const updateEntitySchema = entityBaseSchema;

// PATCH - partial update (all fields optional)
export const patchEntitySchema = entityBaseSchema.partial();

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
export type PatchEntityInput = z.infer<typeof patchEntitySchema>;
```

### Semantic Difference

| Aspect | PUT | PATCH |
|--------|-----|-------|
| Body | Full resource | Partial fields |
| Missing fields | Reset to defaults | Unchanged |
| Idempotency | Yes | Yes |
| Use case | Replace entire doc | Update specific fields |

## Centralized Error Handling

Create `src/utils/api-response.ts`:

```typescript
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// Types
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Request ID for tracing
const generateRequestId = () => nanoid(10);

// Success responses
export const successResponse = <T>(
  data: T,
  message?: string,
  status = 200,
  meta?: Record<string, unknown>
): NextResponse<SuccessResponse<T>> => {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      meta: { requestId: generateRequestId(), ...meta },
    },
    { status }
  );
};

export const noContent = (): NextResponse => {
  return new NextResponse(null, { status: 204 });
};

// Error responses
export const errorResponse = (
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ErrorResponse> => {
  const reqId = generateRequestId();
  console.error(`[${reqId}] ${code}: ${message}`, details || '');

  const response: ErrorResponse = {
    success: false,
    error: { code, message },
  };

  if (process.env.NODE_ENV === 'development' && details) {
    response.error.details = details;
  }

  return NextResponse.json(response, { status });
};

// Common error helpers
export const validationError = (message: string, details?: unknown) =>
  errorResponse('VALIDATION_ERROR', message, 400, details);

export const unauthorized = () =>
  errorResponse('UNAUTHORIZED', 'Authentication required', 401);

export const forbidden = () =>
  errorResponse('FORBIDDEN', 'Insufficient permissions', 403);

export const notFound = (resource: string) =>
  errorResponse('NOT_FOUND', `${resource} not found`, 404);

export const conflict = (message: string) =>
  errorResponse('CONFLICT', message, 409);

export const rateLimited = () =>
  errorResponse('RATE_LIMITED', 'Too many requests', 429);

export const serverError = (error: unknown) =>
  errorResponse(
    'SERVER_ERROR',
    error instanceof Error ? error.message : 'Internal server error',
    500,
    error
  );
```

## Structured Logging

```typescript
// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  duration?: number;
  [key: string]: unknown;
}

const formatLog = (level: LogLevel, message: string, context: LogContext) => {
  const timestamp = new Date().toISOString();
  const contextStr = Object.entries(context)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(' ');
  return `[${timestamp}] ${level.toUpperCase()} ${message} ${contextStr}`;
};

export const logger = {
  debug: (message: string, context: LogContext = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatLog('debug', message, context));
    }
  },
  info: (message: string, context: LogContext = {}) => {
    console.info(formatLog('info', message, context));
  },
  warn: (message: string, context: LogContext = {}) => {
    console.warn(formatLog('warn', message, context));
  },
  error: (message: string, context: LogContext = {}) => {
    console.error(formatLog('error', message, context));
  },
};

// Usage in route
export async function POST(request: NextRequest) {
  const requestId = nanoid(10);
  const startTime = Date.now();

  try {
    // ... handler logic

    logger.info('Entity created', {
      requestId,
      method: 'POST',
      path: '/api/entities',
      duration: Date.now() - startTime,
    });

    return successResponse(data);
  } catch (error) {
    logger.error('Failed to create entity', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return serverError(error);
  }
}
```

## Response Transformation

Create `src/utils/transform.ts`:

```typescript
// Transform single document
export const transformDoc = <T extends { _id: unknown; __v?: number }>(
  doc: T
): Omit<T, '_id' | '__v'> & { id: string } => {
  const { _id, __v, ...rest } = doc;
  return {
    id: String(_id),
    ...rest,
  };
};

// Transform array of documents
export const transformDocs = <T extends { _id: unknown; __v?: number }>(
  docs: T[]
): Array<Omit<T, '_id' | '__v'> & { id: string }> => {
  return docs.map(transformDoc);
};

// Transform with field selection
export const transformDocWithFields = <
  T extends { _id: unknown; __v?: number },
  K extends keyof Omit<T, '_id' | '__v'>
>(
  doc: T,
  fields: K[]
): Pick<Omit<T, '_id' | '__v'>, K> & { id: string } => {
  const { _id } = doc;
  const result: Record<string, unknown> = { id: String(_id) };

  for (const field of fields) {
    if (field in doc) {
      result[field as string] = doc[field];
    }
  }

  return result as Pick<Omit<T, '_id' | '__v'>, K> & { id: string };
};
```

## Query Parameter Handling

```typescript
// src/utils/query-params.ts

// Parse enum param with validation
export const parseEnumParam = <T extends string>(
  value: string | null,
  validValues: readonly T[],
  defaultValue: T
): T => {
  if (!value) return defaultValue;
  return validValues.includes(value as T) ? (value as T) : defaultValue;
};

// Parse boolean param
export const parseBooleanParam = (
  value: string | null,
  defaultValue = false
): boolean => {
  if (!value) return defaultValue;
  return value === 'true' || value === '1';
};

// Parse numeric param with bounds
export const parseNumericParam = (
  value: string | null,
  defaultValue: number,
  min?: number,
  max?: number
): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return defaultValue;

  let result = parsed;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
};

// Parse date param
export const parseDateParam = (value: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Parse sort param
export const parseSortParam = (
  value: string | null,
  allowedFields: string[],
  defaultField: string
): { field: string; order: 1 | -1 } => {
  if (!value) return { field: defaultField, order: -1 };

  const desc = value.startsWith('-');
  const field = desc ? value.slice(1) : value;

  return {
    field: allowedFields.includes(field) ? field : defaultField,
    order: desc ? -1 : 1,
  };
};
```
