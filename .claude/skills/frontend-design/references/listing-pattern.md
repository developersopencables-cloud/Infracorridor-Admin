# Listing Page Pattern

Complete Next.js listing page pattern with URL-based state management, debounced search, and pagination.

## Architecture

**URL as single source of truth:**
- Search query: `?q=search+term`
- Page number: `?page=2`
- Filters: `?status=active&role=admin`

**Components:**
1. Server Component: Fetches initial data from URL params
2. Client Component: Handles search/filter interactions

## Implementation

### 1. Server Component (Page)

```typescript
// app/(protected)/admin/users/page.tsx
import { Suspense } from 'react'
import { UsersPageClient } from './users-page-client'

interface SearchParams {
  q?: string
  page?: string
  role?: string
  status?: string
}

export default async function UsersPage({
  searchParams
}: {
  searchParams: SearchParams
}) {
  const page = Number(searchParams.page) || 1
  const query = searchParams.q || ''
  const role = searchParams.role
  const status = searchParams.status

  const limit = 20
  const skip = (page - 1) * limit

  // Fetch data server-side
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/users?` +
    new URLSearchParams({
      q: query,
      skip: skip.toString(),
      limit: limit.toString(),
      ...(role && { role }),
      ...(status && { status })
    })
  )

  const data = await response.json()

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <UsersPageClient
        initialData={data}
        initialParams={{ q: query, page, role, status }}
      />
    </Suspense>
  )
}
```

### 2. Client Component (Interactions)

```typescript
// app/(protected)/admin/users/users-page-client.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { UsersTable } from '@/components/user/users-table'

export function UsersPageClient({ initialData, initialParams }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Local state for inputs (updates immediately)
  const [search, setSearch] = useState(initialParams.q || '')
  const [role, setRole] = useState(initialParams.role || '')
  const [status, setStatus] = useState(initialParams.status || '')

  // 300ms debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL({ q: search, page: 1 }) // Reset to page 1 on search
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  // Immediate filter updates
  useEffect(() => {
    updateURL({ role, page: 1 })
  }, [role])

  useEffect(() => {
    updateURL({ status, page: 1 })
  }, [status])

  const updateURL = (updates: Record<string, any>) => {
    const params = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage })
  }

  const handleReset = () => {
    setSearch('')
    setRole('')
    setStatus('')
    router.push(window.location.pathname) // Clear all params
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {/* Search Input - Debounced */}
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {/* Filters - Immediate */}
        <Select value={role} onValueChange={setRole}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>

        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>

      {/* Data Table */}
      <UsersTable
        data={initialData.users}
        currentPage={initialParams.page}
        totalPages={Math.ceil(initialData.total / 20)}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
```

### 3. Data Table Component

```typescript
// components/user/users-table.tsx
'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface UsersTableProps {
  data: any[]
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function UsersTable({
  data,
  currentPage,
  totalPages,
  onPageChange
}: UsersTableProps) {
  if (!data.length) {
    return <EmptyState message="No users found" />
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{user.status}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

## Key Points

### Debounced Search (300ms)

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    updateURL({ q: search, page: 1 })
  }, 300)
  return () => clearTimeout(timer)
}, [search])
```

- User types → local state updates immediately (responsive UI)
- After 300ms of no typing → URL updates → page re-renders
- Always reset to page 1 on new search

### Pagination Calculation

```typescript
const limit = 20
const skip = (page - 1) * limit

// Page 1: skip = 0, limit = 20
// Page 2: skip = 20, limit = 20
// Page 3: skip = 40, limit = 20
```

### URL Parameter Management

```typescript
const updateURL = (updates: Record<string, any>) => {
  const params = new URLSearchParams(searchParams)

  Object.entries(updates).forEach(([key, value]) => {
    if (value && value !== '') {
      params.set(key, value)
    } else {
      params.delete(key) // Remove empty params
    }
  })

  router.push(`?${params.toString()}`)
}
```

### Filter Reset

```typescript
const handleReset = () => {
  setSearch('')
  setRole('')
  setStatus('')
  router.push(window.location.pathname) // Clear all params
}
```

## Benefits

1. **Shareable URLs** - Users can copy/paste URLs with filters
2. **Browser back/forward works** - Natural navigation
3. **SSR-friendly** - Initial data loads server-side
4. **No flash of wrong state** - URL is source of truth
5. **Better UX** - Debounced search prevents excessive requests

## Common Mistakes to Avoid

❌ **DON'T store search/filters in React state only:**
```typescript
// ❌ WRONG - State doesn't sync with URL
const [search, setSearch] = useState('')
```

✅ **DO use URL as source of truth:**
```typescript
// ✅ CORRECT - Read from URL, write to URL
const search = searchParams.get('q') || ''
```

❌ **DON'T forget to reset page on search/filter:**
```typescript
// ❌ WRONG - User might be on page 5, search gives 2 results
updateURL({ q: search })
```

✅ **DO reset to page 1:**
```typescript
// ✅ CORRECT
updateURL({ q: search, page: 1 })
```

❌ **DON'T debounce filters:**
```typescript
// ❌ WRONG - Filters should update immediately
useEffect(() => {
  const timer = setTimeout(() => updateURL({ role }), 300)
  return () => clearTimeout(timer)
}, [role])
```

✅ **DO debounce search only:**
```typescript
// ✅ CORRECT - Search debounced, filters immediate
useEffect(() => {
  const timer = setTimeout(() => updateURL({ q: search }), 300)
  return () => clearTimeout(timer)
}, [search])

useEffect(() => {
  updateURL({ role }) // Immediate
}, [role])
```
