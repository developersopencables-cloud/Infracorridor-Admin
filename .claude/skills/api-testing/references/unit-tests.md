# Unit Testing Guide

Unit tests focus on isolated pieces of logic: validators, utilities, and pure functions.

## Zod Validator Testing

Test validators from `src/validators/` to ensure they correctly accept valid data and reject invalid data.

### Basic Validator Test

```typescript
// src/validators/corridor.validator.unit.test.ts
import { describe, it, expect } from 'vitest';
import { corridorValidator } from './corridor.validator';

describe('corridorValidator', () => {
  describe('valid data', () => {
    it('accepts complete valid corridor data', () => {
      const validData = {
        slug: 'new-york-london',
        title: 'New York to London',
        type: 'city-to-city',
        fromCity: 'New York',
        toCity: 'London',
        distanceKm: 5500,
        avgLatencyMs: 75,
        mapImageUrl: 'https://example.com/map.png',
        status: 'DRAFT',
      };

      const result = corridorValidator.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('accepts minimal required fields', () => {
      const minimalData = {
        slug: 'test-corridor',
        title: 'Test',
        type: 'city-to-city',
      };

      const result = corridorValidator.safeParse(minimalData);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid data', () => {
    it('rejects missing required slug', () => {
      const data = {
        title: 'Test Corridor',
        type: 'city-to-city',
      };

      const result = corridorValidator.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('slug');
      }
    });

    it('rejects invalid type enum', () => {
      const data = {
        slug: 'test',
        title: 'Test',
        type: 'invalid-type',
      };

      const result = corridorValidator.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects negative distanceKm', () => {
      const data = {
        slug: 'test',
        title: 'Test',
        type: 'city-to-city',
        distanceKm: -100,
      };

      const result = corridorValidator.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
```

### Testing Validation Error Messages

```typescript
describe('validation error messages', () => {
  it('provides clear error for invalid email', () => {
    const data = { email: 'not-an-email' };
    const result = userValidator.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find(i => i.path.includes('email'));
      expect(emailError?.message).toMatch(/invalid email/i);
    }
  });
});
```

## Utility Function Testing

Test pure utility functions with various inputs:

```typescript
// src/utils/slug.unit.test.ts
import { describe, it, expect } from 'vitest';
import { generateSlug, isValidSlug } from './slug';

describe('generateSlug', () => {
  it('converts title to lowercase slug', () => {
    expect(generateSlug('New York to London')).toBe('new-york-to-london');
  });

  it('removes special characters', () => {
    expect(generateSlug('Hello! World?')).toBe('hello-world');
  });

  it('trims whitespace', () => {
    expect(generateSlug('  test  ')).toBe('test');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('collapses multiple dashes', () => {
    expect(generateSlug('hello---world')).toBe('hello-world');
  });
});

describe('isValidSlug', () => {
  it('returns true for valid slug', () => {
    expect(isValidSlug('valid-slug-123')).toBe(true);
  });

  it('returns false for slug with uppercase', () => {
    expect(isValidSlug('Invalid-Slug')).toBe(false);
  });

  it('returns false for slug with spaces', () => {
    expect(isValidSlug('has spaces')).toBe(false);
  });
});
```

## Testing Functions with Dependencies

Use `vi.fn()` and `vi.mock()` to isolate the unit under test:

```typescript
// src/utils/email.unit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendWelcomeEmail } from './email';

// Mock the Resend client
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email-123' }),
    },
  })),
}));

describe('sendWelcomeEmail', () => {
  it('sends email with correct parameters', async () => {
    const result = await sendWelcomeEmail('user@example.com', 'John');

    expect(result.success).toBe(true);
  });

  it('handles send failure gracefully', async () => {
    // Override mock for this test
    const { Resend } = await import('resend');
    vi.mocked(Resend).mockImplementationOnce(() => ({
      emails: {
        send: vi.fn().mockRejectedValue(new Error('API error')),
      },
    }));

    const result = await sendWelcomeEmail('user@example.com', 'John');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/API error/);
  });
});
```

## Testing with Spies

Use spies to verify function calls without changing behavior:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { processData, logger } from './processor';

describe('processData', () => {
  it('logs processing start and end', () => {
    const logSpy = vi.spyOn(logger, 'info');

    processData({ items: [1, 2, 3] });

    expect(logSpy).toHaveBeenCalledWith('Processing started');
    expect(logSpy).toHaveBeenCalledWith('Processing complete');
    expect(logSpy).toHaveBeenCalledTimes(2);

    logSpy.mockRestore();
  });
});
```

## Testing Async Functions

```typescript
describe('fetchCableData', () => {
  it('resolves with cable data', async () => {
    const data = await fetchCableData('cable-123');
    expect(data).toHaveProperty('id', 'cable-123');
    expect(data).toHaveProperty('name');
  });

  it('rejects for non-existent cable', async () => {
    await expect(fetchCableData('non-existent')).rejects.toThrow('Cable not found');
  });

  it('handles timeout', async () => {
    vi.useFakeTimers();

    const promise = fetchCableData('slow-cable');
    vi.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow('Timeout');

    vi.useRealTimers();
  });
});
```

## Mongoose Model Validation Testing

Test that Mongoose models validate correctly (without hitting the database):

```typescript
// src/models/corridor.model.unit.test.ts
import { describe, it, expect } from 'vitest';
import { Corridor } from './corridor.model';

describe('Corridor Model Validation', () => {
  it('validates required fields', () => {
    const corridor = new Corridor({});
    const validationError = corridor.validateSync();

    expect(validationError?.errors).toHaveProperty('slug');
    expect(validationError?.errors).toHaveProperty('title');
  });

  it('accepts valid corridor', () => {
    const corridor = new Corridor({
      slug: 'test-corridor',
      title: 'Test Corridor',
      type: 'city-to-city',
      status: 'DRAFT',
    });

    const validationError = corridor.validateSync();
    expect(validationError).toBeUndefined();
  });

  it('rejects invalid status enum', () => {
    const corridor = new Corridor({
      slug: 'test',
      title: 'Test',
      type: 'city-to-city',
      status: 'INVALID_STATUS',
    });

    const validationError = corridor.validateSync();
    expect(validationError?.errors).toHaveProperty('status');
  });
});
```

## Test Coverage Tips

1. **Happy path** - Valid input produces expected output
2. **Edge cases** - Empty strings, zero, null, undefined
3. **Boundary values** - Min/max values, string length limits
4. **Error cases** - Invalid input, missing required fields
5. **Type coercion** - Strings that should be numbers, etc.
