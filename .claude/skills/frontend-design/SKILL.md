---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces for Next.js 16 applications using React 19, shadcn/ui, TanStack Query, React Hook Form, and Zod validation. Use this skill when building or modifying web components, pages, forms, or any frontend UI tasks including: (1) Creating new pages or components, (2) Building forms with validation, (3) Implementing data fetching and mutations, (4) Managing client-server state, (5) Refactoring existing UI code, (6) Fixing frontend bugs or issues. Enforces strict data flow rules, form handling patterns, and Next.js best practices.
---

# Frontend Design Skill

Build production-grade Next.js 16 frontend interfaces that are clean, consistent, and follow established architectural patterns.

## Core Stack (Non-Negotiable)

- **Framework**: Next.js 16 (App Router) with React 19
- **UI Components**: shadcn/ui only (DO NOT create custom components if shadcn exists)
- **Forms**: React Hook Form (useState-based forms FORBIDDEN for new forms)
- **Validation**: Zod (UX-only, backend validates again)
- **Server State**: TanStack Query for all fetching and mutations
- **Styling**: Tailwind CSS 4
- **Images**: next/image (NEVER raw `<img>`)

## Critical Rules

### 1. Data Authority

**Backend is the single source of truth.**

- Frontend NEVER invents business rules
- Frontend NEVER assumes backend behavior
- UI reflects backend state only
- All validation is UX-only; backend is final authority

### 2. State Management

**Server state → TanStack Query ONLY**

- NO fetch/axios directly in components
- All API calls through `api/*` or `services/*` layer
- NEVER duplicate server state in React state
- NO derived server state stored in components

**Client/UI state → local state or context**

### 3. Data Fetching (Mandatory)

Always use TanStack Query with:

```typescript
// Queries must have:
const { data, isLoading, error } = useQuery({
  queryKey: ['stable-key', id], // Stable query keys
  queryFn: fetchFunction,
  enabled: !!id,              // Proper enabled conditions
})

// Handle states explicitly:
if (isLoading) return <LoadingSpinner />
if (error) return <ErrorMessage error={error} />
if (!data) return <EmptyState />
```

### 4. Mutations (Mandatory)

All writes use `useMutation`:

```typescript
const mutation = useMutation({
  mutationFn: updateFunction,
  onSuccess: () => {
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['resource'] })
  },
  onError: (error) => {
    // Handle 400, 401, 403, 409, 500 explicitly
    handleError(error)
  }
})

// NEVER update optimistically unless explicitly required
// NEVER assume mutation success
```

### 5. Form Handling (Critical)

**All new forms MUST use React Hook Form + Zod:**

```typescript
// ✅ CORRECT - React Hook Form + Zod
const form = useForm<FormSchema>({
  resolver: zodResolver(formSchema),
  defaultValues: { /* ... */ }
})

const onSubmit = (data: FormSchema) => {
  // 1. Data already validated by Zod
  // 2. Normalize payload
  const payload = normalizePayload(data)
  // 3. TanStack Query mutation
  mutation.mutate(payload)
}

// ❌ FORBIDDEN - useState-based forms
const [formData, setFormData] = useState({})
```

**Form workflow:**

1. User types → React Hook Form manages inputs
2. Zod validates (UX only) → show field errors
3. onSubmit → normalize payload
4. TanStack Query mutation → sends to backend
5. Backend Zod validates again (final authority)

### 6. Payload & ID Rules (Critical)

- UI NEVER sends `_id` to backend
- UI NEVER generates IDs for backend entities
- Payloads MUST match backend contract exactly
- NEVER send `undefined`, `null`, or empty fields blindly

### 7. Array Safety (Critical)

```typescript
// ✅ CORRECT
const payload = {
  vendors: Array.isArray(formData.vendors)
    ? formData.vendors.filter(v => v.id) // Remove invalid items
    : [] // Always default to []
}

// ❌ FORBIDDEN
const payload = {
  vendors: formData.vendors // Could be undefined/null/non-array
}
```

- NEVER trust form arrays
- Always normalize arrays before submit
- Always default arrays to `[]`
- Validate array items before submit

### 8. Type-Based UI Cleanup

When type changes, clear incompatible fields immediately:

```typescript
// Example: Switching corridor type
useEffect(() => {
  if (type === 'country-to-country') {
    form.setValue('fromCity', null)
    form.setValue('toCity', null)
  } else if (type === 'city-to-city') {
    form.setValue('fromCountry', null)
    form.setValue('toCountry', null)
  }
}, [type])
```

Prevent hybrid form state at all times.

### 9. Error Handling

- Always show user-safe error messages
- NEVER expose raw backend errors
- Log full error details for debugging
- Handle empty, loading, and error states explicitly

```typescript
// ✅ CORRECT
if (error) {
  const message = error.response?.data?.message || 'Something went wrong'
  toast.error(message)
  console.error('Full error:', error) // For debugging
}
```

### 10. PUT vs PATCH Discipline

- **PUT** = full replace (must include ALL required fields)
- **PATCH** = partial update (only changed fields)
- NEVER simulate PUT with PATCH
- PUT payloads MUST be deterministic and repeatable

## Component Architecture

### Reuse Over Recreation

**DO NOT create custom components if shadcn/ui exists:**

- Use shadcn/ui Button, Input, Select, Dialog, etc.
- Extend via composition, NOT duplication
- UI MUST be consistent across screens

### Layout & Visual Consistency

- Follow existing layout patterns strictly
- NO one-off UI designs
- Spacing, typography, hierarchy MUST match existing screens
- Clean, minimal, professional aesthetic
- Avoid over-styling and visual noise

### Pattern Reuse Rule

**If a similar screen exists:**

1. Reuse the same structure
2. Reuse the same components
3. Reuse the same interaction patterns

New UI must feel like it belongs to the same product.

## Next.js App Router Best Practices

### URL as Single Source of Truth

**Build listing pages with searchParams:**

```typescript
// ✅ CORRECT - Server Component
export default async function UsersPage({
  searchParams
}: {
  searchParams: { q?: string; page?: string }
}) {
  const page = Number(searchParams.page) || 1
  const query = searchParams.q || ''
  const limit = 20
  const skip = (page - 1) * limit

  const data = await fetchUsers({ query, skip, limit })

  return <UsersPageClient initialData={data} />
}
```

```typescript
// ✅ CORRECT - Client Component with 300ms debounced search
'use client'

export function UsersPageClient({ initialData }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')

  // 300ms debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (search) {
        params.set('q', search)
        params.set('page', '1') // Reset to page 1 on search
      } else {
        params.delete('q')
      }
      router.push(`?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  return (
    <div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
      />
      {/* ... rest of UI */}
    </div>
  )
}
```

### Server vs Client Components

- **Server Components**: Data fetching, static content
- **Client Components**: Interactivity, forms, hooks
- Mark client components with `'use client'` directive
- Pass fetched data from server → client as props

## Zod Validation Patterns

**Zod schemas MUST be:**

1. Defined outside components (in separate file or top-level)
2. Used with React Hook Form via `zodResolver`
3. Run BEFORE any API mutation
4. Normalize arrays and optional fields

```typescript
// ✅ CORRECT - Separate file or top-level
export const corridorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['city-to-city', 'country-to-country']),
  vendors: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([])
})

// ❌ FORBIDDEN - Inside component
function MyForm() {
  const schema = z.object({ ... }) // DON'T DO THIS
}
```

## Clean Code Expectations

- NO inline API calls in JSX
- NO deeply nested components
- NO unused state or effects
- Components MUST be readable
- Prefer clarity over cleverness

## Common Patterns

### Form with Mutation

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function UserForm({ defaultValues }) {
  const queryClient = useQueryClient()

  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues
  })

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const onSubmit = (data) => {
    mutation.mutate(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* form fields */}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}
```

### Data Table with Search/Pagination

See **references/listing-pattern.md** for complete Next.js listing page pattern with URL-based state management.

### Dialog/Modal with Form

```typescript
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create User</DialogTitle>
    </DialogHeader>
    <UserForm
      onSuccess={() => setOpen(false)}
    />
  </DialogContent>
</Dialog>
```

## Enforcement

**If a rule is violated:**

- Reject the implementation
- Refactor instead of patching
- "Works on UI" is NOT success criteria

**Success criteria:**

- Follows all architectural rules
- Matches existing UI patterns
- Data flow is correct (client ↔ server)
- Clean, maintainable code
- No console warnings/errors

## Reference Files

- **references/listing-pattern.md** - Complete Next.js listing page pattern with URL state management, debounced search, and pagination
- **references/form-patterns.md** - Advanced form patterns including arrays, conditional fields, and dynamic forms

## Quick Checklist

Before submitting frontend work:

- [ ] Uses React Hook Form + Zod (NOT useState forms)
- [ ] Uses TanStack Query for all server state
- [ ] Uses shadcn/ui components (NO custom recreations)
- [ ] Follows existing layout patterns
- [ ] Arrays are normalized before submit
- [ ] Type changes clear incompatible fields
- [ ] Error states handled explicitly
- [ ] next/image for all images
- [ ] Clean, readable code
- [ ] No console warnings/errors
