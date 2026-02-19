# Custom Hooks & Patterns

Reusable hooks and patterns for common frontend scenarios.

## Table of Contents

1. [useDebounce Hook](#usedebounce-hook)
2. [useQueryParams Hook](#usequeryparams-hook)
3. [useConfirmDialog Hook](#useconfirmdialog-hook)
4. [useToast Pattern](#usetoast-pattern)
5. [useMutationWithToast Hook](#usemutationwithtoast-hook)

---

## useDebounce Hook

### Use Case
Debouncing search inputs, API calls.

### Implementation

```typescript
// hooks/use-debounce.ts
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
```

### Usage

```typescript
'use client'

import { useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { useQuery } from '@tanstack/react-query'

export function SearchComponent() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => fetchResults(debouncedSearch),
    enabled: debouncedSearch.length > 0
  })

  return (
    <div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
      />
      {isLoading && <LoadingSpinner />}
      {data && <ResultsList data={data} />}
    </div>
  )
}
```

### Key Points

- Delay is configurable (default 300ms)
- Cleans up timer on unmount
- Type-safe with TypeScript generics

---

## useQueryParams Hook

### Use Case
Reading and updating URL search parameters.

### Implementation

```typescript
// hooks/use-query-params.ts
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useQueryParams() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams)

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      })

      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const getParam = useCallback(
    (key: string): string | null => {
      return searchParams.get(key)
    },
    [searchParams]
  )

  const clearParams = useCallback(() => {
    router.push(window.location.pathname)
  }, [router])

  return {
    params: searchParams,
    updateParams,
    getParam,
    clearParams
  }
}
```

### Usage

```typescript
'use client'

import { useQueryParams } from '@/hooks/use-query-params'

export function FilterComponent() {
  const { updateParams, getParam, clearParams } = useQueryParams()

  const status = getParam('status') || ''
  const page = Number(getParam('page')) || 1

  const handleStatusChange = (newStatus: string) => {
    updateParams({ status: newStatus, page: 1 }) // Reset to page 1
  }

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage })
  }

  const handleReset = () => {
    clearParams()
  }

  return (
    <div>
      <Select value={status} onValueChange={handleStatusChange}>
        <option value="">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </Select>
      <Button onClick={handleReset}>Reset</Button>
    </div>
  )
}
```

---

## useConfirmDialog Hook

### Use Case
Confirming destructive actions (delete, archive, etc.)

### Implementation

```typescript
// hooks/use-confirm-dialog.ts
import { useState } from 'react'

interface ConfirmOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolveCallback, setResolveCallback] = useState<
    ((value: boolean) => void) | null
  >(null)

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)

    return new Promise((resolve) => {
      setResolveCallback(() => resolve)
    })
  }

  const handleConfirm = () => {
    setIsOpen(false)
    resolveCallback?.(true)
    setResolveCallback(null)
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolveCallback?.(false)
    setResolveCallback(null)
  }

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel
  }
}
```

### Usage

```typescript
'use client'

import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { AlertDialog } from '@/components/ui/alert-dialog'

export function UserList() {
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmDialog()
  const deleteMutation = useMutation({ mutationFn: deleteUser })

  const handleDelete = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Delete User',
      description: 'Are you sure? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      deleteMutation.mutate(userId)
    }
  }

  return (
    <>
      <Button onClick={() => handleDelete('123')} variant="destructive">
        Delete
      </Button>

      <AlertDialog open={isOpen} onOpenChange={handleCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {options?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {options?.cancelText || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {options?.confirmText || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

---

## useToast Pattern

### Use Case
Showing success/error notifications.

### Implementation (using shadcn/ui toast)

```typescript
// Already provided by shadcn/ui
import { useToast } from '@/components/ui/use-toast'

export function MyComponent() {
  const { toast } = useToast()

  const showSuccess = () => {
    toast({
      title: 'Success',
      description: 'Operation completed successfully',
      variant: 'default'
    })
  }

  const showError = (error: Error) => {
    toast({
      title: 'Error',
      description: error.message || 'Something went wrong',
      variant: 'destructive'
    })
  }

  return <Button onClick={showSuccess}>Show Toast</Button>
}
```

---

## useMutationWithToast Hook

### Use Case
Automatically show toast notifications for mutations.

### Implementation

```typescript
// hooks/use-mutation-with-toast.ts
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'

interface MutationWithToastOptions<TData, TError, TVariables>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'onSuccess' | 'onError'> {
  successMessage?: string | ((data: TData) => string)
  errorMessage?: string | ((error: TError) => string)
  invalidateQueries?: string[]
  onSuccess?: (data: TData) => void
  onError?: (error: TError) => void
}

export function useMutationWithToast<TData = unknown, TError = Error, TVariables = void>({
  mutationFn,
  successMessage = 'Operation completed successfully',
  errorMessage = 'Something went wrong',
  invalidateQueries = [],
  onSuccess: customOnSuccess,
  onError: customOnError,
  ...options
}: MutationWithToastOptions<TData, TError, TVariables>) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Show success toast
      const message =
        typeof successMessage === 'function'
          ? successMessage(data)
          : successMessage

      toast({
        title: 'Success',
        description: message,
        variant: 'default'
      })

      // Invalidate queries
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] })
      })

      // Custom success handler
      customOnSuccess?.(data)
    },
    onError: (error, variables, context) => {
      // Show error toast
      const message =
        typeof errorMessage === 'function'
          ? errorMessage(error)
          : errorMessage

      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })

      // Custom error handler
      customOnError?.(error)
    },
    ...options
  })
}
```

### Usage

```typescript
'use client'

import { useMutationWithToast } from '@/hooks/use-mutation-with-toast'

export function UserForm() {
  const mutation = useMutationWithToast({
    mutationFn: createUser,
    successMessage: (data) => `User ${data.name} created successfully`,
    errorMessage: (error) => error.message || 'Failed to create user',
    invalidateQueries: ['users', 'user-stats']
  })

  const onSubmit = (data) => {
    mutation.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* form fields */}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  )
}
```

### Key Points

- Automatically shows success/error toasts
- Invalidates specified queries on success
- Supports custom success/error messages
- Supports custom handlers
- Reduces boilerplate code

---

## Common Hook Anti-Patterns

### ❌ DON'T: Create hooks for one-time logic

```typescript
// ❌ WRONG - Unnecessary hook
function useAddNumbers() {
  return (a: number, b: number) => a + b
}
```

### ✅ DO: Use regular functions

```typescript
// ✅ CORRECT
const addNumbers = (a: number, b: number) => a + b
```

### ❌ DON'T: Overuse useEffect

```typescript
// ❌ WRONG
useEffect(() => {
  setFullName(firstName + ' ' + lastName)
}, [firstName, lastName])
```

### ✅ DO: Use derived values

```typescript
// ✅ CORRECT
const fullName = `${firstName} ${lastName}`
```

### ❌ DON'T: Create hooks that just wrap useState

```typescript
// ❌ WRONG
function useCounter() {
  const [count, setCount] = useState(0)
  return [count, setCount]
}
```

### ✅ DO: Use useState directly

```typescript
// ✅ CORRECT
const [count, setCount] = useState(0)
```

---

## Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './use-debounce'

test('debounces value', async () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 300),
    { initialProps: { value: 'initial' } }
  )

  expect(result.current).toBe('initial')

  // Change value
  rerender({ value: 'updated' })

  // Should not update immediately
  expect(result.current).toBe('initial')

  // Wait for debounce
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
  })

  // Should update after delay
  expect(result.current).toBe('updated')
})
```

---

## Performance Optimization Hooks

### useMemo for Expensive Computations

```typescript
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.name.localeCompare(b.name))
}, [data])
```

### useCallback for Stable Function References

```typescript
const handleClick = useCallback((id: string) => {
  // Stable reference prevents child re-renders
  console.log('Clicked', id)
}, []) // Empty deps = never changes
```

### Key Points

- ONLY use useMemo/useCallback when needed
- Premature optimization is bad
- Profile before optimizing
- Most components don't need memoization
