"use client";

import { useState, useRef, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import { AlertCircle, ChevronRight, ImageUp, Eye, X, Cable, Plus, CheckSquare, Square, ChevronDown, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/utils/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/ui/country-select";
import { CitySelect } from "@/components/ui/city-select";
import { ImageSelectorDialog } from "@/components/dialog/image-selector-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Corridor, CorridorSponsor, SubseaSystem, CustomField } from "@/types/corridor";
import { useUploadImage, useCableList, useCableImages } from "@/hooks/use-api";
import { useCountries } from "@/hooks/use-static-data";
import { type Country } from "@/services/static-data.service";
import { showError } from "@/utils/toast";
import { KeywordInput } from "@/components/blog/keyword-input";

export interface VendorCategoryPair {
  vendorId: string;
  categoryId: string;
  order: number;
}

export interface OrderedCategory {
  categoryId: string;
  order: number;
}

export type CorridorFormState = Partial<Corridor> & {
  sponsor: CorridorSponsor;
  vendorIds: string[]; // Keep for backward compatibility with API
  categoryIds: string[];
  vendorCategoryPairs: VendorCategoryPair[]; // New: category-specific vendor selections
  orderedCategories: OrderedCategory[]; // Category ordering
  customFields?: CustomField[];
  subseaSystems?: SubseaSystem[];
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
};

export interface StepOneFormProps {
  formData: CorridorFormState;
  setFormData: Dispatch<SetStateAction<CorridorFormState>>;
  onNext: () => void;
  onCancel: () => void;
  errors?: Record<string, string>;
}

export function StepOneForm({
  formData,
  setFormData,
  onNext,
  onCancel,
  errors = {},
}: StepOneFormProps) {
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [imageSelectorType, setImageSelectorType] = useState<
    "map" | "logo" | "banner" | "cable"
  >("map");
  const [imageSelectorMode, setImageSelectorMode] = useState<"map" | "cable">("map");
  const [selectedCableIdForImage, setSelectedCableIdForImage] = useState<string | null>(null);
  const { data: cableList = [] } = useCableList();
  const { data: cableImagesData } = useCableImages({ page: 1, limit: 1000 });
  const cableImages = (cableImagesData as any)?.data?.data || [];
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cablePopoverOpen, setCablePopoverOpen] = useState(false);
  const [cableSearchQuery, setCableSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasErrors = Object.keys(errors).length > 0;
  const uploadMutation = useUploadImage();

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Invalid file type", "Please upload an image file.");
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      showError("File too large", "Please upload an image smaller than 10MB.");
      return;
    }

    const type =
      field === "mapImageUrl"
        ? "map-image"
        : field === "sponsor.logoUrl"
          ? "sponsor-logo"
          : field === "sponsor.bannerUrl"
            ? "banner"
            : "generic";

    try {
      const url = await uploadMutation.mutateAsync({ file, type });

      if (field.includes("sponsor.")) {
        const sponsorField = field.split(".")[1];
        setFormData(prev => ({
          ...prev,
          sponsor: { ...prev.sponsor, [sponsorField]: url },
        }));
      } else {
        setFormData(prev => ({ ...prev, [field]: url }));
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      // Clear input value so same file can be selected again
      e.target.value = "";
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCableToggle = (cableId: string, cableName: string) => {
    const currentSystems = formData.subseaSystems || [];
    const exists = currentSystems.find(s => s.cableId === cableId);

    let newSystems;
    if (exists) {
      newSystems = currentSystems.filter(s => s.cableId !== cableId);
    } else {
      // Find image for this cable in the library
      const libraryImage = cableImages.find((img: any) => img.cableId === cableId);
      newSystems = [...currentSystems, { 
        cableId, 
        name: cableName, 
        imageUrl: libraryImage ? libraryImage.url : "" 
      }];
    }
    setFormData({ ...formData, subseaSystems: newSystems });
  };

  const handleCableImageChange = (cableId: string, url: string) => {
    const currentSystems = formData.subseaSystems || [];
    const newSystems = currentSystems.map(s => 
      s.cableId === cableId ? { ...s, imageUrl: url } : s
    );
    setFormData({ ...formData, subseaSystems: newSystems });
  };

  const { data: countries = [] } = useCountries();
  const fromCountryCode = countries.find((c: Country) => c.name === formData.fromCountry)?.code;
  const toCountryCode = countries.find((c: Country) => c.name === formData.toCountry)?.code;

  const filteredCables = cableList.filter((cable: { id: string; name: string }) =>
    cable.name.toLowerCase().includes(cableSearchQuery.toLowerCase())
  );

  const selectedCablesCount = (formData.subseaSystems || []).length;

  return (
    <div className="space-y-4">
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 mb-1">
                Fill the following fields to continue
              </p>
              <ul className="text-sm text-red-700 space-y-0.5">
                {Object.entries(errors).map(([key, message]) => (
                  <li key={key}>• {message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardContent className="p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Corridor Type </Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    type: v as "city-to-city" | "country-to-country",
                  })
                }
              >
                <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="city-to-city">City to City</SelectItem>
                  <SelectItem value="country-to-country">
                    Country to Country
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.type}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Corridor Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. London to New York Express"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.title}
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {formData.type === "city-to-city" ? (
              <>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">From Country <span className="text-red-500">*</span></Label>
                    <CountrySelect
                      value={formData.fromCountry}
                      onValueChange={(value) =>
                        setFormData({ ...formData, fromCountry: value, fromCity: "" })
                      }
                      placeholder="Select country..."
                      error={!!errors.fromCountry}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">From City <span className="text-red-500">*</span></Label>
                    <CitySelect
                      value={formData.fromCity}
                      onValueChange={(value) =>
                        setFormData({ ...formData, fromCity: value })
                      }
                      countryCode={fromCountryCode}
                      placeholder={fromCountryCode ? "Select city..." : "Select country first"}
                      error={!!errors.fromCity}
                    />
                    {errors.fromCity && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.fromCity}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">To Country <span className="text-red-500">*</span></Label>
                    <CountrySelect
                      value={formData.toCountry}
                      onValueChange={(value) =>
                        setFormData({ ...formData, toCountry: value, toCity: "" })
                      }
                      placeholder="Select country..."
                      error={!!errors.toCountry}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">To City <span className="text-red-500">*</span></Label>
                    <CitySelect
                      value={formData.toCity}
                      onValueChange={(value) =>
                        setFormData({ ...formData, toCity: value })
                      }
                      countryCode={toCountryCode}
                      placeholder={toCountryCode ? "Select city..." : "Select country first"}
                      error={!!errors.toCity}
                    />
                    {errors.toCity && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.toCity}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">From Country <span className="text-red-500">*</span></Label>
                  <CountrySelect
                    value={formData.fromCountry}
                    onValueChange={(value) =>
                      setFormData({ ...formData, fromCountry: value })
                    }
                    placeholder="Select from country..."
                    error={!!errors.fromCountry}
                  />
                  {errors.fromCountry && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.fromCountry}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">To Country <span className="text-red-500">*</span></Label>
                  <CountrySelect
                    value={formData.toCountry}
                    onValueChange={(value) =>
                      setFormData({ ...formData, toCountry: value })
                    }
                    placeholder="Select to country..."
                    error={!!errors.toCountry}
                  />
                  {errors.toCountry && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.toCountry}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Distance (km) <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                value={formData.distanceKm || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    distanceKm: Number(e.target.value) || 0,
                  })
                }
                className={errors.distanceKm ? "border-red-500" : ""}
              />
              {errors.distanceKm && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.distanceKm}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Avg Latency (ms) <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                value={formData.avgLatencyMs || ""}
                onChange={(e) =>


                  
                  setFormData({
                    ...formData,
                    avgLatencyMs: Number(e.target.value) || 0,
                  })
                }
                className={errors.avgLatencyMs ? "border-red-500" : ""}
              />
              {errors.avgLatencyMs && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.avgLatencyMs}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-4  ">
            <div>
              <Label className="text-sm font-semibold">Custom Fields (Optional)</Label>

            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Field 1 Name</Label>
                <Input
                  placeholder="Active Carriers"
                  value={formData.customFields?.[0]?.name || ""}
                  onChange={(e) => {
                    const newFields = [...(formData.customFields || [])];
                    if (!newFields[0]) newFields[0] = { name: "", value: "" };
                    newFields[0].name = e.target.value;
                    setFormData({ ...formData, customFields: newFields });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Field 1 Value</Label>
                <Input
                  placeholder="22"
                  value={formData.customFields?.[0]?.value || ""}
                  onChange={(e) => {
                    const newFields = [...(formData.customFields || [])];
                    if (!newFields[0]) newFields[0] = { name: "", value: "" };
                    newFields[0].value = e.target.value;
                    setFormData({ ...formData, customFields: newFields });
                  }}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Field 2 Name</Label>
                <Input
                  placeholder="Data Centers Connected"
                  value={formData.customFields?.[1]?.name || ""}
                  onChange={(e) => {
                    const newFields = [...(formData.customFields || [{ name: "", value: "" }])];
                    if (!newFields[1]) newFields[1] = { name: "", value: "" };
                    newFields[1].name = e.target.value;
                    setFormData({ ...formData, customFields: newFields });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Field 2 Value</Label>
                <Input
                  placeholder="10"
                  value={formData.customFields?.[1]?.value || ""}
                  onChange={(e) => {
                    const newFields = [...(formData.customFields || [{ name: "", value: "" }])];
                    if (!newFields[1]) newFields[1] = { name: "", value: "" };
                    newFields[1].value = e.target.value;
                    setFormData({ ...formData, customFields: newFields });
                  }}
                />
              </div>
            </div>
          </div>
          <div className="space-y-4 pt-2 border-t">
             <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Cable className="w-4 h-4" />
                  Subsea Systems  <span className="text-red-500">*</span>
                </Label>
             </div>

             <div className="border rounded-md p-4 bg-muted/20 space-y-4">
                 <Popover open={cablePopoverOpen} onOpenChange={setCablePopoverOpen}>
                   <PopoverTrigger asChild>
                     <Button
                       variant="outline"
                       role="combobox"
                       aria-expanded={cablePopoverOpen}
                       className={`w-full justify-between ${errors.subseaSystems ? "border-red-500" : ""}`}
                     >
                       <span className="flex items-center gap-2">
                         <Plus className="w-4 h-4" />
                         {selectedCablesCount > 0
                           ? `${selectedCablesCount} cable${selectedCablesCount !== 1 ? 's' : ''} selected`
                           : "Select subsea cables..."}
                       </span>
                       <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-[400px] p-0" align="start">
                     <div className="p-3 border-b">
                       <Input
                         placeholder="Search cables..."
                         value={cableSearchQuery}
                         onChange={(e) => setCableSearchQuery(e.target.value)}
                         className="h-9"
                       />
                     </div>
                     <div className="max-h-[300px] overflow-y-auto p-2">
                       {filteredCables.length > 0 ? (
                         filteredCables.map((cable: { id: string; name: string }) => {
                           const isSelected = (formData.subseaSystems || []).some(s => s.cableId === cable.id);
                           return (
                             <div
                               key={cable.id}
                               className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted transition-colors ${isSelected ? "bg-primary/10" : ""}`}
                               onClick={() => handleCableToggle(cable.id, cable.name)}
                             >
                               {isSelected ? (
                                 <CheckSquare className="w-4 h-4 text-primary" />
                               ) : (
                                 <Square className="w-4 h-4 text-muted-foreground" />
                               )}
                               <span className={`text-sm flex-1 ${isSelected ? "font-medium text-primary" : ""}`}>
                                 {cable.name}
                               </span>
                             </div>
                           );
                         })
                       ) : (
                         <p className="text-sm text-muted-foreground text-center py-4">
                           {cableSearchQuery ? "No cables found" : "Loading cables..."}
                         </p>
                       )}
                     </div>
                     {selectedCablesCount > 0 && (
                       <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground text-center">
                         {selectedCablesCount} cable{selectedCablesCount !== 1 ? 's' : ''} selected
                       </div>
                     )}
                   </PopoverContent>
                 </Popover>
              
                 {(formData.subseaSystems || []).length > 0 && (
                    <div className="space-y-3 mt-4">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Chosen Cable Library Images</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(formData.subseaSystems || []).map((system) => {
                             const libraryImage = !system.imageUrl ? cableImages.find((img: any) => img.cableId === system.cableId) : null;
                             const displayUrl = system.imageUrl || libraryImage?.url;

                             return (
                              <div key={system.cableId} className="flex items-center gap-4 p-3 border rounded-md bg-white hover:border-primary/30 transition-colors">
                                  {displayUrl ? (
                                    <div 
                                      className="relative h-14 w-20 rounded border overflow-hidden cursor-pointer group shrink-0"
                                      onClick={() => setPreviewImage(displayUrl)}
                                    >
                                        <Image
                                          src={displayUrl}
                                          alt={system.name}
                                          fill
                                          className="object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                             <Eye className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                  ) : (
                                    <div className="h-14 w-20 rounded border bg-muted flex flex-col items-center justify-center gap-1 shrink-0">
                                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-[8px] text-muted-foreground uppercase font-bold">No Image</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-sm truncate">{system.name}</div>
                                      <div className="text-[10px] text-muted-foreground font-mono truncate">{system.cableId}</div>
                                      <div className="flex items-center gap-2 mt-1">
                                         {/* <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-[10px] text-primary"
                                            onClick={() => {
                                                setSelectedCableIdForImage(system.cableId);
                                                setImageSelectorType("cable");
                                                setImageSelectorMode("cable");
                                                setImageSelectorOpen(true);
                                            }}
                                          >
                                             {displayUrl ? "" : "Select from Library"}
                                          </Button> */}
                                          {/* {displayUrl && (
                                              <Button
                                                variant="link"
                                                size="sm"
                                                className="h-auto p-0 text-[10px] text-red-500"
                                                onClick={() => handleCableImageChange(system.cableId, "")}
                                              >
                                                 Remove
                                              </Button>
                                          )} */}
                                      </div>
                                  </div>

                                  <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                      onClick={() => handleCableToggle(system.cableId, system.name)}
                                    >
                                      <X className="w-4 h-4" />
                                  </Button>
                              </div>
                             );
                          })}
                        </div>
                    </div>
                 )}
             </div>
             {errors.subseaSystems && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.subseaSystems}
                </p>
              )}
          </div>

        

          <div className="space-y-1.5">
            <Label className="text-sm">Summary <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Provide a detailed summary of the corridor..."
              value={formData.summary || ""}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className={cn(
                "min-h-[150px] resize-none",
                errors.summary ? "border-red-500" : ""
              )}
            />
            {errors.summary && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                {errors.summary}
              </p>
            )}
          </div>

        

          <div className="space-y-1.5 pt-2 border-t">
            <Label className="text-sm">Corridor Image <span className="text-red-500">*</span></Label>
            {/* Hidden Input for triggering upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "mapImageUrl")}
            />
            <div className="relative">
              {formData.mapImageUrl ? (
                <div className="relative aspect-[21/9] md:h-72 w-full rounded-xl overflow-hidden border-2 border-gray-100 bg-slate-50 group shadow-sm">
                  <Image
                    src={formData.mapImageUrl}
                    alt="Map"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {uploadMutation.isPending && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-10">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <p className="text-sm font-medium text-white">Updating map image...</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-6 gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white text-gray-900 border-none shadow-lg backdrop-blur-sm"
                      disabled={uploadMutation.isPending}
                      onClick={() => setPreviewImage(formData.mapImageUrl || null)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Full Map
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="bg-white/90 hover:bg-white text-gray-900 border-none shadow-lg backdrop-blur-sm"
                          disabled={uploadMutation.isPending}
                        >
                          Change
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-48">
                        <DropdownMenuItem 
                          className="cursor-pointer py-2"
                          onClick={handleTriggerUpload}
                        >
                          <ImageUp className="w-4 h-4 mr-2 text-primary" />
                          Upload from computer
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer py-2"
                          onClick={() => {
                            setImageSelectorType("map");
                            setImageSelectorMode("map"); 
                            setImageSelectorOpen(true);
                          }}
                        >
                          <ImageIcon className="w-4 h-4 mr-2 text-primary" />
                          Select from library
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="bg-red-500/90 hover:bg-red-500 shadow-lg backdrop-blur-sm"
                      disabled={uploadMutation.isPending}
                      onClick={() =>
                        setFormData(prev => ({ ...prev, mapImageUrl: "" }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center w-full min-h-[250px] md:h-72 bg-gray-50/50 hover:bg-gray-50 transition-all duration-300 relative group">
                  {uploadMutation.isPending ? (
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-sm font-medium text-muted-foreground">Uploading corridor image...</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-16 w-16 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <ImageUp className="w-8 h-8 text-primary/60" />
                      </div>
                      <div className="text-center space-y-1 mb-6">
                        <p className="text-base font-semibold text-gray-900">Upload Corridor Map</p>
                      
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleTriggerUpload}
                          className="h-10 px-6 border-2 font-bold hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                        >
                          Upload from Computer
                        </Button>
                        <span className="text-sm font-medium text-muted-foreground bg-gray-100/80 px-2 py-0.5 rounded-full">or</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setImageSelectorType("map");
                            setImageSelectorMode("map"); 
                            setImageSelectorOpen(true);
                          }}
                          className="h-10 px-6 border-2 font-bold hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                        >
                          Select from Library
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {errors.mapImageUrl && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.mapImageUrl}
              </p>
            )}
          </div>
          {/* <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle>SEO Optimization (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, metaTitle: e.target.value })
                  }
                  placeholder="SEO-optimized title"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {(formData.metaTitle || "").length}/60
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, metaDescription: e.target.value })
                  }
                  placeholder="Description for search engines"
                  maxLength={160}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {(formData.metaDescription || "").length}/160
                </p>
              </div>

              <div className="space-y-2">
                <Label>Keywords</Label>
                <KeywordInput
                  value={formData.keywords || []}
                  onChange={(keywords) =>
                    setFormData({ ...formData, keywords })
                  }
                  max={10}
                />
              </div>
            </CardContent>
          </Card> */}

        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onNext} className="px-6">
          Next: Categories & Vendors
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <ImageSelectorDialog
        open={imageSelectorOpen}
        onOpenChange={setImageSelectorOpen}
        onSelect={(url) => {
          if (imageSelectorType === "map") {
            setFormData({ ...formData, mapImageUrl: url });
          } else if (imageSelectorType === "logo") {
            setFormData({
              ...formData,
              sponsor: { ...formData.sponsor, logoUrl: url },
            });
          } else if (imageSelectorType === "banner") {
            setFormData({
              ...formData,
              sponsor: { ...formData.sponsor, bannerUrl: url },
            });
          } else if (imageSelectorType === "cable" && selectedCableIdForImage) {
            handleCableImageChange(selectedCableIdForImage, url);
          }
        }}
        title={
          imageSelectorType === "map"
            ? "Select Map Image"
            : imageSelectorType === "logo"
              ? "Select Logo"
              : imageSelectorType === "banner"
                ? "Select Banner"
                : "Select Cable Image"
        }
        mode={imageSelectorMode}
      />

      {/* Image preview overlay */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] flex flex-col pointer-events-none">
            <div className="flex justify-end p-2 pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewImage(null)}
                className="h-10 w-10 text-white hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="flex-1 relative w-full h-full pointer-events-auto">
              <Image
                src={previewImage}
                alt="Preview"
                fill
                className="object-contain"
                priority
                unoptimized={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
