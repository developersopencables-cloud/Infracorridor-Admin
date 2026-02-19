# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InfraCorridors is a Next.js 16 application for managing submarine cable infrastructure corridors. It allows administrators to create and manage bandwidth corridors between cities or countries, sync submarine cable data from external sources to S3, and manage vendors/categories.

## Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000

# Build & Production
npm run build        # Build for production
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router (React 19)
- **Language**: TypeScript
- **Frontend Framework**: React 19,shadcn/ui
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: better-auth library with MongoDB adapter
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS 4
- **Forms**: react-hook-form with Zod validation
- **File Storage**: AWS S3, Cloudinary for images
- **Email**: Resend

### Directory Structure

```
src/
├── app/
│   ├── (pages)/          # Public routes (login, register, forgot-password)
│   ├── (protected)/      # Auth-required routes (dashboard, admin/*)
│   │   └── admin/        # Admin-only pages (corridors, users, sync, master data)
│   └── api/              # API routes
├── models/               # Mongoose models (Corridor, Vendor, Category, etc.)
├── validators/           # Zod validation schemas
├── database/             # DB connections and auth setup
├── lib/                  # Business logic (cable sync services, cloudinary)
├── components/           # React components
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Layout components (sidebar, nav)
├── types/                # TypeScript type definitions
└── utils/                # Utility functions (email, validation, rate-limit)
```

### Authentication Flow

- Server-side auth: `src/database/auth.ts` - better-auth configuration with MongoDB
- Client-side auth: `src/database/auth-client.ts` - React hooks (signIn, signUp, useSession)
- Protected routes use `src/app/(protected)/layout.tsx` which checks session
- Admin routes check `checkAdminSession()` from `src/database/auth-utils.ts`
- User roles: "user" (default) or "admin"

### Key Models

- **Corridor**: Main entity representing city-to-city or country-to-country bandwidth routes
- **Vendor**: Service providers associated with corridors
- **Category**: Classification categories with optional CategoryClassification references
- **CableImage/MapImage**: Image storage for cables and corridor maps
- **SyncHistory**: Tracks submarine cable sync operations

### API Pattern

API routes follow Next.js App Router conventions in `src/app/api/`. Admin endpoints verify session with `checkAdminSession()` before processing. Standard response format:
```typescript
{ success: boolean, data?: T, error?: string, message?: string }
```

### Cable Sync System

Located in `src/lib/Cable-data-Sync/`:
- `CableSyncService`: Orchestrates fetching cable data and uploading to S3
- `CableFetchService`: Fetches from external submarine cable map APIs
- `S3Service`: Handles S3 uploads with change detection (only uploads if content changed)

### Environment Variables Required

- `MONGODB_URI`: MongoDB connection string
- `NEXT_PUBLIC_BASE_URL`: Application base URL
- AWS S3 credentials for cable data storage
- Cloudinary credentials for image uploads
- Resend API key for emails

### Form Validation

Validators in `src/validators/` use Zod. Auth validators enforce strong passwords (min 8 chars, uppercase, lowercase, number, special character).

### UI Components

Uses shadcn/ui pattern with components in `src/components/ui/`. Forms use `react-hook-form` with `@hookform/resolvers/zod` for validation.

## Skills

This project has custom Claude Code skills that provide specialized guidance:

### Available Skills

1. **frontend-design** - Frontend development with Next.js 16, React 19, shadcn/ui, TanStack Query, React Hook Form
   - Automatically triggers for UI/component/page work
   - Enforces strict data flow and form handling rules
   - Provides patterns for listings, forms, hooks

2. **backend-best-practices** - API routes, Mongoose models, Zod validators
   - Use for creating/modifying API endpoints
   - Enforces data integrity and retry-safe operations

3. **api-testing** - Testing Next.js API routes with Vitest
   - Guidelines for testing with mongodb-memory-server

Skills are located in `.claude/skills/` and are automatically invoked when relevant.

## Frontend Development Rules

### Core Principles

**CRITICAL: The frontend skill (`frontend-design`) contains comprehensive rules. Key points:**

1. **Data Authority**
   - Backend is single source of truth
   - Frontend NEVER invents business rules
   - UI reflects backend state only

2. **State Management**
   - **Server State**: TanStack Query ONLY (no fetch/axios in components)
   - **Client State**: Local state or context
   - NEVER duplicate server state in React state

3. **Form Handling (Mandatory)**
   - ALL forms MUST use React Hook Form + Zod
   - useState-based forms are FORBIDDEN for new forms
   - Workflow: RHF → Zod validates → normalize payload → TanStack mutation

4. **Component Architecture**
   - Use shadcn/ui components only
   - DO NOT create custom components if shadcn exists
   - Extend via composition, not duplication

### Listing Pages Pattern

**URL as single source of truth** for search/filters/pagination:

```typescript
// Server Component - fetches data from searchParams
export default async function UsersPage({ searchParams }) {
  const page = Number(searchParams.page) || 1
  const query = searchParams.q || ''
  const skip = (page - 1) * 20

  const data = await fetchUsers({ query, skip, limit: 20 })
  return <UsersPageClient initialData={data} />
}

// Client Component - handles interactions with 300ms debounced search
'use client'
export function UsersPageClient({ initialData }) {
  const [search, setSearch] = useState(searchParams.get('q') || '')

  // 300ms debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL({ q: search, page: 1 }) // Reset to page 1
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return <div>{/* UI */}</div>
}
```

### Form Pattern

```typescript
'use client'

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { /* ... */ }
})

const mutation = useMutation({
  mutationFn: createResource,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resources'] })
    toast.success('Created successfully')
  }
})

const onSubmit = (data) => {
  // Normalize arrays/payload before sending
  const payload = normalizePayload(data)
  mutation.mutate(payload)
}
```

### Critical Rules

- **Arrays**: Always normalize before submit, default to `[]`
- **IDs**: UI NEVER sends `_id`, NEVER generates backend IDs
- **Type Changes**: Clear incompatible fields immediately (e.g., switching city ↔ country)
- **Images**: Always use `next/image`, never raw `<img>`
- **PUT vs PATCH**: PUT = full replace, PATCH = partial update
- **Error Handling**: Show user-safe messages, log full errors

For complete patterns and examples, the `frontend-design` skill includes:
- `references/listing-pattern.md` - Complete URL-based listing implementation
- `references/form-patterns.md` - Arrays, conditionals, multi-step, file uploads
- `references/hooks-patterns.md` - useDebounce, useQueryParams, useMutationWithToast

## Backend Development Rules

API routes follow RESTful patterns with Mongoose and Zod validation:

1. **Schema-Validator Parity**: Mongoose schemas MUST match Zod validators
2. **Retry-Safe Operations**: Use `$set`, `$push`, `$pull` (never replace documents)
3. **Data Integrity**: Validate references, check uniqueness, handle edge cases
4. **Error Handling**: Return proper HTTP status codes with user-safe messages

See `backend-best-practices` skill for complete guidelines.
