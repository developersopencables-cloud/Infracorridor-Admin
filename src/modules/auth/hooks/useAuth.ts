/**
 * Client-side authentication hooks and utilities
 */

import { useSession } from "@/database/auth-client"
import { User } from "@/types/auth"

/**
 * Check if a user has admin role (client-side)
 */
export function isAdmin(user: (User | { role?: string }) | null | undefined): boolean {
  return user?.role === "admin";
}

/**
 * Get user role (defaults to "user" if not set) - client-side
 */
export function getUserRole(user: (User | { role?: string }) | null | undefined): string {
  return user?.role || "user";
}

/**
 * Hook to get current user with role utilities
 */
export function useAuth() {
  const { data: session, isPending, error } = useSession();

  return {
    user: session?.user,
    session,
    isPending,
    error,
    isAdmin: session?.user ? isAdmin(session.user) : false,
    userRole: session?.user ? getUserRole(session.user) : "user",
  };
}

