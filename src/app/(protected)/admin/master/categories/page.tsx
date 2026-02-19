import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Layers, Plus, Loader2 } from "lucide-react";

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
import { CategoryModel, CategoryClassificationModel } from "@/models";
import { Category, CategoryClassification } from "@/types/corridor";
import { sanitizeSearch } from "@/utils/validation";
import { CategoriesPageClient } from "./categories-page-client";
import mongoose from "mongoose";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    classificationId?: string;
    page?: string;
  }>;
}

async function fetchCategories(params: {
  search?: string | null;
  classificationId?: string;
  page?: number;
}) {
  await connectMongoose();

  const limit = 50;
  const page = params.page || 1;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (params.classificationId && params.classificationId !== "all") {
    if (!mongoose.Types.ObjectId.isValid(params.classificationId)) {
      return { categories: [], classifications: [], total: 0 };
    }
    query.classificationIds = { $in: [params.classificationId] };
  }

  const sanitizedSearch = sanitizeSearch(params.search || null);
  if (sanitizedSearch) {
    query.$or = [
      { title: { $regex: sanitizedSearch, $options: "i" } },
      { description: { $regex: sanitizedSearch, $options: "i" } },
    ];
  }

  const [categories, classifications, total] = await Promise.all([
    CategoryModel.find(query)
      .populate("classificationIds", "name")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CategoryClassificationModel.find({}).sort({ name: 1 }).lean(),
    CategoryModel.countDocuments(query),
  ]);

  // Transform to plain objects with string IDs
  const transformedCategories = categories.map((cat) => ({
    ...cat,
    _id: cat._id.toString(),
    classificationIds: cat.classificationIds?.map((c: any) =>
      typeof c === "string" ? c : { ...c, _id: c._id.toString() }
    ),
  })) as Category[];

  const transformedClassifications = classifications.map((c) => ({
    ...c,
    _id: c._id.toString(),
  })) as CategoryClassification[];

  return {
    categories: transformedCategories,
    classifications: transformedClassifications,
    total: total,
  };
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  // Check authentication
  const headersList = await headers();
  const adminCheck = await checkAdminSession(headersList);

  if (!adminCheck || !adminCheck.isAdmin) {
    redirect("/login");
  }

  // Parse search params - await the promise
  const params = await searchParams;
  const search = params.q || "";
  const classificationId = params.classificationId || "all";
  const page = parseInt(params.page || "1", 10);

  // Fetch data on server
  const { categories, classifications, total } = await fetchCategories({
    search: search || null,
    classificationId,
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
                <BreadcrumbPage>Categories</BreadcrumbPage>
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
            <CategoriesPageClient
              categories={categories}
              classifications={classifications}
              totalItems={total}
              currentPage={page}
              stats={{
                totalCategories: total,
                totalClassifications: classifications.length,
              }}
            />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
