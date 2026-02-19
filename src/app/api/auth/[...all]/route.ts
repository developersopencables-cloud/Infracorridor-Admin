import { auth } from "@/database/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/utils/rate-limit";
import { AUTH_CONSTANTS } from "@/constants/auth";
import { logAuditEvent, AuditEventType, getClientIP, getUserAgent } from "@/utils/audit-log";
import { getSecurityHeaders } from "@/utils/security-headers";

const handler = toNextJsHandler(auth);

async function withRateLimit(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<Response>,
    rateLimitKey: string,
    maxRequests: number,
    windowMs: number,
    path: string
): Promise<Response> {
    const clientIP = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);


    const ipKey = `${rateLimitKey}:ip:${clientIP}`;
    const ipRateLimitResult = checkRateLimit(ipKey, maxRequests, windowMs);


    let emailRateLimitResult: { allowed: boolean; remaining: number; resetTime: number } | null = null;
    let email: string | undefined;

    if (path.includes("sign-in") || path.includes("request-password-reset")) {
        try {
           
            const clonedRequest = request.clone();
            const body = await clonedRequest.json().catch(() => ({}));
            email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : undefined;

            if (email) {
                const emailKey = `${rateLimitKey}:email:${email}`;
                emailRateLimitResult = checkRateLimit(emailKey, maxRequests, windowMs);
            }
        } catch {
        
        }
    }


    const isRateLimited = !ipRateLimitResult.allowed ||
        (emailRateLimitResult !== null && !emailRateLimitResult.allowed);

    if (isRateLimited) {
     
        const limitingResult = !ipRateLimitResult.allowed ? ipRateLimitResult :
            (emailRateLimitResult || ipRateLimitResult);

        logAuditEvent(AuditEventType.RATE_LIMIT_EXCEEDED, {
            ipAddress: clientIP,
            userAgent,
            metadata: {
                key: rateLimitKey,
                maxRequests,
                windowMs,
                path,
                email: email || undefined,
                ipLimited: !ipRateLimitResult.allowed,
                emailLimited: emailRateLimitResult ? !emailRateLimitResult.allowed : false,
            },
        });

        const response = NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429 }
        );

        response.headers.set("X-RateLimit-Limit", maxRequests.toString());
        response.headers.set("X-RateLimit-Remaining", "0");
        response.headers.set("X-RateLimit-Reset", new Date(limitingResult.resetTime).toISOString());

        Object.entries(getSecurityHeaders()).forEach(([headerKey, value]) => {
            response.headers.set(headerKey, value);
        });

        return response;
    }

    const response = await handler(request);


    const remainingCount = emailRateLimitResult !== null
        ? Math.min(ipRateLimitResult.remaining, emailRateLimitResult.remaining)
        : ipRateLimitResult.remaining;

    response.headers.set("X-RateLimit-Limit", maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", remainingCount.toString());
    response.headers.set("X-RateLimit-Reset", new Date(ipRateLimitResult.resetTime).toISOString());

    const clonedResponse = response.clone();
    clonedResponse.json().then((data: unknown) => {
        const responseData = data as {
            error?: unknown;
            user?: { id: string; email: string };
            email?: string;
        };

        if (path.includes("sign-in")) {
            if (responseData?.error) {
                logAuditEvent(AuditEventType.LOGIN_FAILURE, {
                    ipAddress: clientIP,
                    userAgent,
                    metadata: { error: responseData.error },
                });
            } else if (responseData?.user) {
                logAuditEvent(AuditEventType.LOGIN_SUCCESS, {
                    userId: responseData.user.id,
                    email: responseData.user.email,
                    ipAddress: clientIP,
                    userAgent,
                });
            }
        } else if (path.includes("sign-up")) {
            if (responseData?.user) {
                logAuditEvent(AuditEventType.SIGNUP, {
                    userId: responseData.user.id,
                    email: responseData.user.email,
                    ipAddress: clientIP,
                    userAgent,
                });
            }
        } else if (path.includes("request-password-reset")) {
            logAuditEvent(AuditEventType.PASSWORD_RESET_REQUEST, {
                email: responseData?.email || 'unknown',
                ipAddress: clientIP,
                userAgent,
            });
        } else if (path.includes("reset-password")) {
            if (responseData?.error) {
                logAuditEvent(AuditEventType.PASSWORD_RESET_FAILURE, {
                    ipAddress: clientIP,
                    userAgent,
                    metadata: { error: responseData.error },
                });
            }
        }
    }).catch(() => {

    });


    Object.entries(getSecurityHeaders()).forEach(([headerKey, value]) => {
        response.headers.set(headerKey, value);
    });

    return response;
}

export async function POST(request: NextRequest) {
    const url = new URL(request.url);
    const path = url.pathname;

    let rateLimitKey = "auth";
    let maxRequests: number = AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS;
    let windowMs: number = AUTH_CONSTANTS.LOCKOUT_DURATION_MS;

    if (path.includes("sign-in")) {
        rateLimitKey = "login";
        maxRequests = AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS;
        windowMs = AUTH_CONSTANTS.LOCKOUT_DURATION_MS;
    } else if (path.includes("sign-up")) {
        rateLimitKey = "signup";
        maxRequests = AUTH_CONSTANTS.MAX_SIGNUP_ATTEMPTS;
        windowMs = AUTH_CONSTANTS.SIGNUP_RATE_LIMIT_WINDOW_MS;
    } else if (path.includes("request-password-reset")) {
        rateLimitKey = "password-reset";
        maxRequests = AUTH_CONSTANTS.MAX_PASSWORD_RESET_REQUESTS;
        windowMs = AUTH_CONSTANTS.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS;
    } else if (path.includes("reset-password")) {

        rateLimitKey = "reset-password";
        maxRequests = 5; // Allow 5 reset attempts per IP per 15 minutes
        windowMs = AUTH_CONSTANTS.LOCKOUT_DURATION_MS;
    }

    return withRateLimit(request, handler.POST, rateLimitKey, maxRequests, windowMs, path);
}

export async function GET(request: NextRequest) {
   
    const response = await handler.GET(request);
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}