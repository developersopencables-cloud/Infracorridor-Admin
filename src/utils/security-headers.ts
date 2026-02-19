/**
 * Security headers for API routes
 */

export const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
} as const;

/**
 * Apply security headers to a Response
 */
export function applySecurityHeaders(response: Response): Response {
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

/**
 * Create headers object for Next.js API routes
 */
export function getSecurityHeaders(): HeadersInit {
    return securityHeaders;
}

