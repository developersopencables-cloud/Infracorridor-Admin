"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Map,
  Search,
  Filter,
  ChevronDown,
  Check,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Corridor } from "@/types/corridor";
import { useDebounce } from "@/hooks/use-debounce";
import { Pagination } from "@/components/common/pagination";

type CorridorStatus = "DRAFT" | "PUBLISHED";
type CorridorType = "city-to-city" | "country-to-country";

interface CorridorsTableClientProps {
  corridors: Corridor[];
  totalItems: number;
  currentPage: number;
  onEdit: (corridorId: string) => void;
  onView: (corridorId: string) => void;
  onDelete: (corridor: Corridor) => void;
}

export function CorridorsTableClient({
  corridors,
  totalItems,
  currentPage,
  onEdit,
  onView,
  onDelete,
}: CorridorsTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get current values from URL
  const currentSearch = searchParams.get("q") || "";
  const currentStatus = (searchParams.get("status") || "ALL") as "ALL" | CorridorStatus;
  const currentType = (searchParams.get("type") || "ALL") as "ALL" | CorridorType;

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

  function handleStatusChange(status: "ALL" | CorridorStatus) {
    updateURL({ status: status === "ALL" ? undefined : status });
  }

  function handleTypeChange(type: "ALL" | CorridorType) {
    updateURL({ type: type === "ALL" ? undefined : type });
  }

  function clearFilters() {
    setSearchInput("");
    updateURL({ q: undefined, status: undefined, type: undefined });
  }

  const hasFilters = currentSearch || currentStatus !== "ALL" || currentType !== "ALL";

  // Group corridors by status
  const draftCorridors = corridors.filter((c) => c.status === "DRAFT");
  const publishedCorridors = corridors.filter((c) => c.status === "PUBLISHED");

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by title, cities, or summary..."
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
                    : currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()}
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
                {currentStatus === "PUBLISHED" && <Check className="w-4 h-4" />}
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
                <Map className="w-3.5 h-3.5" />
                <span>
                  Type:{" "}
                  {currentType === "ALL"
                    ? "All"
                    : currentType === "city-to-city"
                    ? "City-to-City"
                    : "Country-to-Country"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1" align="start">
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
                onClick={() => handleTypeChange("city-to-city")}
              >
                City-to-City
                {currentType === "city-to-city" && <Check className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => handleTypeChange("country-to-country")}
              >
                Country-to-Country
                {currentType === "country-to-country" && <Check className="w-4 h-4" />}
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

      {/* Corridor Tables */}
      <div className="space-y-6">
        {publishedCorridors.length > 0 && (
          <CorridorTableSection
            title="Published"
            data={publishedCorridors}
            status="PUBLISHED"
            onEdit={onEdit}
            onView={onView}
            onDelete={onDelete}
          />
        )}
        {draftCorridors.length > 0 && (
          <CorridorTableSection
            title="Draft"
            data={draftCorridors}
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

interface CorridorTableSectionProps {
  title: string;
  data: Corridor[];
  status: "PUBLISHED" | "DRAFT";
  onEdit: (corridorId: string) => void;
  onView: (corridorId: string) => void;
  onDelete: (corridor: Corridor) => void;
}

function CorridorTableSection({
  title,
  data,
  status,
  onEdit,
  onView,
  onDelete,
}: CorridorTableSectionProps) {
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
                <th className="h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground min-w-[100px] whitespace-nowrap">
                  Type
                </th>
                <th className="h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground min-w-[200px] whitespace-nowrap">
                  Corridor
                </th>
                <th className="h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground min-w-[180px] whitespace-nowrap">
                  Route
                </th>
                <th className="h-10 px-4 text-right align-middle text-xs font-semibold text-muted-foreground min-w-[100px] whitespace-nowrap">
                  Distance (km)
                </th>
                <th className="h-10 px-4 text-right align-middle text-xs font-semibold text-muted-foreground min-w-[100px] whitespace-nowrap">
                  Latency (ms)
                </th>
                <th className="h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground min-w-[100px] whitespace-nowrap">
                  Status
                </th>
                <th className="h-10 px-4 text-right align-middle text-xs font-semibold text-muted-foreground min-w-[140px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((corridor) => (
                <tr
                  key={corridor._id}
                  className="border-b transition-colors hover:bg-gray-50"
                >
                  <td className="p-4 align-middle text-sm min-w-[100px]">
                    <div className="text-xs text-gray-600 whitespace-nowrap">
                      {corridor.type}
                    </div>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[200px]">
                    <div>
                      <div className="font-medium text-sm">
                        {corridor.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {corridor.slug}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[180px]">
                    <div className="text-sm text-gray-700 whitespace-nowrap">
                      {corridor.type?.toLowerCase() === "city-to-city"
                        ? `${corridor.fromCity ?? "-"} → ${corridor.toCity ?? "-"}`
                        : `${corridor.fromCountry ?? "-"} → ${corridor.toCountry ?? "-"}`}
                    </div>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[100px] text-right">
                    <span className="text-sm font-medium">
                      {corridor.distanceKm.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[100px] text-right">
                    <span className="text-sm font-medium">
                      {corridor.avgLatencyMs}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[100px]">
                    <Badge
                      variant={status === "PUBLISHED" ? "default" : "secondary"}
                    >
                      {status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="p-4 align-middle text-sm min-w-[140px]">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(corridor._id)}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <Eye className="w-4 h-4 cursor-pointer" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(corridor._id)}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <Edit className="w-4 h-4 cursor-pointer" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(corridor)}
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
