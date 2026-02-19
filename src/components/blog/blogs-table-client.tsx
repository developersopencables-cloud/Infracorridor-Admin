"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  FileText,
  Search,
  Filter,
  ChevronDown,
  Check,
  Edit,
  Trash2,
  Eye,
  Map,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BlogWithCorridor } from "@/types/blog";
import { useDebounce } from "@/hooks/use-debounce";
import { Pagination } from "@/components/common/pagination";

type BlogStatus = "DRAFT" | "PUBLISHED";
type BlogType = "general" | "corridor";

interface BlogsTableClientProps {
  blogs: BlogWithCorridor[];
  totalItems: number;
  currentPage: number;
  onEdit: (blogId: string) => void;
  onView: (blog: BlogWithCorridor) => void;
  onDelete: (blog: BlogWithCorridor) => void;
}

export function BlogsTableClient({
  blogs,
  totalItems,
  currentPage,
  onEdit,
  onView,
  onDelete,
}: BlogsTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get current values from URL
  const currentSearch = searchParams.get("q") || "";
  const currentStatus = (searchParams.get("status") || "ALL") as "ALL" | BlogStatus;
  const currentType = (searchParams.get("type") || "ALL") as "ALL" | BlogType;

  // Local state for immediate UI feedback
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Debounce search to avoid excessive URL updates
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
    if (updates.q !== undefined || updates.status !== undefined || updates.type !== undefined) {
      params.set("page", "1");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }

  function handleStatusChange(status: "ALL" | BlogStatus) {
    updateURL({ status: status === "ALL" ? undefined : status });
  }

  function handleTypeChange(type: "ALL" | BlogType) {
    updateURL({ type: type === "ALL" ? undefined : type });
  }

  function clearFilters() {
    setSearchInput("");
    updateURL({ q: undefined, status: undefined, type: undefined });
  }

  const hasFilters = currentSearch || currentStatus !== "ALL" || currentType !== "ALL";

  // Group blogs by status
  const draftBlogs = blogs.filter((b) => b.status === "DRAFT");
  const publishedBlogs = blogs.filter((b) => b.status === "PUBLISHED");

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by title..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {/* Status Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="w-3.5 h-3.5" />
                <span>
                  Status:{" "}
                  {currentStatus === "ALL"
                    ? "All"
                    : currentStatus.charAt(0) +
                      currentStatus.slice(1).toLowerCase()}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => handleStatusChange("ALL")}
              >
                All
                {currentStatus === "ALL" && <Check className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => handleStatusChange("PUBLISHED")}
              >
                Published
                {currentStatus === "PUBLISHED" && (
                  <Check className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => handleStatusChange("DRAFT")}
              >
                Draft
                {currentStatus === "DRAFT" && <Check className="w-4 h-4" />}
              </Button>
            </PopoverContent>
          </Popover>

          {/* Type Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>
                  Type:{" "}
                  {currentType === "ALL"
                    ? "All"
                    : currentType.charAt(0).toUpperCase() +
                      currentType.slice(1)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => handleTypeChange("ALL")}
              >
                All Types
                {currentType === "ALL" && <Check className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => handleTypeChange("general")}
              >
                General
                {currentType === "general" && <Check className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => handleTypeChange("corridor")}
              >
                Corridor
                {currentType === "corridor" && <Check className="w-4 h-4" />}
              </Button>
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500 text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Blog Tables */}
      <div className="space-y-6">
        {publishedBlogs.length > 0 && (
          <BlogTableSection
            title="Published"
            data={publishedBlogs}
            status="PUBLISHED"
            onEdit={onEdit}
            onView={onView}
            onDelete={onDelete}
          />
        )}
        {draftBlogs.length > 0 && (
          <BlogTableSection
            title="Draft"
            data={draftBlogs}
            status="DRAFT"
            onEdit={onEdit}
            onView={onView}
            onDelete={onDelete}
          />
        )}
      </div>

      <Pagination
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={50}
      />
    </>
  );
}

interface BlogTableSectionProps {
  title: string;
  data: BlogWithCorridor[];
  status: "PUBLISHED" | "DRAFT";
  onEdit: (blogId: string) => void;
  onView: (blog: BlogWithCorridor) => void;
  onDelete: (blog: BlogWithCorridor) => void;
}

function BlogTableSection({
  title,
  data,
  status,
  onEdit,
  onView,
  onDelete,
}: BlogTableSectionProps) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <Badge variant="outline" className="text-xs">
          {data.length}
        </Badge>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white w-full max-w-full">
        <div className="overflow-x-auto overflow-y-visible max-w-full">
          <table
            className="caption-bottom text-sm"
            style={{ width: "max-content", minWidth: "100%" }}
          >
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground min-w-[250px] whitespace-nowrap">
                  Title
                </th>
                <th className="h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground min-w-[100px] whitespace-nowrap">
                  Type
                </th>
                <th className="h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground min-w-[180px] whitespace-nowrap">
                  Corridor
                </th>
                <th className="h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground min-w-[120px] whitespace-nowrap">
                  Author
                </th>
                <th className="h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground min-w-[100px] whitespace-nowrap">
                  Status
                </th>
                <th className="h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground min-w-[120px] whitespace-nowrap">
                  Updated
                </th>
                <th className="h-10 px-4 text-right align-middle text-xs font-semibold text-muted-foreground min-w-[140px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((blog) => (
                <tr
                  key={blog._id}
                  className="border-b transition-colors hover:bg-gray-50"
                >
                  <td className="p-4 align-middle text-sm min-w-[250px]">
                    <div>
                      <div className="font-medium text-sm line-clamp-1">
                        {blog.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {blog.slug}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[100px]">
                    <Badge
                      variant={blog.type === "general" ? "secondary" : "outline"}
                      className="capitalize"
                    >
                      {blog.type}
                    </Badge>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[180px]">
                    {blog.type === "corridor" && blog.corridors && blog.corridors.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Map className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700 line-clamp-1">
                          {blog.corridors[0].title}
                          {blog.corridors.length > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{blog.corridors.length - 1} more
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[120px]">
                    <span className="text-sm text-gray-600">
                      {blog.authorName}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[100px]">
                    <Badge
                      variant={status === "PUBLISHED" ? "default" : "secondary"}
                    >
                      {status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[120px]">
                    <span className="text-sm text-gray-600">
                      {new Date(blog.updatedAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[140px]">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(blog)}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <Eye className="w-4 h-4 cursor-pointer" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(blog._id)}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <Edit className="w-4 h-4 cursor-pointer" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(blog)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 cursor-pointer" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
