"use client";

import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rfp } from "@/types/rfp";
import { RfpsTableClient } from "@/components/rfp/rfps-table-client";

interface RfpsPageClientProps {
  rfps: Rfp[];
  totalItems: number;
  currentPage: number;
}

export function RfpsPageClient({
  rfps,
  totalItems,
  currentPage,
}: RfpsPageClientProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">RFPs</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage Request for Proposal submissions
        </p>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            All RFPs
            {totalItems > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({totalItems} {totalItems === 1 ? "submission" : "submissions"})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RfpsTableClient
            rfps={rfps}
            totalItems={totalItems}
            currentPage={currentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
