"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Edit, Trash2, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryClassification } from "@/types/corridor";
import { useDebounce } from "@/hooks/use-debounce";
import { Pagination } from "@/components/common/pagination";

interface CategoryClassificationsTableClientProps {
  classifications: CategoryClassification[];
  totalItems: number;
  currentPage: number;
  onEdit: (classification: CategoryClassification) => void;
  onDelete: (classification: CategoryClassification) => void;
}

function formatDate(value?: string | Date): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function CategoryClassificationsTableClient({
  classifications,
  totalItems,
  currentPage,
  onEdit,
  onDelete,
}: CategoryClassificationsTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get current values from URL
  const currentSearch = searchParams.get("q") || "";

  // Local state for immediate UI feedback
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Debounce search
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update URL when debounced search changes
  React.useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      updateURL({ q: debouncedSearch || undefined });
    }
  }, [debouncedSearch]);

  function updateURL(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    // Reset to page 1 when filters change
    if (updates.q !== undefined) {
      params.set("page", "1");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }

  function clearFilters() {
    setSearchInput("");
    updateURL({ q: undefined });
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            id="search"
            placeholder="Search by name or description..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {currentSearch && (
            <Button variant="ghost" size="default" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {classifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No classifications found</h3>
          <p className="text-muted-foreground">
            {currentSearch
              ? "Try adjusting your search"
              : "Get started by creating your first classification"}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden border rounded-lg">
              <div className="overflow-y-auto max-h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Namespace / Group</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classifications.map((classification) => (
                      <TableRow key={classification._id}>
                        <TableCell>
                          <div className="font-medium">{classification.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                            {classification.description || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(classification.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(classification)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(classification)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableCaption className="text-xs text-muted-foreground">
                    Showing {classifications.length} classification
                    {classifications.length === 1 ? "" : "s"}.
                  </TableCaption>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}

      <Pagination
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={50}
      />
    </>
  );
}
