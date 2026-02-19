import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Building2, Plus, Loader2 } from "lucide-react";

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
import { VendorModel, CategoryModel } from "@/models";
import { Vendor, Category } from "@/types/corridor";
import { sanitizeSearch } from "@/utils/validation";
import { VendorsPageClient } from "./vendors-page-client";
import mongoose from "mongoose";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    page?: string;
  }>;
}

async function fetchVendors(params: {
  search?: string | null;
  categoryId?: string;
  page?: number;
}) {
  await connectMongoose();

  const limit = 50;
  const page = params.page || 1;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (params.categoryId && params.categoryId !== "all") {
    if (!mongoose.Types.ObjectId.isValid(params.categoryId)) {
      return { vendors: [], categories: [], total: 0 };
    }
    query.categoryIds = { $in: [params.categoryId] };
  }

  const sanitizedSearch = sanitizeSearch(params.search || null);
  if (sanitizedSearch) {
    query.$or = [
      { name: { $regex: sanitizedSearch, $options: "i" } },
      { description: { $regex: sanitizedSearch, $options: "i" } },
    ];
  }

  const [vendors, categories, total] = await Promise.all([
    VendorModel.find(query).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    CategoryModel.find({}).sort({ title: 1 }).lean(),
    VendorModel.countDocuments(query),
  ]);

  // Transform to plain objects with string IDs - properly serialize ALL ObjectIds
  const transformedVendors = vendors.map((vendor) => ({
    ...vendor,
    _id: vendor._id.toString(),
    categoryIds: vendor.categoryIds?.map((id: any) => id.toString()) || [],
  })) as Vendor[];

  const transformedCategories = categories.map((cat) => ({
    ...cat,
    _id: cat._id.toString(),
    classificationIds:
      cat.classificationIds?.map((id: any) => id.toString()) || [],
  })) as Category[];

  return {
    vendors: transformedVendors,
    categories: transformedCategories,
    total: total,
  };
}

export default async function VendorsPage({ searchParams }: PageProps) {
  // Check authentication
  const headersList = await headers();
  const adminCheck = await checkAdminSession(headersList);

  if (!adminCheck || !adminCheck.isAdmin) {
    redirect("/login");
  }

  // Parse search params - await the promise
  const params = await searchParams;
  const search = params.q || "";
  const categoryId = params.categoryId || "all";
  const page = parseInt(params.page || "1", 10);

  // Fetch data on server
  const { vendors, categories, total } = await fetchVendors({
    search: search || null,
    categoryId,
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
                <BreadcrumbPage>Vendors</BreadcrumbPage>
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
            <VendorsPageClient
              vendors={vendors}
              categories={categories}
              totalItems={total}
              currentPage={page}
              stats={{
                totalVendors: total,
                totalCategories: categories.length,
              }}
            />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
