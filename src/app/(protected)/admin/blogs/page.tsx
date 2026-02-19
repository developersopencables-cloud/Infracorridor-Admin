import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { FileText, Plus, Loader2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { checkAdminSession } from "@/database/auth-utils";
import connectMongoose from "@/database/mongoose-connection";
import { BlogModel } from "@/models";
import { BlogWithCorridor, BlogStatus, BlogType } from "@/types/blog";
import { sanitizeSearch } from "@/utils/validation";
import { BlogsTableClient } from "@/components/blog/blogs-table-client";
import { BlogDeleteConfirmDialog } from "@/components/dialog/blog-delete-confirm-dialog";
import Link from "next/link";
import mongoose from "mongoose";
import { BlogsPageClient } from "./blogs-page-client";

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    type?: string;
    page?: string;
  };
}

async function fetchBlogs(params: {
  search?: string;
  status?: BlogStatus | "ALL";
  type?: BlogType;
  page?: number;
  limit?: number;
}) {
  await connectMongoose();

  const query: Record<string, unknown> = {};

  if (params.status && params.status !== "ALL") {
    query.status = params.status;
  }

  if (params.type) {
    query.type = params.type;
  }

  const sanitizedSearch = params.search ? sanitizeSearch(params.search) : null;
  if (sanitizedSearch) {
    query.title = { $regex: sanitizedSearch, $options: "i" };
  }

  const page = params.page || 1;
  const limit = params.limit || 50;
  const skip = (page - 1) * limit;

  const [blogs, total] = await Promise.all([
    BlogModel.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("corridorIds", "title slug fromCity toCity fromCountry toCountry")
      .lean(),
    BlogModel.countDocuments(query),
  ]);

  // Calculate stats
  const allBlogs = await BlogModel.find({}).lean();
  const publishedCount = allBlogs.filter((b) => b.status === "PUBLISHED").length;
  const draftCount = allBlogs.filter((b) => b.status === "DRAFT").length;
  const generalCount = allBlogs.filter((b) => b.type === "general").length;
  const corridorCount = allBlogs.filter((b) => b.type === "corridor").length;

  // Transform corridorIds to corridors for frontend
  const transformedBlogs = blogs.map((blog: any) => {
    const { corridorIds: corridors, corridorId: _oldId, ...rest } = blog;
    return {
      ...rest,
      _id: blog._id.toString(),
      authorId: blog.authorId?.toString(),
      publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : undefined,
      createdAt: blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
      updatedAt: blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
      corridors: corridors
        ? (corridors as any[]).map(c => ({
            ...c,
            _id: c._id?.toString(),
          }))
        : [],
      corridorIds: corridors ? (corridors as any[]).map(c => c._id?.toString()) : [],
    };
  }) as BlogWithCorridor[];

  return {
    blogs: transformedBlogs,
    total,
    stats: {
      total: allBlogs.length,
      published: publishedCount,
      draft: draftCount,
      general: generalCount,
      corridor: corridorCount,
    },
  };
}

export default async function BlogsPage({ searchParams }: PageProps) {
  // Check authentication
  const headersList = await headers();
  const adminCheck = await checkAdminSession(headersList);

  if (!adminCheck || !adminCheck.isAdmin) {
    redirect("/login");
  }

  // Parse search params - await the promise
  const params = await searchParams;
  const search = params.q || "";
  const status = (params.status || "ALL") as BlogStatus | "ALL";
  const type = params.type as BlogType | undefined;
  const page = parseInt(params.page || "1", 10);

  // Fetch data on server
  const { blogs, total, stats } = await fetchBlogs({
    search,
    status,
    type,
    page,
    limit: 50,
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
                <BreadcrumbLink href="">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="">Blogs</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>All Blogs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-3 p-4 bg-gray-50 overflow-x-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Blog Management
              </h1>
              <p className="text-sm text-gray-600">
                Create and manage blog articles for the platform.
              </p>
            </div>
            <Link href="/admin/blogs/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Blog
              </Button>
            </Link>
          </div>

          {/* Stats - Compact */}
          <div className="grid gap-3 md:grid-cols-5">
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  Total
                </CardDescription>
                <CardTitle className="text-2xl font-bold">
                  {stats.total}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  Published
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600">
                  {stats.published}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  Draft
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-amber-600">
                  {stats.draft}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  General
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-blue-600">
                  {stats.general}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  Corridor
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-purple-600">
                  {stats.corridor}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Blog Tables */}
          <Card className="border-gray-200 flex-1 flex flex-col min-h-0">
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Blogs ({blogs.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                }
              >
                {blogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No blogs found
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm">
                      {search || status !== "ALL" || type
                        ? "Try adjusting your filters to see more results"
                        : "Get started by creating your first blog"}
                    </p>
                    {!search && status === "ALL" && !type && (
                      <Link href="/admin/blogs/new">
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Blog
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="h-full overflow-auto">
                    <div className="space-y-6 p-4">
                      <BlogsPageClient 
                        blogs={blogs} 
                        totalItems={total}
                        currentPage={page}
                      />
                    </div>
                  </div>
                )}
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
