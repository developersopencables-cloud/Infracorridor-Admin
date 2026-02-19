import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Layers, Loader2 } from "lucide-react";

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
import connectMongoose from "@/database/mongoose-connection";
import { CategoryClassificationModel } from "@/models";
import { CategoryClassification } from "@/types/corridor";
import { sanitizeSearch } from "@/utils/validation";
import { CategoryClassificationsPageClient } from "./category-classifications-page-client";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}

async function fetchClassifications(params: {
  search?: string | null;
  page?: number;
}) {
  await connectMongoose();

  const limit = 50;
  const page = params.page || 1;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  const sanitizedSearch = sanitizeSearch(params.search || null);
  if (sanitizedSearch) {
    query.$or = [
      { name: { $regex: sanitizedSearch, $options: "i" } },
      { description: { $regex: sanitizedSearch, $options: "i" } },
    ];
  }

  const [classifications, total] = await Promise.all([
    CategoryClassificationModel.find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CategoryClassificationModel.countDocuments(query),
  ]);

  const transformedClassifications = classifications.map((c) => ({
    ...c,
    _id: c._id.toString(),
  })) as CategoryClassification[];

  return { classifications: transformedClassifications, total };
}

export default async function CategoryClassificationsPage({
  searchParams,
}: PageProps) {
  // Check authentication
  const headersList = await headers();
  const adminCheck = await checkAdminSession(headersList);

  if (!adminCheck || !adminCheck.isAdmin) {
    redirect("/login");
  }

  // Parse search params
  const params = await searchParams;
  const search = params.q || "";
  const page = parseInt(params.page || "1", 10);

  // Fetch data on server
  const { classifications, total } = await fetchClassifications({
    search: search || null,
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
                <BreadcrumbLink href="">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="">Master Data</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Category Classifications</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-3 p-4 bg-gray-50 overflow-x-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            }
          >
            <CategoryClassificationsPageClient
              classifications={classifications}
              totalItems={total}
              currentPage={page}
            />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
