"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Loader2, 
  Map as MapIcon, 
  Cable, 
  X, 
  Search, 
  Route, 
  Zap, 
  Network, 
  Server,
  Globe,
  Mail,
  ArrowRight,
  GalleryVerticalEnd
} from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/utils/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useSession } from "@/database/auth-client";
import { useCorridor, useBlogs } from "@/hooks/use-api";
import type { Corridor, Vendor, Category, SubseaSystem } from "@/types/corridor";
import { BlogDocument } from "@/models/Blog";

interface CorridorDataResponse {
  corridor: Corridor;
  relations: {
    vendors: { corridorId: string; vendorId: string }[];
    categories: { corridorId: string; categoryId: string }[];
  };
  details?: {
    vendors?: Vendor[];
    categories?: Category[];
  };
}

interface CategoryGroup {
  categoryId: string;
  category: Category | null;
  vendors: Vendor[];
}

const formatDate = (value?: string | Date): string => {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function CorridorDetailsPage() {
  const { isPending } = useSession();
  const router = useRouter();
  const params = useParams();

  const id = useMemo(() => {
    if (!params?.id) return "";
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params]);

  const { data: corridorData, isLoading: loading, error } = useCorridor(id);
  const { data: blogsResponse } = useBlogs({ 
    corridorId: id, 
    status: "PUBLISHED",
    limit: 3 
  });

  const corridor = useMemo(() => {
    const data = corridorData as CorridorDataResponse | undefined;
    return data?.corridor ?? null;
  }, [corridorData]);

  const categories = useMemo(() => {
    const data = corridorData as CorridorDataResponse | undefined;
    return data?.details?.categories ?? [];
  }, [corridorData]);

  const vendors = useMemo(() => {
    const data = corridorData as CorridorDataResponse | undefined;
    return data?.details?.vendors ?? [];
  }, [corridorData]);

  const relatedBlogs = useMemo(() => (blogsResponse as any)?.data ?? [], [blogsResponse]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSubsea, setSelectedSubsea] = useState<SubseaSystem | null>(null);

  const groupedCategories = useMemo<CategoryGroup[]>(() => {
    if (!corridor) return [];

    const map = new Map<string, CategoryGroup>();
    const categoryMap = new Map((categories || []).map((cat) => [cat._id, cat]));
    const vendorMap = new Map((vendors || []).map((ven) => [ven._id, ven]));

    const sortedPairs = [...(corridor.vendorCategoryPairs || [])].sort((a, b) =>
      (a.order ?? 0) - (b.order ?? 0)
    );

    sortedPairs.forEach((pair) => {
      const { vendorId, categoryId } = pair;
      if (!map.has(categoryId)) {
        map.set(categoryId, {
          categoryId,
          category: categoryMap.get(categoryId) ?? null,
          vendors: [],
        });
      }
      const vendor = vendorMap.get(vendorId);
      if (vendor) {
        const group = map.get(categoryId);
        if (group && !group.vendors.some((v) => v._id === vendorId)) {
          group.vendors.push(vendor);
        }
      }
    });

    (corridor.categoryIds ?? []).forEach((categoryId) => {
      if (!map.has(categoryId)) {
        map.set(categoryId, {
          categoryId,
          category: categoryMap.get(categoryId) ?? null,
          vendors: [],
        });
      }
    });

    // Sort category groups by orderedCategories order
    const orderedCategories = corridor.orderedCategories || [];
    const categoryOrderMap = new Map(orderedCategories.map((oc) => [oc.categoryId, oc.order]));

    const groups = Array.from(map.values());

    // Sort: categories with explicit order come first (in order), others follow
    groups.sort((a, b) => {
      const orderA = categoryOrderMap.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER;
      const orderB = categoryOrderMap.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    return groups;
  }, [corridor, categories, vendors]);

  const accentColors = [
    "border-blue-600",
    "border-emerald-600",
    "border-indigo-600",
    "border-amber-600",
    "border-purple-600",
    "border-pink-600",
    "border-cyan-600"
  ];

  const routeLabel = useMemo(() => {
    if (!corridor) return "-";
    
    let from = "";
    let to = "";

    if (corridor.type === "city-to-city") {
      from = corridor.fromCity || corridor.fromCountry || "-";
      to = corridor.toCity || corridor.toCountry || "-";
    } else {
     
      from = corridor.fromCountry || corridor.fromCity || "-";
      to = corridor.toCountry || corridor.toCity || "-";
    }

    return `${from} ↔ ${to}`;
  }, [corridor]);

  if (isPending || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!corridor) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border">
          <p className="text-lg font-semibold text-gray-900">Corridor not found</p>
          <Button className="mt-4" onClick={() => router.push("/admin/corridors")}>
            Return to Corridors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-white overflow-x-hidden">
        {selectedSubsea ? (
          /* Subsea System Detail View */
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Subsea Header / Navigation */}
            <div className="px-6 py-4 flex items-center border-b bg-white sticky top-0 z-30">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:text-gray-900"
                onClick={() => setSelectedSubsea(null)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {routeLabel}
              </Button>
            </div>

            <div className="max-w-[1200px] w-full mx-auto px-6 py-8 space-y-12 flex-1">
              {/* Hero Section for Subsea */}
              <div className="relative rounded-[20px] overflow-hidden h-[120px] flex items-center shadow-lg mb-10">
                <div className="absolute inset-0">
                  <Image 
                    src="/corridor-bg.png" 
                    alt="Hero Background" 
                    fill 
                    className="object-cover" 
                    priority
                  />
                  <div className="absolute inset-0 bg-black/10" />
                </div>
                
                <div className="relative z-10 px-10 text-left">
                  <h1 className="text-3xl font-bold text-white tracking-tight">
                    {selectedSubsea.name}
                  </h1>
                  <p className="text-white/70 text-sm font-medium mt-1">
                    Submarine Cable
                  </p>
                </div>
              </div>

              {/* Main Visual Section */}
              <div className="space-y-10">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex justify-center items-center">
                  {selectedSubsea.imageUrl ? (
                    <div className="inline-block overflow-hidden rounded-xl">
                      <img 
                        src={selectedSubsea.imageUrl} 
                        alt={selectedSubsea.name}
                        className="h-auto w-auto max-w-full max-h-[75vh] object-contain shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] flex flex-col items-center justify-center text-gray-400  rounded-[24px]">
                      <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                        <MapIcon className="h-12 w-12 text-blue-200" />
                      </div>
                      <p className="text-lg font-medium">No system map available</p>
                    </div>
                  )}
                </div>

                {/* <div className="bg-[#f8fbff] rounded-3xl p-8 border border-blue-50/50">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    System Overview
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    The {selectedSubsea.name} is a high-capacity submarine cable system strategically integrated into this infrastructure corridor. It provides critical connectivity and redundancy for high-bandwidth data transmission between landing points.
                  </p>
                </div> */}
              </div>

              <div className="flex justify-center pt-8">
                <Button 
                   onClick={() => setSelectedSubsea(null)}
                   className="bg-[#3353a2] hover:bg-[#253f7c] text-white px-10 py-6 rounded-2xl text-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/10"
                >
                  Return to Corridor Overview
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Main Corridor View */
          <>
            {/* Navigation / Back Button */}
            <div className="px-6 py-4 flex items-center justify-between border-b bg-white sticky top-0 z-30">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:text-gray-900"
                onClick={() => router.push("/admin/corridors")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Corridors
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant={corridor.status === "PUBLISHED" ? "default" : "secondary"}>
                  {corridor.status}
                </Badge>
                <Link href={`/admin/corridors/${corridor._id}`}>
                  <Button size="sm" variant="outline">Edit Corridor</Button>
                </Link>
              </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-12 animate-in fade-in slide-in-from-left-4 duration-500">
              
              {/* Header Section */}
              <div className="relative rounded-3xl overflow-hidden h-[300px] flex flex-col items-center justify-center text-center shadow-xl">
                {/* Background Image */}
                <div className="absolute inset-0">
                  <Image 
                    src="/corridor-bg.png" 
                    alt="Corridor Background" 
                    fill 
                    className="object-cover" 
                    priority
                  />
                  <div className="absolute inset-0 bg-black/40" />
                </div>
                
                <div className="relative z-10 space-y-4 px-6">
                  <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                    {routeLabel} 
                  </h1>
                  <p className="text-white/90 text-lg max-w-2xl mx-auto leading-relaxed">
                    {corridor.title}.
                  </p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#f3f6f9] rounded-2xl p-7 shadow-sm transition-transform hover:-translate-y-1 duration-300">
                  <div className="text-base text-gray-700 font-medium mb-1">Distance</div>
                  <div className="text-3xl font-bold text-[#3353a2]">{corridor.distanceKm.toLocaleString()} Km</div>
                </div>

                <div className="bg-[#f3f6f9] rounded-2xl p-7 shadow-sm transition-transform hover:-translate-y-1 duration-300">
                  <div className="text-base text-gray-700 font-medium mb-1">Latency (avg)</div>
                  <div className="text-3xl font-bold text-[#3353a2]">{corridor.avgLatencyMs}ms</div>
                </div>

                {/* Dynamic Custom Fields from DB */}
                {corridor.customFields?.map((field, idx) => (
                  <div key={idx} className="bg-[#f3f6f9] rounded-2xl p-7 shadow-sm transition-transform hover:-translate-y-1 duration-300">
                    <div className="text-base text-gray-700 font-medium mb-1">{field.name}</div>
                    <div className="text-3xl font-bold text-[#3353a2]">{field.value}</div>
                  </div>
                ))}

                {/* Fill empty slots with 'Not available' to maintain at least 4 columns UI */}
                {Array.from({ length: Math.max(0, 2 - (corridor.customFields?.length || 0)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-[#f3f6f9] rounded-2xl p-7 shadow-sm opacity-60">
                    <div className="text-base text-gray-700 font-medium mb-1">Additional Info</div>
                    <div className="text-3xl font-bold text-[#3353a2]">Not available</div>
                  </div>
                ))}
              </div>

              {/* Summary & Map Section - Fixed Space Layout */}
              <div className="grid grid-cols-2 gap-12">
                {/* Left Side - Fixed Height Container */}
                <div className="h-[380px] flex flex-col">
                  <div className="flex-1 flex flex-col min-h-0">
                    <h3 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4 flex-shrink-0">Summary</h3>
                    <div className="text-gray-600 leading-relaxed max-w-none whitespace-pre-wrap overflow-auto flex-1">
                      {corridor.summary}
                    </div>
                  </div>

                  {corridor.subseaSystems && corridor.subseaSystems.length > 0 && (
                    <div className="mt-6 flex-shrink-0">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Subsea Systems</h3>
                      <div className="flex flex-wrap gap-2 text-blue-600 font-medium text-sm">
                        {corridor.subseaSystems.map((sys, idx, arr) => (
                          <span key={sys.cableId} className="flex items-center">
                            <button
                              onClick={() => setSelectedSubsea(sys)}
                              className="hover:underline text-left transition-colors hover:text-blue-800"
                            >
                              {sys.name}
                            </button>
                            {idx < arr.length - 1 && <span className="mx-1 text-gray-300">,</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side - Fixed Height Container */}
                <div className="relative h-[380px] rounded-3xl overflow-hidden border-8 border-[#f8fafc] shadow-lg group">
                  {corridor.mapImageUrl ? (
                    <>
                      <Image
                        src={corridor.mapImageUrl}
                        alt="Corridor Map"
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <button
                        onClick={() => setPreviewUrl(corridor.mapImageUrl!)}
                        className="absolute inset-0 w-full h-full cursor-zoom-in"
                      />
                    </>
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 italic">
                      No Map Image Available
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Category Provider Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-8">
                {groupedCategories.map((group, idx) => {
                  return (
                    <div key={group.categoryId} className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                      {/* Category Header */}
                      <div className="p-6 border-b border-gray-50 bg-[#fafbfc]">
                        <h3 className="text-xl font-bold text-[#3353a2] mb-1">
                          {group.category?.title || "Uncategorized"}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium leading-tight">
                          {group.category?.description || ``}
                        </p>
                      </div>

                      {/* Vendor List */}
                      <div className="flex-1">
                        {group.vendors.map((v, vIdx) => (
                          <div 
                            key={v._id} 
                            className={cn(
                              "group relative px-6 py-4 transition-all duration-300 hover:bg-gray-50 cursor-pointer",
                              vIdx > 0 && "border-t border-dotted border-blue-200"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-[15px] font-bold text-gray-900 group-hover:text-[#3353a2] transition-colors leading-tight">
                                {v.name}
                              </p>
                              <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ArrowRight className="w-4 h-4 text-[#3353a2]" />
                              </div>
                            </div>
                          </div>
                        ))}
                        {group.vendors.length === 0 && (
                          <div className="px-6 py-8 text-center text-gray-400 italic text-sm">
                            No vendors linked to this category
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </>
        )}

        {/* Footer Section */}
        <footer className="bg-white text-white pt-24 pb-12 px-6 mt-24 border-t border-white/5">
         
        </footer>

        {previewUrl && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300"
            onClick={() => setPreviewUrl(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-50"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewUrl(null);
              }}
            >
              <X className="w-8 h-8" />
            </button>
            <div className="relative w-full max-w-6xl h-full max-h-[85vh] p-4">
              <Image 
                src={previewUrl} 
                alt="Map Preview" 
                fill 
                className="object-contain" 
              />
            </div>
          </div>
        )}

      </SidebarInset>
    </SidebarProvider>
  );
}
