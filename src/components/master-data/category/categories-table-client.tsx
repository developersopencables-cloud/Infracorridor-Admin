"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Edit, Trash2, Layers } from "lucide-react";
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
import { Category, CategoryClassification } from "@/types/corridor";
import { useDebounce } from "@/hooks/use-debounce";
import { Pagination } from "@/components/common/pagination";

interface CategoriesTableClientProps {
  categories: Category[];
  classifications: CategoryClassification[];
  totalItems: number;
  currentPage: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function formatDate(value?: string | Date): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function CategoriesTableClient({
  categories,
  classifications,
  totalItems,
  currentPage,
  onEdit,
  onDelete,
}: CategoriesTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get current values from URL
  const currentSearch = searchParams.get("q") || "";
  const currentClassificationId = searchParams.get("classificationId") || "all";

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
    if (updates.q !== undefined || updates.classificationId !== undefined) {
      params.set("page", "1");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }

  function handleClassificationChange(value: string) {
    updateURL({ classificationId: value === "all" ? undefined : value });
  }

  function clearFilters() {
    setSearchInput("");
    updateURL({ q: undefined, classificationId: undefined });
  }

  const hasFilters = currentSearch || currentClassificationId !== "all";

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="search"
              placeholder="Search by title or description..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-[200px]">
            <Select
              value={currentClassificationId}
              onValueChange={handleClassificationChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                {classifications.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
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

      {/* Categories Table */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No categories found</h3>
          <p className="text-muted-foreground mb-4">
            {currentSearch
              ? "Try adjusting your search"
              : "Get started by creating your first category"}
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
                      <TableHead>Title</TableHead>
                      <TableHead>Classification</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Updated At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category._id}>
                        <TableCell>
                          <div className="font-medium">{category.title}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(category as any).classificationIds?.map((c: any) => {
                              const id = typeof c === "string" ? c : c._id;
                              const name = typeof c === "string" ? "Unknown" : c.name;
                              return (
                                <div
                                  key={id}
                                  className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full"
                                >
                                  {name}
                                </div>
                              );
                            })}
                            {(!(category as any).classificationIds ||
                              (category as any).classificationIds.length === 0) && (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                            {category.description || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(category.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(category.updatedAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(category)}
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
                    Showing {categories.length} categor
                    {categories.length === 1 ? "y" : "ies"}.
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
