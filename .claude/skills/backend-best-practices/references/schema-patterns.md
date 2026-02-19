# Schema & Validator Patterns

Mongoose and Zod patterns for InfraCorridors.

## Table of Contents
1. [Mongoose Schema Patterns](#mongoose-schema-patterns)
2. [Zod Validator Patterns](#zod-validator-patterns)
3. [Schema-Zod Parity Examples](#schema-zod-parity-examples)
4. [Embedded Documents](#embedded-documents)
5. [Index Strategies](#index-strategies)

## Mongoose Schema Patterns

### Basic Model Structure

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface EntityDocument extends Document<Types.ObjectId> {
  // Required fields
  name: string;
  slug: string;

  // Optional fields
  description?: string;
  logoUrl?: string;

  // Array references
  relatedIds: Types.ObjectId[];

  // Enum field
  status: 'ACTIVE' | 'INACTIVE';

  // Nested object
  metadata?: {
    source?: string;
    version?: number;
  };

  // Timestamps (auto-managed)
  createdAt: Date;
  updatedAt: Date;
}

const EntitySchema = new Schema<EntityDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    logoUrl: {
      type: String,
      required: false,
    },
    relatedIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Related',
      required: false,
      default: [],  // ALWAYS default arrays
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    metadata: {
      type: new Schema(
        {
          source: { type: String, required: false },
          version: { type: Number, required: false },
        },
        { _id: false }
      ),
      required: false,
    },
  },
  {
    timestamps: true,  // ALWAYS use this
  }
);

// Compound indexes for common queries
EntitySchema.index({ status: 1, updatedAt: -1 });
EntitySchema.index({ name: 'text', description: 'text' });

// Hot reload fix for development
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Entity;
}

export const EntityModel =
  mongoose.models.Entity || mongoose.model<EntityDocument>('Entity', EntitySchema);
```

### Array Field Patterns

```typescript
// Simple array of primitives
tags: {
  type: [String],
  required: false,
  default: [],
}

// Array of ObjectId references
vendorIds: {
  type: [Schema.Types.ObjectId],
  ref: 'Vendor',
  required: false,
  default: [],
}

// Array of embedded documents
items: {
  type: [{
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    _id: false,  // Disable auto _id for subdocs
  }],
  required: false,
  default: [],
}
```

### Enum Field Patterns

```typescript
// Simple enum with default
status: {
  type: String,
  enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  default: 'DRAFT',
  index: true,
}

// Type discriminator (affects other fields)
type: {
  type: String,
  enum: ['city-to-city', 'country-to-country'],
  required: true,
  default: 'city-to-city',
}
```

## Zod Validator Patterns

### Basic Validators

```typescript
import { z } from 'zod';

// String validations
const nameSchema = z.string().min(1, 'Name is required').trim();
const slugSchema = z.string().min(1).regex(/^[a-z0-9-]+$/, 'Invalid slug format');
const urlSchema = z.string().url('Invalid URL').optional().or(z.literal(''));
const emailSchema = z.string().email('Invalid email');

// Number validations
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const percentage = z.number().min(0).max(100);

// Array validations
const objectIdArray = z
  .array(z.string().min(1))
  .default([])
  .transform(ids => ids.filter(id => id.trim()));
```

### Create vs Update Schemas

```typescript
// Base fields (shared)
const entityBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().optional(),
  relatedIds: z.array(z.string()).default([]),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

// Create schema - no _id
export const createEntitySchema = entityBaseSchema;

// Update schema - requires _id
export const updateEntitySchema = entityBaseSchema.extend({
  _id: z.string().min(1, 'ID is required'),
});

// Partial update schema - all fields optional except _id
export const patchEntitySchema = entityBaseSchema.partial().extend({
  _id: z.string().min(1, 'ID is required'),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
export type PatchEntityInput = z.infer<typeof patchEntitySchema>;
```

### Conditional Validation

```typescript
// Type-dependent validation
const corridorSchema = z
  .object({
    type: z.enum(['city-to-city', 'country-to-country']),
    fromCity: z.string().optional(),
    toCity: z.string().optional(),
    fromCountry: z.string().optional(),
    toCountry: z.string().optional(),
  })
  .refine(
    data => {
      if (data.type === 'city-to-city') {
        return data.fromCity && data.toCity;
      }
      return data.fromCountry && data.toCountry;
    },
    {
      message: 'Required location fields missing for selected type',
    }
  );
```

### Nested Object Validation

```typescript
const sponsorSchema = z
  .object({
    carrierName: z.string().optional(),
    companyName: z.string().optional(),
    logoUrl: z.string().url().optional().or(z.literal('')),
    websiteUrl: z.string().url().optional().or(z.literal('')),
    bannerUrl: z.string().url().optional().or(z.literal('')),
  })
  .optional()
  .nullable();

const subseaSystemSchema = z.object({
  cableId: z.string().min(1, 'Cable ID required'),
  name: z.string().min(1, 'Name required'),
  imageUrl: z.string().url().optional(),
});

const corridorSchema = z.object({
  // ... other fields
  sponsor: sponsorSchema,
  subseaSystems: z.array(subseaSystemSchema).default([]),
});
```

## Schema-Zod Parity Examples

### Required Alignment

| Mongoose | Zod | Notes |
|----------|-----|-------|
| `required: true` | `.min(1)` or no `.optional()` | Both enforce presence |
| `required: false` | `.optional()` | Both allow absence |
| `default: 'value'` | `.default('value')` | Same default |
| `default: []` | `.default([])` | Array defaults |

### Correct Parity

```typescript
// Mongoose
const Schema = new Schema({
  name: { type: String, required: true },           // Required
  description: { type: String, required: false },   // Optional
  tags: { type: [String], default: [] },            // Optional array with default
  status: { type: String, enum: ['A', 'B'], default: 'A' },
});

// Zod (matches Mongoose)
const zodSchema = z.object({
  name: z.string().min(1),                          // Required
  description: z.string().optional(),               // Optional
  tags: z.array(z.string()).default([]),            // Optional array with default
  status: z.enum(['A', 'B']).default('A'),          // Enum with default
});
```

### Incorrect Parity (AVOID)

```typescript
// BAD: Mongoose required but Zod optional
// Mongoose: required: true
// Zod: .optional()  // WRONG - allows undefined

// BAD: Mongoose optional but Zod required
// Mongoose: required: false
// Zod: .min(1)  // WRONG - rejects undefined

// BAD: Different defaults
// Mongoose: default: 'ACTIVE'
// Zod: .default('DRAFT')  // WRONG - inconsistent
```

## Embedded Documents

### Mongoose Embedded Schema

```typescript
const AddressSchema = new Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String, required: false },
  },
  { _id: false }  // Disable auto _id for embedded docs
);

const PersonSchema = new Schema({
  name: { type: String, required: true },
  address: { type: AddressSchema, required: false },
});
```

### Zod Equivalent

```typescript
const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  postalCode: z.string().optional(),
});

const personSchema = z.object({
  name: z.string().min(1),
  address: addressSchema.optional(),
});
```

## Index Strategies

### When to Index

```typescript
// Single field index - for frequent equality queries
name: { type: String, index: true }

// Unique index - PRIMARY uniqueness guarantee
slug: { type: String, unique: true, index: true }

// Compound index - for multi-field queries
Schema.index({ status: 1, updatedAt: -1 });

// Compound unique index - for multi-field uniqueness
Schema.index({ tenantId: 1, email: 1 }, { unique: true });

// Text index - for full-text search
Schema.index({ name: 'text', description: 'text' });

// Sparse index - only index documents with this field
Schema.index({ externalId: 1 }, { sparse: true, unique: true });

// TTL index - auto-expire documents
Schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### Index Best Practices

1. **Unique indexes are the PRIMARY uniqueness guarantee** - `findOne()` checks are secondary
2. Index fields used in `findOne()` and frequent filters
3. Use compound indexes for queries with multiple conditions
4. Put high-cardinality fields first in compound indexes
5. Avoid indexing fields with low cardinality (boolean flags)
6. Use sparse indexes for optional unique fields
7. Unique indexes automatically enforce constraint at DB level

### Unique Index Patterns

```typescript
// Simple unique field
const EntitySchema = new Schema({
  slug: {
    type: String,
    required: true,
    unique: true,  // Creates unique index
    index: true,
  },
});

// Compound unique (multi-tenant)
const UserSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true },
  email: { type: String, required: true },
});
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Partial unique (only active records)
const InviteSchema = new Schema({
  email: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired'] },
});
InviteSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

// Case-insensitive unique
const CategorySchema = new Schema({
  name: { type: String, required: true },
});
CategorySchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 },
  }
);
```

### Handling Unique Constraint Errors

```typescript
// In API route
try {
  await Model.create(data);
} catch (error) {
  // Check for duplicate key error
  if ((error as { code?: number }).code === 11000) {
    // Extract which field caused the conflict
    const keyValue = (error as { keyValue?: Record<string, unknown> }).keyValue;
    const field = keyValue ? Object.keys(keyValue)[0] : 'field';
    return conflict(`${field} already exists`);
  }
  throw error;
}
```

## Zod Schema for PATCH Operations

```typescript
// Create schema (POST)
const createSchema = z.object({
  name: z.string().min(1).trim(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  tags: z.array(z.string()).default([]),
});

// Update schema (PUT) - same as create, full replacement
const updateSchema = createSchema;

// Patch schema (PATCH) - all fields optional
const patchSchema = createSchema.partial();

// With refinements for conditional fields
const corridorPatchSchema = z
  .object({
    type: z.enum(['city-to-city', 'country-to-country']).optional(),
    fromCity: z.string().optional(),
    toCity: z.string().optional(),
    fromCountry: z.string().optional(),
    toCountry: z.string().optional(),
  })
  .refine(
    (data) => {
      // If type is being changed, validate required fields
      if (data.type === 'city-to-city') {
        return data.fromCity !== undefined && data.toCity !== undefined;
      }
      if (data.type === 'country-to-country') {
        return data.fromCountry !== undefined && data.toCountry !== undefined;
      }
      return true;
    },
    { message: 'Missing required location fields for type change' }
  );
```
