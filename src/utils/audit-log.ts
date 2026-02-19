/**
 * Audit logging utility for security events
 */

export enum AuditEventType {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILURE = 'LOGIN_FAILURE',
    LOGOUT = 'LOGOUT',
    SIGNUP = 'SIGNUP',
    PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
    PASSWORD_RESET_FAILURE = 'PASSWORD_RESET_FAILURE',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export interface AuditLogEntry {
    type: AuditEventType;
    userId?: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    timestamp: Date;
}

/**
 * Log a security event
 */
export function logAuditEvent(
    type: AuditEventType,
    data: {
        userId?: string;
        email?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, unknown>;
    }
): void {
    const entry: AuditLogEntry = {
        type,
        ...data,
        timestamp: new Date(),
    };

 
    if (process.env.NODE_ENV === 'development') {
        console.log('[AUDIT LOG]', JSON.stringify(entry, null, 2));
        return;
    }

    // In production, you should:
    // 1. Send to a logging service (CloudWatch, Datadog, etc.)
    // 2. Store in a database for compliance
    // 3. Send alerts for critical events

    console.error('[AUDIT LOG]', JSON.stringify(entry));

    // Example: Send critical events to monitoring service
    if (
        type === AuditEventType.ACCOUNT_LOCKED ||
        type === AuditEventType.SUSPICIOUS_ACTIVITY ||
        type === AuditEventType.RATE_LIMIT_EXCEEDED
    ) {
        // TODO: Send to monitoring/alerting service
        // await sendToMonitoringService(entry);
    }
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(headers: Headers): string {
    
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIP = headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    return 'unknown';
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(headers: Headers): string {
    return headers.get('user-agent') || 'unknown';
}

