"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/components/user-management/user-management-table";
import { UsersTableClient } from "@/components/user/users-table-client";
import { UserEditDialog } from "@/components/user-management/user-edit-dialog";
import { UserDeleteDialog } from "@/components/user-management/user-delete-dialog";

interface UsersPageClientProps {
  users: User[];
  totalItems: number;
  currentPage: number;
  stats: {
    admin: number;
    user: number;
    buyer: number;
    seller: number;
    total: number;
  };
}

export function UsersPageClient({
  users,
  stats,
  totalItems,
  currentPage,
}: UsersPageClientProps) {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
  };

  const handleFormSuccess = () => {
    setEditingUser(null);
    router.refresh();
  };

  const handleDeleteSuccess = () => {
    setDeletingUser(null);
    router.refresh();
  };

  return (
    <>
      <UsersTableClient
        users={users}
        stats={stats}
        totalItems={totalItems}
        currentPage={currentPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <UserEditDialog
        open={editingUser !== null}
        onOpenChange={(open) => !open && setEditingUser(null)}
        user={editingUser}
        onSuccess={handleFormSuccess}
      />

      <UserDeleteDialog
        open={deletingUser !== null}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        user={deletingUser}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
