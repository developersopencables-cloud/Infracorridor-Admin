"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/database/auth-client";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserManagementTable, User } from "@/components/user-management/user-management-table";
import { UserEditDialog } from "@/components/user-management/user-edit-dialog";
import { UserDeleteDialog } from "@/components/user-management/user-delete-dialog";
import { UserCreateDialog } from "@/components/user-management/user-create-dialog";
import { showError } from "@/utils/toast";
import { handleFetchError } from "@/utils/error-handler";

export default function AdminsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [stats, setStats] = useState<{ admin: number; user: number; buyer: number; seller: number; total: number } | undefined>();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);
  const {
    data: usersResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<{
    success: boolean;
    data: User[];
    stats?: { admin: number; user: number; buyer: number; seller: number; total: number };
  }>({
    queryKey: ["users", { role: "admin", searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("adminOnly", "true");

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(`/api/user-management?${params.toString()}`);
      
      if (!response.ok) {
        const errorMessage = await handleFetchError(response);
        showError("Error", errorMessage);
        throw new Error(errorMessage);
      }

      const json = await response.json();

      if (!json.success) {
        const errorMessage = json.error || "Failed to fetch users";
        showError("Error", errorMessage);
        throw new Error(errorMessage);
      }

      setStats(json.stats);
      return json;
    },
    enabled: !!session?.user,
  });

  const users = usersResponse?.data ?? [];

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
  };

  const handleFormSuccess = async () => {
    setEditingUser(null);
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    await refetch();
  };

  const handleDeleteSuccess = async () => {
    setDeletingUser(null);
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    await refetch();
  };

  const handleCreateSuccess = async () => {
    setCreatingUser(false);
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    await refetch();
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin/users">User Management</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Admins</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Administrators</h1>
              <p className="text-muted-foreground">
                Manage administrator accounts and permissions
              </p>
            </div>
            <Button onClick={() => setCreatingUser(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>

          <UserManagementTable
            users={users}
            loading={isLoading || isRefetching}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            roleFilter="admin"
            onRoleFilterChange={() => { }}
            onEdit={handleEdit}
            onDelete={handleDelete}
            stats={stats}
            totalItems={stats?.total ?? users.length}
            currentPage={1}
          />
        </div>
      </SidebarInset>

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

      <UserCreateDialog
        open={creatingUser}
        onOpenChange={(open) => setCreatingUser(open)}
        onSuccess={handleCreateSuccess}
        defaultRole="admin"
      />
    </SidebarProvider>
  );
}

