# Advanced Form Patterns

Complex form patterns using React Hook Form and Zod validation.

## Table of Contents

1. [Array Fields (Dynamic Lists)](#array-fields-dynamic-lists)
2. [Conditional Fields](#conditional-fields)
3. [Type-Based Form Switching](#type-based-form-switching)
4. [Multi-Step Forms](#multi-step-forms)
5. [File Upload Forms](#file-upload-forms)
6. [Nested Object Fields](#nested-object-fields)

---

## Array Fields (Dynamic Lists)

### Use Case
Adding/removing vendors, categories, or any list of items.

### Schema

```typescript
import { z } from 'zod'

export const corridorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  vendors: z.array(z.object({
    id: z.string(),
    name: z.string()
  })).default([]),
  categories: z.array(z.string()).default([])
})
```

### Component

```typescript
'use client'

import { useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

export function CorridorForm() {
  const form = useForm({
    resolver: zodResolver(corridorSchema),
    defaultValues: {
      name: '',
      vendors: [],
      categories: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'vendors'
  })

  const onSubmit = (data) => {
    // Normalize arrays before sending
    const payload = {
      ...data,
      vendors: data.vendors.map(v => v.id), // Send only IDs
      categories: data.categories.filter(Boolean) // Remove empty
    }
    mutation.mutate(payload)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Regular field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Array field */}
        <div className="space-y-2">
          <FormLabel>Vendors</FormLabel>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`vendors.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} placeholder="Vendor name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ id: '', name: '' })}
          >
            Add Vendor
          </Button>
        </div>

        <Button type="submit">Save</Button>
      </form>
    </Form>
  )
}
```

### Key Points

- Use `useFieldArray` for dynamic lists
- Each field needs unique `key={field.id}` (provided by useFieldArray)
- Normalize arrays before submit (extract IDs, filter empty)
- Always validate array items in Zod schema

---

## Conditional Fields

### Use Case
Show/hide fields based on other field values.

### Schema

```typescript
export const userSchema = z.object({
  role: z.enum(['user', 'admin']),
  email: z.string().email(),
  // Admin-only field (validated UX-side only)
  permissions: z.array(z.string()).optional()
})
```

### Component

```typescript
export function UserForm() {
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'user', email: '', permissions: [] }
  })

  const role = form.watch('role')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conditional field */}
        {role === 'admin' && (
          <FormField
            control={form.control}
            name="permissions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permissions</FormLabel>
                <MultiSelect {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit">Save</Button>
      </form>
    </Form>
  )
}
```

### Key Points

- Use `form.watch()` to observe field values
- Conditional rendering with `{condition && <Field />}`
- Fields are automatically validated when visible
- Hidden fields are excluded from submit (use `.optional()` in schema)

---

## Type-Based Form Switching

### Use Case
Corridor types: city-to-city vs country-to-country.

### Schema

```typescript
export const corridorSchema = z.object({
  type: z.enum(['city-to-city', 'country-to-country']),
  // City-to-city fields
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  // Country-to-country fields
  fromCountry: z.string().optional(),
  toCountry: z.string().optional()
})
```

### Component

```typescript
export function CorridorForm() {
  const form = useForm({
    resolver: zodResolver(corridorSchema),
    defaultValues: { type: 'city-to-city' }
  })

  const type = form.watch('type')

  // Clear incompatible fields when type changes
  useEffect(() => {
    if (type === 'country-to-country') {
      form.setValue('fromCity', '')
      form.setValue('toCity', '')
    } else if (type === 'city-to-city') {
      form.setValue('fromCountry', '')
      form.setValue('toCountry', '')
    }
  }, [type, form])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Type selector */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <option value="city-to-city">City to City</option>
                <option value="country-to-country">Country to Country</option>
              </Select>
            </FormItem>
          )}
        />

        {/* Conditional fields based on type */}
        {type === 'city-to-city' ? (
          <>
            <FormField
              control={form.control}
              name="fromCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From City</FormLabel>
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To City</FormLabel>
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <>
            <FormField
              control={form.control}
              name="fromCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Country</FormLabel>
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Country</FormLabel>
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit">Save</Button>
      </form>
    </Form>
  )
}
```

### Key Points

- **CRITICAL**: Clear incompatible fields when type changes (useEffect)
- Prevents hybrid state (e.g., both city AND country fields filled)
- Backend should also validate type-specific required fields

---

## Multi-Step Forms

### Use Case
Registration, onboarding, or complex forms split into steps.

### Schema

```typescript
// Step 1
export const step1Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

// Step 2
export const step2Schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1)
})

// Combined
export const registrationSchema = step1Schema.merge(step2Schema)
```

### Component

```typescript
export function RegistrationForm() {
  const [step, setStep] = useState(1)

  const form = useForm({
    resolver: zodResolver(
      step === 1 ? step1Schema : step === 2 ? step2Schema : registrationSchema
    ),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: ''
    }
  })

  const onNext = async () => {
    // Validate current step
    const isValid = await form.trigger(
      step === 1 ? ['email', 'password'] : ['firstName', 'lastName']
    )
    if (isValid) {
      setStep(step + 1)
    }
  }

  const onSubmit = (data) => {
    // All steps validated, submit
    mutation.mutate(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {step === 1 && (
          <>
            <FormField name="email" />
            <FormField name="password" />
            <Button type="button" onClick={onNext}>
              Next
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <FormField name="firstName" />
            <FormField name="lastName" />
            <Button type="button" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit">Submit</Button>
          </>
        )}
      </form>
    </Form>
  )
}
```

### Key Points

- Use `form.trigger()` to validate specific fields before moving to next step
- Change resolver per step to only validate visible fields
- Store all data in single form instance (no need to pass between steps)

---

## File Upload Forms

### Use Case
Image uploads, document uploads.

### Schema

```typescript
export const uploadSchema = z.object({
  title: z.string().min(1),
  // File handled separately (not in Zod)
  file: z.any().optional()
})
```

### Component

```typescript
export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const form = useForm({
    resolver: zodResolver(uploadSchema),
    defaultValues: { title: '' }
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      return fetch('/api/upload', {
        method: 'POST',
        body: data
      })
    }
  })

  const onSubmit = (data) => {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('file', file)

    mutation.mutate(formData)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      // Preview for images
      if (selectedFile.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(selectedFile))
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <Input {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* File input */}
        <div className="space-y-2">
          <FormLabel>File</FormLabel>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="max-w-xs rounded-md"
            />
          )}
        </div>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Uploading...' : 'Upload'}
        </Button>
      </form>
    </Form>
  )
}
```

### Key Points

- File state stored separately (NOT in React Hook Form)
- Use `FormData` for file uploads
- Show preview for images using `URL.createObjectURL()`
- Clean up preview: `URL.revokeObjectURL(preview)` on unmount

---

## Nested Object Fields

### Use Case
Address, location, or complex nested data.

### Schema

```typescript
export const vendorSchema = z.object({
  name: z.string().min(1),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
    postalCode: z.string().min(1)
  })
})
```

### Component

```typescript
export function VendorForm() {
  const form = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      address: {
        street: '',
        city: '',
        country: '',
        postalCode: ''
      }
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <Input {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        <fieldset className="space-y-4 border p-4 rounded-md">
          <legend className="text-sm font-medium">Address</legend>

          <FormField
            control={form.control}
            name="address.street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street</FormLabel>
                <Input {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address.city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <Input {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address.country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <Input {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address.postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <Input {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <Button type="submit">Save</Button>
      </form>
    </Form>
  )
}
```

### Key Points

- Access nested fields with dot notation: `address.street`
- Zod validates nested structure
- Use `<fieldset>` for visual grouping
- defaultValues MUST match schema structure

---

## Common Form Anti-Patterns

### ❌ DON'T: useState for form state

```typescript
// ❌ WRONG
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
```

### ✅ DO: React Hook Form

```typescript
// ✅ CORRECT
const form = useForm({ resolver: zodResolver(schema) })
```

### ❌ DON'T: Manual validation

```typescript
// ❌ WRONG
if (!email.includes('@')) {
  setError('Invalid email')
}
```

### ✅ DO: Zod validation

```typescript
// ✅ CORRECT
const schema = z.object({
  email: z.string().email('Invalid email')
})
```

### ❌ DON'T: Submit without normalization

```typescript
// ❌ WRONG
const onSubmit = (data) => {
  mutation.mutate(data) // Arrays might be undefined/invalid
}
```

### ✅ DO: Normalize before submit

```typescript
// ✅ CORRECT
const onSubmit = (data) => {
  const payload = {
    ...data,
    vendors: Array.isArray(data.vendors) ? data.vendors : []
  }
  mutation.mutate(payload)
}
```

---

## Testing Forms

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserForm } from './user-form'

test('validates required fields', async () => {
  render(<UserForm />)

  // Submit without filling
  fireEvent.click(screen.getByRole('button', { name: /submit/i }))

  // Check for validation errors
  await waitFor(() => {
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })
})

test('submits valid data', async () => {
  const onSubmit = vi.fn()
  render(<UserForm onSubmit={onSubmit} />)

  // Fill form
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'test@example.com' }
  })

  // Submit
  fireEvent.click(screen.getByRole('button', { name: /submit/i }))

  // Check submit called
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com'
    })
  })
})
```
