"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Edit, Trash2, Building2, Tag } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Vendor, Category } from "@/types/corridor";
import { useDebounce } from "@/hooks/use-debounce";
import { Pagination } from "@/components/common/pagination";

interface VendorsTableClientProps {
  vendors: Vendor[];
  categories: Category[];
  categoryMap: Record<string, string>;
  totalItems: number;
  currentPage: number;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
}

function formatDate(value?: string | Date): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function VendorsTableClient({
  vendors,
  categories,
  categoryMap,
  totalItems,
  currentPage,
  onEdit,
  onDelete,
}: VendorsTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get current values from URL
  const currentSearch = searchParams.get("q") || "";
  const currentCategoryId = searchParams.get("categoryId") || "all";

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
    if (updates.q !== undefined || updates.categoryId !== undefined) {
      params.set("page", "1");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }

  function handleCategoryChange(value: string) {
    updateURL({ categoryId: value === "all" ? undefined : value });
  }

  function clearFilters() {
    setSearchInput("");
    updateURL({ q: undefined, categoryId: undefined });
  }

  const hasFilters = currentSearch || currentCategoryId !== "all";

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="search"
              placeholder="Search by name or description..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-[200px]">
            <Select value={currentCategoryId} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="ghost" size="default" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Vendors Table */}
      {vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No vendors found</h3>
          <p className="text-muted-foreground mb-4">
            {currentSearch
              ? "Try adjusting your search"
              : "Get started by creating your first vendor"}
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
                      <TableHead className="w-[80px]">Logo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor._id}>
                        <TableCell>
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            {vendor.logoUrl ? (
                              <Image
                                src={vendor.logoUrl}
                                width={48}
                                height={48}
                                alt={vendor.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  if (target.nextElementSibling) {
                                    (
                                      target.nextElementSibling as HTMLElement
                                    ).style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className="w-full h-full flex items-center justify-center text-muted-foreground"
                              style={{
                                display: vendor.logoUrl ? "none" : "flex",
                              }}
                            >
                              <Building2 className="w-6 h-6" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{vendor.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {vendor.categoryIds && vendor.categoryIds.length > 0 ? (
                              vendor.categoryIds.map((catId) => (
                                <div
                                  key={catId}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent text-xs font-medium"
                                >
                                  <Tag className="w-3 h-3" />
                                  {categoryMap[catId] || "Unknown"}
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No Categories
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                            {vendor.description || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(vendor.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(vendor)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(vendor)}
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
                    Showing {vendors.length} vendor{vendors.length === 1 ? "" : "s"}.
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
