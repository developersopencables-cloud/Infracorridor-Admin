/**
 * Simple in-memory rate limiting utility
 * In-memory rate limiting will NOT work correctly across multiple instances
 * and will reset on each serverless function invocation.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (e.g., IP address, email, userId)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limit exceeded, false otherwise
 */
export function checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(key);


    if (Math.random() < 0.001) {
        cleanupExpiredEntries();
    }

    if (!entry || now > entry.resetTime) {

        const resetTime = now + windowMs;
        rateLimitStore.set(key, {
            count: 1,
            resetTime,
        });
        return {
            allowed: true,
            remaining: maxRequests - 1,
            resetTime,
        };
    }

    if (entry.count >= maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime,
        };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Reset rate limit for a key (useful for testing or manual unlock)
 */
export function resetRateLimit(key: string): void {
    rateLimitStore.delete(key);
}

/**
 * Get rate limit info without incrementing
 */
export function getRateLimitInfo(
    key: string,
    maxRequests: number,
    windowMs: number
): { remaining: number; resetTime: number } {
    const entry = rateLimitStore.get(key);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
        return {
            remaining: maxRequests,
            resetTime: now + windowMs,
        };
    }

    return {
        remaining: Math.max(0, maxRequests - entry.count),
        resetTime: entry.resetTime,
    };
}

