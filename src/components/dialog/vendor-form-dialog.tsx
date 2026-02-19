"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Vendor, Category } from "@/types/corridor";
import { ImageUpload } from "@/components/ui/image-upload";
import { vendorSchema, type VendorInput } from "@/validators/vendor.validator";
import {
  useCategories,
  useCreateVendor,
  useUpdateVendor,
} from "@/hooks/use-api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/utils";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";

interface VendorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
  onSuccess?: () => void;
}

export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  onSuccess,
}: VendorFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VendorInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      description: "",
      logoUrl: "",
      website: "",
      categoryIds: [],
    },
  });

  const logoUrl = watch("logoUrl");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const selectedCategoryIds = watch("categoryIds") || [];

  // Fetch categories using hook
  const { data: categoriesData = [], isLoading: isLoadingCategories } =
    useCategories();
  const categories = (categoriesData as Category[]) || [];

  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (vendor) {
        reset({
          name: vendor.name || "",
          description: vendor.description || "",
          logoUrl: vendor.logoUrl || "",
          website: vendor.website || "",
          categoryIds: vendor.categoryIds || [],
        });
      } else {
        reset({
          name: "",
          description: "",
          logoUrl: "",
          website: "",
          categoryIds: [],
        });
      }
    }
  }, [open, vendor, reset]);

  const onSubmit = async (data: VendorInput) => {
    const payload: VendorInput = {
      ...data,
      logoUrl: data.logoUrl || "",
      website: data.website || "",
    };

    if (vendor) {
      await updateMutation.mutateAsync(
        { id: vendor._id, data: payload },
        {
          onSuccess: () => {
            onSuccess?.();
            onOpenChange(false);
          },
        },
      );
    } else {
      await createMutation.mutateAsync(payload, {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
        },
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col m-4">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {vendor ? "Edit Vendor" : "Create New Vendor"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {vendor
                ? "Update vendor information"
                : "Add a new vendor to the system"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-6"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter vendor name"
                disabled={isSubmitting}
                aria-invalid={errors.name ? "true" : "false"}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Categories <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedCategoryIds.map((id: string) => {
                  const category = categories.find((c) => c._id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {category?.title || "Unknown"}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => {
                          setValue(
                            "categoryIds",
                            selectedCategoryIds.filter((i: string) => i !== id)
                          );
                        }}
                      />
                    </Badge>
                  );
                })}
                {selectedCategoryIds.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No categories selected
                  </span>
                )}
              </div>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="w-full justify-between"
                    disabled={isSubmitting || isLoadingCategories}
                  >
                    {isLoadingCategories ? "Loading..." : "Select Categories..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {categories.map((cat) => (
                          <CommandItem
                            key={cat._id}
                            value={cat.title}
                            onSelect={() => {
                              const currentIds = [...selectedCategoryIds];
                              const index = currentIds.indexOf(cat._id);
                              if (index > -1) {
                                currentIds.splice(index, 1);
                              } else {
                                currentIds.push(cat._id);
                              }
                              setValue("categoryIds", currentIds);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCategoryIds.includes(cat._id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {cat.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.categoryIds && (
                <p className="text-sm text-destructive">
                  {errors.categoryIds.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...register("description")}
                placeholder="Enter vendor description (optional)"
                rows={4}
                disabled={isSubmitting}
                className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...register("website")}
                placeholder="https://example.com (optional)"
                disabled={isSubmitting}
                type="url"
                aria-invalid={errors.website ? "true" : "false"}
              />
              {errors.website && (
                <p className="text-sm text-destructive">
                  {errors.website.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Vendor Logo</Label>
              <ImageUpload
              value={logoUrl || ""}
              onChange={(val: any) =>
                setValue(
                  "logoUrl",
                  typeof val === "string" ? val : val?.url || "",
                )
              }
              label="Logo"
              error={errors.logoUrl?.message}
              uploadType="vendor-logo"
                 hideUrlInput={true}
                 
            />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {vendor ? "Updating..." : "Creating..."}
                </>
              ) : vendor ? (
                "Update Vendor"
              ) : (
                "Create Vendor"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
