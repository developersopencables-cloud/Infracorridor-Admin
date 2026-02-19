"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Card } from "@/components/ui/card";
import { useSession } from "@/database/auth-client";
import {
  useCorridor,
  useCreateCorridor,
  useUpdateCorridor,
} from "@/hooks/use-api";
import type { Corridor } from "@/types/corridor";

import { StepOneForm, type CorridorFormState } from "./step-one-from";
import { StepTwoForm } from "./step-two-form";

interface CorridorFormProps {
  mode?: "create" | "edit";
  corridorId?: string | null;
}

const buildInitialFormState = (): CorridorFormState => ({
  type: "city-to-city",
  title: "",
  slug: "",
  fromCity: "",
  toCity: "",
  fromCountry: "",
  toCountry: "",
  distanceKm: 0,
  avgLatencyMs: 0,
  summary: "",
  mapImageUrl: "",
  status: "DRAFT",
  sponsor: {
    carrierName: "",
    companyName: "",
    logoUrl: "",
    websiteUrl: "",
    bannerUrl: "",
  },
  vendorIds: [],
  categoryIds: [],
  vendorCategoryPairs: [],
  orderedCategories: [],
  customFields: [],
  subseaSystems: [],
  metaTitle: "",
  metaDescription: "",
  keywords: [],
});

export default function CorridorForm({
  mode = "create",
  corridorId = null,
}: CorridorFormProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CorridorFormState>(
    buildInitialFormState,
  );

  const { data: corridorData, isLoading: loadingCorridor } =
    useCorridor(corridorId);
  const createMutation = useCreateCorridor();
  const updateMutation = useUpdateCorridor();

 
  const [initializedId, setInitializedId] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && corridorData && corridorId && initializedId !== corridorId) {
      const { corridor, relations } = corridorData as {
        corridor: Corridor & { orderedCategories?: { categoryId: string; order: number }[] };
        relations: {
          vendors: { vendorId: string }[];
          categories: { categoryId: string }[];
          vendorCategoryPairs: { vendorId: string; categoryId: string; order: number }[];
          orderedCategories?: { categoryId: string; order: number }[];
        };
      };

      // Get categoryIds from relations
      const categoryIds = relations.categories?.map((c) => c.categoryId) || [];

      // Load orderedCategories from API response, or generate fallback from categoryIds
      let orderedCategories = relations.orderedCategories || corridor.orderedCategories || [];
      if (orderedCategories.length === 0 && categoryIds.length > 0) {
        // Lazy migration: generate orderedCategories from categoryIds with sequential order
        orderedCategories = categoryIds.map((categoryId, index) => ({
          categoryId,
          order: index,
        }));
      }

      setFormData({
        ...corridor,
        vendorIds: relations.vendors?.map((v) => v.vendorId) || [],
        categoryIds,
        vendorCategoryPairs: relations.vendorCategoryPairs?.map((pair, index) => ({
          ...pair,
          order: pair.order ?? index,
        })) || [],
        orderedCategories,
        sponsor: corridor.sponsor ?? {
          carrierName: "",
          companyName: "",
          logoUrl: "",
          websiteUrl: "",
          bannerUrl: "",
        },
      });
      setInitializedId(corridorId);
    }
  }, [mode, corridorData, corridorId, initializedId]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  const validateStepOne = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = "Corridor title is required";
    }

    if (!formData.type) {
      newErrors.type = "Corridor type is required";
    }

    if (formData.type === "city-to-city") {
      if (!formData.fromCity?.trim()) {
        newErrors.fromCity = "From city is required";
      }
      if (!formData.toCity?.trim()) {
        newErrors.toCity = "To city is required";
      }
    } else {
      if (!formData.fromCountry?.trim()) {
        newErrors.fromCountry = "From country is required";
      }
      if (!formData.toCountry?.trim()) {
        newErrors.toCountry = "To country is required";
      }
    }

    if (!formData.distanceKm || formData.distanceKm <= 0) {
      newErrors.distanceKm = "Distance must be greater than 0";
    }

    if (!formData.avgLatencyMs || formData.avgLatencyMs <= 0) {
      newErrors.avgLatencyMs = "Average latency must be greater than 0";
    }

    if (!formData.summary?.trim()) {
      newErrors.summary = "Summary is required";
    }

    if (!formData.subseaSystems) {
      newErrors.subseaSystems = "Subsea systems data is missing";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStepOne()) {
      return;
    }
    setStep((prev) => prev + 1);
    setErrors({});
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
    setErrors({});
  };

  const handleSubmit = async (status: "DRAFT" | "PUBLISHED") => {
    const payload = {
      slug:
        formData.slug ||
        (formData.title || "")
          .toLowerCase()
          .replace(/ /g, "-")
          .replace(/[^\w-]+/g, ""),
      title: formData.title,
      type: formData.type,
      fromCity: formData.fromCity,
      toCity: formData.toCity,
      fromCountry: formData.fromCountry,
      toCountry: formData.toCountry,
      distanceKm: formData.distanceKm,
      avgLatencyMs: formData.avgLatencyMs,
      summary: formData.summary,
      mapImageUrl: formData.mapImageUrl,
      status,
      sponsor: formData.sponsor,
      vendorIds: formData.vendorIds || [],
      categoryIds: formData.categoryIds || [],
      vendorCategoryPairs: formData.vendorCategoryPairs || [],
      orderedCategories: formData.orderedCategories || [],
      customFields: (formData.customFields || []).filter(f => f.name && f.value),
      subseaSystems: formData.subseaSystems,
      // SEO fields
      metaTitle: formData.metaTitle,
      metaDescription: formData.metaDescription,
      keywords: formData.keywords || [],
    };

    if (mode === "edit" && corridorId) {
      updateMutation.mutate(
        { id: corridorId, data: payload },
        {
          onSuccess: () => {
            router.push("/admin/corridors");
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          router.push("/admin/corridors");
        },
      });
    }
  };

  const handleCancel = () => {
    router.push("/admin/corridors");
  };

  const currentTitle = useMemo(
    () => (mode === "create" ? "Create Corridor" : "Edit Corridor"),
    [mode],
  );

  const isLoading = isPending || (mode === "edit" && loadingCorridor);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-gray-50">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/corridors">
                  Corridors
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {mode === "create" ? "Create New" : "Edit"} Corridor
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex flex-col p-4 max-w-5xl mx-auto w-full">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{currentTitle}</h1>
          </div>

          <Card className="mb-4 p-4">
            <div className="flex items-center max-w-xl ">
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-medium transition-colors ${
                    step >= 1
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-gray-300 text-gray-400 bg-white"
                  }`}
                >
                  {step > 1 ? "✓" : "1"}
                </div>
                <div className="ml-2 text-sm font-medium text-gray-700">
                  Basic Information
                </div>
              </div>
              <div
                className={`flex-1 h-0.5 mx-4 transition-colors ${
                  step > 1 ? "bg-primary" : "bg-gray-300"
                }`}
              />
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-medium transition-colors ${
                    step >= 2
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-gray-300 text-gray-400 bg-white"
                  }`}
                >
                  2
                </div>
                <div className="ml-2 text-sm font-medium text-gray-700">
                  Categories & Vendors
                </div>
              </div>
            </div>
          </Card>

          <div className="flex-1">
            {step === 1 ? (
              <StepOneForm
                formData={formData}
                setFormData={setFormData}
                onNext={handleNext}
                onCancel={handleCancel}
                errors={errors}
              />
            ) : (
              <StepTwoForm
                formData={formData}
                setFormData={setFormData}
                onBack={handleBack}
                onSubmit={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
