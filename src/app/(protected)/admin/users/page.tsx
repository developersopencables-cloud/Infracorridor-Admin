import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Users, Loader2 } from "lucide-react";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { checkAdminSession } from "@/database/auth-utils";
import { getDb } from "@/database/mongoose";
import connectMongoose from "@/database/mongoose-connection";
import { SyncHistoryModel } from "@/models";
import { User } from "@/components/user-management/user-management-table";
import { sanitizeSearch } from "@/utils/validation";
import { UsersPageClient } from "./users-page-client";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    role?: string;
    page?: string;
  }>;
}

async function fetchUsers(params: {
  search?: string | null;
  role?: string;
  page?: number;
}) {
  const db = await getDb();
  await connectMongoose();

  const limit = 50;
  const page = params.page || 1;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (params.role && params.role !== "all") {
    query.role = params.role;
  }

  const sanitizedSearch = sanitizeSearch(params.search || null);
  if (sanitizedSearch) {
    const searchRegex = { $regex: sanitizedSearch, $options: "i" };
    query.$or = [{ email: searchRegex }, { name: searchRegex }];
  }

  const [users, total] = await Promise.all([
    db
      .collection("user")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("user").countDocuments(query),
  ]);

  const usersWithSyncHistory = await Promise.all(
    users.map(async (user) => {
      const syncHistoryCount = await SyncHistoryModel.countDocuments({
        userId: user._id.toString(),
      });

      const latestSync = await SyncHistoryModel.findOne({
        userId: user._id.toString(),
      })
        .sort({ timestamp: -1 })
        .select("timestamp status")
        .lean();

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name || null,
        role: user.role || "user",
        emailVerified: user.emailVerified || false,
        image: user.image || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        syncHistoryCount,
        latestSync: latestSync
          ? {
              timestamp: latestSync.timestamp,
              status: latestSync.status as "success" | "failure",
            }
          : null,
      };
    })
  );

  const roleStats = {
    admin: await db.collection("user").countDocuments({ role: "admin" }),
    user: await db.collection("user").countDocuments({ role: "user" }),
    buyer: await db.collection("user").countDocuments({ role: "buyer" }),
    seller: await db.collection("user").countDocuments({ role: "seller" }),
    total,
  };

  return { users: usersWithSyncHistory, stats: roleStats, total };
}

export default async function UsersPage({ searchParams }: PageProps) {
  // Check authentication
  const headersList = await headers();
  const adminCheck = await checkAdminSession(headersList);

  if (!adminCheck || !adminCheck.isAdmin) {
    redirect("/login");
  }

  // Parse search params - await the promise
  const params = await searchParams;
  const search = params.q || "";
  const role = params.role || "all";
  const page = parseInt(params.page || "1", 10);

  // Fetch data on server
  const { users, stats, total } = await fetchUsers({
    search: search || null,
    role,
    page,
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-x-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>User Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-3 p-4 bg-gray-50 overflow-x-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Users className="w-6 h-6" />
                User Management
              </h1>
              <p className="text-sm text-gray-600">
                Manage users, roles, and permissions.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-3 md:grid-cols-5">
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  Total Users
                </CardDescription>
                <CardTitle className="text-2xl font-bold">
                  {stats.total}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  Admins
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-purple-600">
                  {stats.admin}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  Users
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-blue-600">
                  {stats.user}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  Buyers
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600">
                  {stats.buyer}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  Sellers
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-amber-600">
                  {stats.seller}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Users Table */}
          <Card className="border-gray-200 flex-1 flex flex-col min-h-0">
            <CardHeader className="py-3 px-4 border-b">
              <div>
                <CardTitle className="text-base">
                  All Users ({total})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-hidden">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                }
              >
                <div className="h-full overflow-auto space-y-4">
                  <UsersPageClient
                    users={users}
                    totalItems={total}
                    currentPage={page}
                    stats={stats}
                  />
                </div>
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
