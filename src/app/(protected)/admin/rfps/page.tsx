import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Loader2 } from "lucide-react";

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
import { checkAdminSession } from "@/database/auth-utils";
import connectMongoose from "@/database/mongoose-connection";
import RfpModel from "@/models/Rfp";
import { Rfp } from "@/types/rfp";
import { sanitizeSearch } from "@/utils/validation";
import { RfpsPageClient } from "./rfps-page-client";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}

async function fetchRfps(params: {
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
      { fullName: { $regex: sanitizedSearch, $options: "i" } },
      { company: { $regex: sanitizedSearch, $options: "i" } },
      { email: { $regex: sanitizedSearch, $options: "i" } },
    ];
  }

  const [rfps, total] = await Promise.all([
    RfpModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    RfpModel.countDocuments(query),
  ]);

  // Transform to plain objects with string IDs
  const transformedRfps = rfps.map((rfp) => ({
    ...rfp,
    _id: rfp._id.toString(),
  })) as Rfp[];

  return {
    rfps: transformedRfps,
    total: total,
  };
}

export default async function RfpsPage({ searchParams }: PageProps) {
  // Check authentication
  const headersList = await headers();
  const adminCheck = await checkAdminSession(headersList);

  if (!adminCheck || !adminCheck.isAdmin) {
    redirect("/login");
  }

  // Parse search params - await the promise
  const params = await searchParams;
  const search = params.q || "";
  const page = parseInt(params.page || "1", 10);

  // Fetch data on server
  const { rfps, total } = await fetchRfps({
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
              <BreadcrumbItem>
                <BreadcrumbPage>RFPs</BreadcrumbPage>
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
            <RfpsPageClient
              rfps={rfps}
              totalItems={total}
              currentPage={page}
            />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
