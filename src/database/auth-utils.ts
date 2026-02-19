/**
 * Utility functions for authentication and authorization
 */

import { auth } from "@/database/auth";

/**
 * User type with role field
 */
export type UserWithRole = {
    id: string;
    email: string;
    name?: string | null;
    emailVerified?: boolean;
    image?: string | null;
    role?: string;
    createdAt?: Date;
    updatedAt?: Date;
};

/**
 * Check if a user has admin role
 * 
 */
export function isAdmin(user: { role?: string } | null | undefined): boolean {
    return user?.role === "admin";
}

/**
 * Get user role (defaults to "user" if not set)
 * 
 */
export function getUserRole(user: { role?: string } | null | undefined): string {
    return user?.role || "user";
}

/**
 * Server-side: Get session and check if user is admin
 */
export async function checkAdminSession(headers: Headers): Promise<{
    isAdmin: boolean;
    user: UserWithRole;
    session: Awaited<ReturnType<typeof auth.api.getSession>>;
} | null> {
    try {
        const session = await auth.api.getSession({ headers });

        if (!session?.user) {
            return null;
        }

        const user = session.user as UserWithRole;

        return {
            isAdmin: isAdmin(user),
            user: user,
            session: session,
        };
    } catch (error) {
        console.error("Error checking admin session:", error);
        return null;
    }
}

