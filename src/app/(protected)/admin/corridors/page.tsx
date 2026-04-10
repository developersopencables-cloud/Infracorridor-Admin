import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Map, Plus, Loader2 } from "lucide-react";

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
import { CorridorModel } from "@/models";
import { Corridor } from "@/types/corridor";
import { sanitizeSearch } from "@/utils/validation";
import { CorridorsPageClient } from "./corridors-page-client";
import Link from "next/link";

type CorridorStatus = "DRAFT" | "PUBLISHED";
type CorridorType = "city-to-city" | "country-to-country";

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    type?: string;
    page?: string;
  };
}

async function fetchCorridors(params: {
  search?: string;
  status?: CorridorStatus | "ALL";
  type?: CorridorType;
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

  const sanitizedSearch = sanitizeSearch(params.search ?? null);
  if (sanitizedSearch) {
    query.$or = [
      { title: { $regex: sanitizedSearch, $options: "i" } },
      { fromCity: { $regex: sanitizedSearch, $options: "i" } },
      { toCity: { $regex: sanitizedSearch, $options: "i" } },
      { fromCountry: { $regex: sanitizedSearch, $options: "i" } },
      { toCountry: { $regex: sanitizedSearch, $options: "i" } },
      { summary: { $regex: sanitizedSearch, $options: "i" } },
    ];
  }

  const page = params.page || 1;
  const limit = params.limit || 50;
  const skip = (page - 1) * limit;

  const [corridors, total] = await Promise.all([
    CorridorModel.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CorridorModel.countDocuments(query),
  ]);

  const publishedCount = corridors.filter((c) => c.status === "PUBLISHED").length;
  const draftCount = corridors.filter((c) => c.status === "DRAFT").length;

 
  const transformedCorridors = corridors.map((corridor) => {
    const plain: any = {
      ...corridor,
      _id: corridor._id.toString(),
      vendorIds: corridor.vendorIds?.map((id: any) => id.toString()) || [],
      categoryIds: corridor.categoryIds?.map((id: any) => id.toString()) || [],
      vendorCategoryPairs: corridor.vendorCategoryPairs?.map((pair: any) => ({
        vendorId: pair.vendorId?.toString(),
        categoryId: pair.categoryId?.toString(),
        order: pair.order ?? 0,
      })) || [],
      orderedCategories: corridor.orderedCategories?.map((oc: any) => ({
        categoryId: oc.categoryId?.toString(),
        order: oc.order ?? 0,
      })) || [],
      subseaSystems: corridor.subseaSystems?.map((sys: any) => ({
        cableId: sys.cableId?.toString ? sys.cableId.toString() : sys.cableId,
        name: sys.name,
        imageUrl: sys.imageUrl,
      })) || [],
      createdAt: corridor.createdAt instanceof Date ? corridor.createdAt.toISOString() : corridor.createdAt,
      updatedAt: corridor.updatedAt instanceof Date ? corridor.updatedAt.toISOString() : corridor.updatedAt,
    };
    return plain;
  }) as Corridor[];

  return {
    corridors: transformedCorridors,
    total,
    stats: {
      total: total,
      published: publishedCount,
      draft: draftCount,
    },
  };
}

export default async function CorridorsPage({ searchParams }: PageProps) {
  // Check authentication
  const headersList = await headers();
  const adminCheck = await checkAdminSession(headersList);

  if (!adminCheck || !adminCheck.isAdmin) {
    redirect("/login");
  }

  // Parse search params - await the promise
  const params = await searchParams;
  const search = params.q || "";
  const status = (params.status || "ALL") as CorridorStatus | "ALL";
  const type = params.type as CorridorType | undefined;
  const page = parseInt(params.page || "1", 10);

  // Fetch data on server
  const { corridors, total, stats } = await fetchCorridors({
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
                <BreadcrumbLink href="">Corridors</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>All Corridors</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-3 p-4 bg-gray-50 overflow-x-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Map className="w-6 h-6" />
                Corridor Management
              </h1>
              <p className="text-sm text-gray-600">
                Manage corridor definitions, status, and related master data.
              </p>
            </div>
            <Link href="/admin/corridors/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Corridor
              </Button>
            </Link>
          </div>

          {/* Stats - Compact */}
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <CardDescription className="text-xs text-gray-600">
                  Total Corridors
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
          </div>

          {/* Corridor Tables */}
          <Card className="border-gray-200 flex-1 flex flex-col min-h-0">
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Corridors ({corridors.length})
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
                {corridors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Map className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No corridors found
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm">
                      {search || status !== "ALL" || type
                        ? "Try adjusting your filters to see more results"
                        : "Get started by creating your first corridor"}
                    </p>
                    {!search && status === "ALL" && !type && (
                      <Link href="/admin/corridors/new">
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Corridor
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="h-full overflow-auto">
                    <div className="space-y-6 p-4">
                      <CorridorsPageClient 
                        corridors={corridors} 
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
