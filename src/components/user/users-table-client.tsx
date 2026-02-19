"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Shield, User as UserIcon, ShoppingCart, Store, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserManagementTable, User } from "@/components/user-management/user-management-table";
import { useDebounce } from "@/hooks/use-debounce";

interface UsersTableClientProps {
  users: User[];
  stats?: {
    admin: number;
    user: number;
    buyer: number;
    seller: number;
    total: number;
  };
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  totalItems: number;
  currentPage: number;
}

export function UsersTableClient({
  users,
  stats,
  totalItems,
  currentPage,
  onEdit,
  onDelete,
}: UsersTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get current values from URL
  const currentSearch = searchParams.get("q") || "";
  const currentRole = (searchParams.get("role") || "all") as
    | "all"
    | "admin"
    | "user"
    | "buyer"
    | "seller";

  // Local state for immediate UI feedback
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Debounce search
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update URL when debounced search changes
  React.useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      updateURL({ q: debouncedSearch || undefined });
    }
  }, [debouncedSearch]);

  function updateURL(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset to page 1 when filters change
    if (updates.q !== undefined || updates.role !== undefined) {
      params.set("page", "1");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }

  function handleRoleChange(role: "all" | "admin" | "user" | "buyer" | "seller" | null) {
    updateURL({ role: !role || role === "all" ? undefined : role });
  }

  return (
    <UserManagementTable
      users={users}
      loading={false}
      searchQuery={searchInput}
      onSearchChange={handleSearchChange}
      roleFilter={currentRole}
      onRoleFilterChange={handleRoleChange}
      onEdit={onEdit}
      onDelete={onDelete}
      stats={stats}
      totalItems={totalItems}
      currentPage={currentPage}
    />
  );
}
