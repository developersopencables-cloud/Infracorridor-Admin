export const MAX_FIELD_LENGTHS = {
    country: 100,
    region: 100,
    logoUrl: 500,
    website: 500,
} as const;

export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function validateLength(
    value: string | undefined | null,
    fieldName: string,
    maxLength: number,
    minLength: number = 0
): { valid: boolean; error?: string } {
    if (value === undefined || value === null) {
        return { valid: true };
    }

    const trimmed = value.trim();

    if (trimmed.length < minLength) {
        return {
            valid: false,
            error: `${fieldName} must be at least ${minLength} characters`,
        };
    }

    if (trimmed.length > maxLength) {
        return {
            valid: false,
            error: `${fieldName} must be less than ${maxLength} characters`,
        };
    }

    return { valid: true };
}

export function validateUrl(url: string | undefined | null): { valid: boolean; error?: string } {
    if (!url || !url.trim()) {
        return { valid: true };
    }

    const trimmed = url.trim();

    if (trimmed.startsWith("/uploads/")) {
        return { valid: true };
    }


    return { valid: true };
}

export function sanitizeSearch(search: string | null): string | null {
    if (!search || !search.trim()) {
        return null;
    }

    const trimmed = search.trim();
    if (trimmed.length > 200) {
        return trimmed.substring(0, 200);
    }

    return escapeRegex(trimmed);
}

