"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { masterDataEndpoints } from "@/utils/endpoints";
import { showError } from "@/utils/toast";
import type { Category, Vendor } from "@/types/corridor";

import type { CorridorFormState } from "./step-one-from";

interface SortableVendorItemProps {
  vendor: Vendor;
  isSelected: boolean;
  onToggle: () => void;
  categoryId: string;
}

function SortableVendorItem({ vendor, isSelected, onToggle, categoryId }: SortableVendorItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${categoryId}-${vendor._id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-1.5 cursor-pointer group hover:bg-gray-50 -mx-1 px-1 rounded transition-all border-b border-dotted border-gray-200 ${
        isDragging ? "z-50 shadow-lg" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div
        onClick={onToggle}
        className="flex items-center justify-between flex-1 min-w-0"
      >
        <span className={`text-sm font-semibold leading-tight transition-all truncate flex-1 ${
          isSelected ? "text-primary" : "text-gray-900"
        }`}>
          {vendor.name}
        </span>
        <div className={`h-4 w-4 rounded border transition-all flex items-center justify-center flex-shrink-0 ml-2 ${
          isSelected ? "bg-primary border-primary" : "border-gray-300 bg-white group-hover:border-primary/50"
        }`}>
          {isSelected && <Check className="h-3 w-3 text-white stroke-[2.5]" />}
        </div>
      </div>
    </div>
  );
}

interface SortableCategoryCardWrapperProps {
  categoryId: string;
  category: Category | undefined;
  removeCategory: (id: string) => void;
  currentSearch: string;
  setVendorSearches: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  orderedVendors: Vendor[];
  selectedVendors: Vendor[];
  sensors: ReturnType<typeof useSensors>;
  handleDragEnd: (event: DragEndEvent, categoryId: string) => void;
  toggleVendor: (vendorId: string, categoryId: string) => void;
}

function SortableCategoryCardWrapper({
  categoryId,
  category,
  removeCategory,
  currentSearch,
  setVendorSearches,
  orderedVendors,
  selectedVendors,
  sensors,
  handleDragEnd,
  toggleVendor,
}: SortableCategoryCardWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoryId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border-2 border-dashed border-gray-200 overflow-hidden bg-white flex flex-col min-h-[320px] ${isDragging ? "shadow-xl ring-2 ring-primary/30" : ""}`}>
        <div className="px-4 py-1.5 border-b border-dashed border-gray-200 flex items-start justify-between">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0 mr-2 mt-0.5"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-gray-900 truncate leading-tight">{category?.title}</h4>
            <p className="text-[10px] text-gray-600 truncate leading-tight mt-0.5">
              {category?.description || `${category?.title} providers`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeCategory(categoryId)}
            className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md flex-shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="px-4 py-1">
           <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search...`}
                value={currentSearch}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                onChange={(e) => {
                   setVendorSearches(prev => ({
                      ...prev,
                      [categoryId]: e.target.value
                   }));
                }}
              />
           </div>
        </div>

        <CardContent className="flex-1 p-0 overflow-hidden">
           <div className="h-[240px] overflow-y-auto px-4 py-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, categoryId)}
              >
                <SortableContext
                  items={selectedVendors.map(v => `${categoryId}-${v._id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedVendors.map((vendor, idx) => {
                    const isSelected = selectedVendors.some(v => v._id === vendor._id);

                    if (isSelected) {
                      // Selected vendors are draggable with checkmark
                      return (
                        <SortableVendorItem
                          key={vendor._id}
                          vendor={vendor}
                          isSelected={true}
                          onToggle={() => toggleVendor(vendor._id, categoryId)}
                          categoryId={categoryId}
                        />
                      );
                    } else {
                      // Unselected vendors are just clickable
                      return (
                        <div
                          key={vendor._id}
                          onClick={() => toggleVendor(vendor._id, categoryId)}
                          className={`flex items-center justify-between py-1.5 cursor-pointer group hover:bg-gray-50 -mx-1 px-1 rounded transition-all ${
                            idx !== orderedVendors.length - 1 ? "border-b border-dotted border-gray-200" : ""
                          }`}
                        >
                          <span className="text-sm font-semibold leading-tight transition-all truncate flex-1 text-gray-900">
                            {vendor.name}
                          </span>
                          <div className="h-4 w-4 rounded border transition-all flex items-center justify-center flex-shrink-0 ml-2 border-gray-300 bg-white group-hover:border-primary/50">
                            <Check className="h-3 w-3 text-transparent" />
                          </div>
                        </div>
                      );
                    }
                  })}
                </SortableContext>
              </DndContext>
              {orderedVendors.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs">
                    <Search className="h-6 w-6 opacity-20 mb-1" />
                    <span className="italic">No vendors found</span>
                 </div>
              )}
           </div>
        </CardContent>
        <div className="px-4 py-0.5 bg-gray-50/50 border-t border-dashed border-gray-200 text-[9px] text-gray-500 font-semibold uppercase tracking-wide text-right">
          {selectedVendors.length} selected
        </div>
      </Card>
    </div>
  );
}

export interface StepTwoFormProps {
  formData: CorridorFormState;
  setFormData: Dispatch<SetStateAction<CorridorFormState>>;
  onBack: () => void;
  onSubmit: (status: "DRAFT" | "PUBLISHED") => void;
  loading: boolean;
}

export function StepTwoForm({
  formData,
  setFormData,
  onBack,
  onSubmit,
  loading,
}: StepTwoFormProps) {
  const { data, isLoading } = useQuery<{
    categories: Category[];
    vendors: Vendor[];
  }>({
    queryKey: ["corridor-master-data", "categories-vendors"],
    queryFn: async () => {
      const [catRes, venRes] = await Promise.all([
        fetch(masterDataEndpoints.category.list()),
        fetch(masterDataEndpoints.vendor.list()),
      ]);
      const catData = await catRes.json();
      const venData = await venRes.json();

      if (!catData.success) {
        throw new Error(catData.error || "Failed to fetch categories");
      }
      if (!venData.success) {
        throw new Error(venData.error || "Failed to fetch vendors");
      }

      return {
        categories: catData.data as Category[],
        vendors: venData.data as Vendor[],
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (data === undefined && !isLoading) {
      showError(
        "Failed to load categories & vendors",
        "Please try refreshing the page",
      );
    }
  }, [data, isLoading]);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorSearches, setVendorSearches] = useState<Record<string, string>>({});

  const categories = data?.categories ?? [];

  const vendorsByCategory = useMemo(() => {
    const grouped: Record<string, Vendor[]> = {};
    const vendorsList = data?.vendors ?? [];
    vendorsList.forEach((v: Vendor) => {
      if (v.categoryIds && Array.isArray(v.categoryIds)) {
        // Add vendor to each of its categories
        v.categoryIds.forEach((categoryId) => {
          if (!grouped[categoryId]) grouped[categoryId] = [];
          grouped[categoryId].push(v);
        });
      }
    });
    return grouped;
  }, [data]);

  const toggleVendor = (vendorId: string, categoryId: string) => {
    setFormData((prev) => {
      const currentPairs = [...(prev.vendorCategoryPairs || [])];
      const pairIndex = currentPairs.findIndex(
        (p) => p.vendorId === vendorId && p.categoryId === categoryId
      );

      if (pairIndex >= 0) {
        // Remove this specific vendor-category pair
        currentPairs.splice(pairIndex, 1);
        // Reassign orders for remaining pairs in this category
        const categoryPairs = currentPairs.filter(p => p.categoryId === categoryId);
        categoryPairs.forEach((pair, index) => {
          const idx = currentPairs.findIndex(p => p.vendorId === pair.vendorId && p.categoryId === pair.categoryId);
          if (idx >= 0) currentPairs[idx].order = index;
        });
      } else {
        // Calculate next order for this category
        const categoryPairs = currentPairs.filter(p => p.categoryId === categoryId);
        const maxOrder = categoryPairs.length > 0 ? Math.max(...categoryPairs.map(p => p.order)) : -1;
        // Add new vendor-category pair with order
        currentPairs.push({ vendorId, categoryId, order: maxOrder + 1 });
      }

      // Update vendorIds for backward compatibility
      const uniqueVendorIds = Array.from(new Set(currentPairs.map(p => p.vendorId)));

      return {
        ...prev,
        vendorCategoryPairs: currentPairs,
        vendorIds: uniqueVendorIds,
      };
    });
  };

  const addCategory = (categoryId: string) => {
    if (!formData.categoryIds?.includes(categoryId)) {
      setFormData(prev => {
        const currentOrderedCategories = prev.orderedCategories || [];
        const nextOrder = currentOrderedCategories.length;
        return {
          ...prev,
          categoryIds: [...(prev.categoryIds || []), categoryId],
          orderedCategories: [...currentOrderedCategories, { categoryId, order: nextOrder }],
        };
      });
    }
    setCategoryOpen(false);
  };

  const removeCategory = (categoryId: string) => {
    setFormData((prev) => {
      const currentPairs = (prev.vendorCategoryPairs || []).filter(
        (p) => p.categoryId !== categoryId
      );
      const currentCategoryIds = (prev.categoryIds || []).filter(
        id => id !== categoryId
      );

      // Remove from orderedCategories and recalculate order values
      const remainingOrderedCategories = (prev.orderedCategories || [])
        .filter((oc) => oc.categoryId !== categoryId)
        .sort((a, b) => a.order - b.order)
        .map((oc, index) => ({ ...oc, order: index }));

      const uniqueVendorIds = Array.from(new Set(currentPairs.map(p => p.vendorId)));

      return {
        ...prev,
        vendorCategoryPairs: currentPairs,
        vendorIds: uniqueVendorIds,
        categoryIds: currentCategoryIds,
        orderedCategories: remainingOrderedCategories,
      };
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent, categoryId: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setFormData((prev) => {
      const currentPairs = [...(prev.vendorCategoryPairs || [])];

      // Get pairs for this category only
      const categoryPairs = currentPairs.filter(p => p.categoryId === categoryId);

      // Extract vendor IDs from the drag IDs (format: "categoryId-vendorId")
      const activeVendorId = String(active.id).split('-')[1];
      const overVendorId = String(over.id).split('-')[1];

      // Find indices in the category pairs
      const oldIndex = categoryPairs.findIndex(p => p.vendorId === activeVendorId);
      const newIndex = categoryPairs.findIndex(p => p.vendorId === overVendorId);

      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }

      // Reorder within category
      const reorderedCategoryPairs = arrayMove(categoryPairs, oldIndex, newIndex);

      // Update orders
      reorderedCategoryPairs.forEach((pair, index) => {
        pair.order = index;
      });

      // Replace category pairs in the full array
      const otherPairs = currentPairs.filter(p => p.categoryId !== categoryId);
      const newPairs = [...otherPairs, ...reorderedCategoryPairs];

      return {
        ...prev,
        vendorCategoryPairs: newPairs,
      };
    });
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setFormData((prev) => {
      const currentOrderedCategories = [...(prev.orderedCategories || [])];

      const oldIndex = currentOrderedCategories.findIndex(oc => oc.categoryId === String(active.id));
      const newIndex = currentOrderedCategories.findIndex(oc => oc.categoryId === String(over.id));

      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }

      // Reorder using arrayMove
      const reordered = arrayMove(currentOrderedCategories, oldIndex, newIndex);

      // Recalculate order values (0, 1, 2, ...)
      const updatedOrderedCategories = reordered.map((oc, index) => ({
        ...oc,
        order: index,
      }));

      // Also update categoryIds to reflect the new order
      const newCategoryIds = updatedOrderedCategories.map(oc => oc.categoryId);

      return {
        ...prev,
        orderedCategories: updatedOrderedCategories,
        categoryIds: newCategoryIds,
      };
    });
  };

  const handleAddCategory = () => {
    setCategoryOpen(true);
  };

  const groupedSelectedVendors = useMemo(() => {
    const vendorsList = data?.vendors ?? [];

    // Sort categories by orderedCategories order
    const sortedCategoryIds = [...(formData.orderedCategories || [])]
      .sort((a, b) => a.order - b.order)
      .map(oc => oc.categoryId);

    // If orderedCategories is empty but categoryIds has values, use categoryIds order (fallback)
    const categoryIdsToUse = sortedCategoryIds.length > 0
      ? sortedCategoryIds
      : (formData.categoryIds || []);

    return categoryIdsToUse.map((catId) => {
      const category = categories.find((c) => c._id === catId);
      const selectedForThisCat = (formData.vendorCategoryPairs || [])
        .filter((p) => p.categoryId === catId)
        .sort((a, b) => a.order - b.order); // Sort by order

      const selectedVendors = selectedForThisCat
        .map(p => ({
          vendor: vendorsList.find(v => v._id === p.vendorId),
          order: p.order
        }))
        .filter(item => item.vendor)
        .map(item => item.vendor) as Vendor[];

      return {
        category,
        selectedVendors,
        categoryId: catId
      };
    }).filter(item => item.category);
  }, [data, formData.vendorCategoryPairs, formData.categoryIds, formData.orderedCategories, categories]);



  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories;
    return categories.filter((cat) =>
      cat.title.toLowerCase().includes(categorySearch.toLowerCase()),
    );
  }, [categories, categorySearch]);

  const currentCategoryVendors = useMemo(() => {
    if (!selectedCategory) return [];
    return vendorsByCategory[selectedCategory] || [];
  }, [selectedCategory, vendorsByCategory]);

  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return currentCategoryVendors;
    return currentCategoryVendors.filter((vendor) =>
      vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()),
    );
  }, [currentCategoryVendors, vendorSearch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Categories & Vendors</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select vendors by category for this corridor
          </p>
        </div>
        {(formData.categoryIds?.length || 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFormData((prev) => ({ ...prev, vendorCategoryPairs: [], vendorIds: [], categoryIds: [], orderedCategories: [] }))
            }
            className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleCategoryDragEnd}
      >
        <SortableContext
          items={groupedSelectedVendors.map(g => g.categoryId)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedSelectedVendors.map((group) => {
              const availableVendors = vendorsByCategory[group.categoryId] || [];
              const currentSearch = vendorSearches[group.categoryId] || "";
              const filteredItems = availableVendors.filter(v =>
                 v.name.toLowerCase().includes(currentSearch.toLowerCase())
              );

              // Separate selected and unselected vendors
              const selectedVendorIds = new Set(group.selectedVendors.map(v => v._id));
              const unselectedVendors = filteredItems.filter(v => !selectedVendorIds.has(v._id));

              // Combine: selected first (in order), then unselected
              const orderedVendors = [...group.selectedVendors, ...unselectedVendors];

              return (
                <SortableCategoryCardWrapper
                  key={group.categoryId}
                  categoryId={group.categoryId}
                  category={group.category}
                  removeCategory={removeCategory}
                  currentSearch={currentSearch}
                  setVendorSearches={setVendorSearches}
                  orderedVendors={orderedVendors}
                  selectedVendors={group.selectedVendors}
                  sensors={sensors}
                  handleDragEnd={handleDragEnd}
                  toggleVendor={toggleVendor}
                />
              );
            })}

            {/* Add Category Block */}
            <Card className="border-2 border-dashed border-gray-300 bg-gray-50/30 hover:bg-gray-50/60 hover:border-primary/40 transition-all flex flex-col items-center justify-center min-h-[280px] group">
               <div className="flex flex-col items-center justify-center p-4 text-center">
                  <div
                    className="h-14 w-14 rounded-2xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-all cursor-pointer"
                    onClick={() => setCategoryOpen(true)}
                  >
                     <Plus className="h-7 w-7 text-primary stroke-[2]" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Add Category</h3>
                  <p className="text-xs text-gray-500 mb-4 max-w-[200px]">
                    Select a category to add vendors
                  </p>

                  <Select onValueChange={(val) => addCategory(val)}>
                    <SelectTrigger className="w-[200px] h-9 rounded-lg border-2 font-semibold text-sm bg-white hover:border-primary transition-all">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                       {categories.map(cat => {
                          const isAdded = formData.categoryIds?.includes(cat._id);
                          return (
                            <SelectItem
                              key={cat._id}
                              value={cat._id}
                              disabled={isAdded}
                              className="text-sm"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{cat.title}</span>
                                {isAdded && <Badge variant="secondary" className="ml-2 text-[9px]">Added</Badge>}
                              </div>
                            </SelectItem>
                          )
                       })}
                    </SelectContent>
                  </Select>
               </div>
            </Card>
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <Button variant="outline" onClick={onBack} disabled={loading} className="h-10 px-6 font-semibold">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onSubmit("DRAFT")}
            disabled={loading}
            className="h-10 px-6 font-semibold"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={() => onSubmit("PUBLISHED")}
            disabled={loading}
            className="h-10 px-8 font-semibold"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Publish Corridor
          </Button>
        </div>
      </div>
    </div>
  );
}
