"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Category, CategoryClassification } from "@/types/corridor";
import { X, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { categorySchema, type CategoryInput } from "@/validators/category.validator";
import { useCreateCategory, useUpdateCategory, useCategoryClassifications } from "@/hooks/use-api";
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
import { useState } from "react";

interface CategoryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: Category | null;
    onSuccess?: () => void;
}

export function CategoryFormDialog({
    open,
    onOpenChange,
    category,
    onSuccess,
}: CategoryFormDialogProps) {
    const [classificationOpen, setClassificationOpen] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CategoryInput>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            title: "",
            description: "",
            classificationIds: [],
        },
    });

    const { data: classifications = [] } = useCategoryClassifications();
    const selectedClassificationIds = watch("classificationIds") || [];

    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    useEffect(() => {
        if (open) {
            if (category) {
                // Map populated objects or string IDs to an array of string IDs
                const cids = Array.isArray(category.classificationIds)
                    ? category.classificationIds.map(c => 
                        typeof c === 'object' && c !== null ? (c as any)._id : c
                    )
                    : [];

                reset({
                    title: category.title || "",
                    description: category.description || "",
                    classificationIds: cids,
                });
            } else {
                reset({
                    title: "",
                    description: "",
                    classificationIds: [],
                });
            }
        }
    }, [open, category, reset]);

    const toggleClassification = (id: string) => {
        const currentIds = [...selectedClassificationIds];
        const index = currentIds.indexOf(id);
        if (index > -1) {
            currentIds.splice(index, 1);
        } else {
            currentIds.push(id);
        }
        setValue("classificationIds", currentIds);
    };

    const removeClassification = (id: string) => {
        setValue("classificationIds", selectedClassificationIds.filter(i => i !== id));
    };

    const onSubmit = async (data: any) => {
        const payload = data as CategoryInput;
        if (category) {
            await updateMutation.mutateAsync(
                { id: category._id, data: payload },
                {
                    onSuccess: () => {
                        onSuccess?.();
                        onOpenChange(false);
                    },
                }
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
                            {category ? "Edit Category" : "Create New Category"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {category
                                ? "Update category information"
                                : "Add a new category"}
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

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">
                                Title <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="title"
                                {...register("title")}
                                placeholder="Enter category title"
                                disabled={isSubmitting}
                                aria-invalid={errors.title ? "true" : "false"}
                            />
                            {errors.title && (
                                <p className="text-sm text-destructive">{errors.title.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Category Classifications</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {selectedClassificationIds.map((id) => {
                                    const classification = (classifications as CategoryClassification[]).find(c => c._id === id);
                                    return (
                                        <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                                            {classification?.name || "Unknown"}
                                            <X
                                                className="w-3 h-3 cursor-pointer hover:text-destructive"
                                                onClick={() => removeClassification(id)}
                                            />
                                        </Badge>
                                    );
                                })}
                                {selectedClassificationIds.length === 0 && (
                                    <span className="text-sm text-muted-foreground">No classifications selected</span>
                                )}
                            </div>
                            <Popover open={classificationOpen} onOpenChange={setClassificationOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={classificationOpen}
                                        className="w-full justify-between"
                                        disabled={isSubmitting}
                                    >
                                        Select Classifications...
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search classifications..." />
                                        <CommandList>
                                            <CommandEmpty>No classification found.</CommandEmpty>
                                            <CommandGroup>
                                                {(classifications as CategoryClassification[]).map((classification) => (
                                                    <CommandItem
                                                        key={classification._id}
                                                        value={classification.name}
                                                        onSelect={() => toggleClassification(classification._id)}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedClassificationIds.includes(classification._id)
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {classification.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                {...register("description")}
                                placeholder="Enter category description (optional)"
                                rows={4}
                                disabled={isSubmitting}
                                className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            {errors.description && (
                                <p className="text-sm text-destructive">{errors.description.message}</p>
                            )}
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
                                    {category ? "Updating..." : "Creating..."}
                                </>
                            ) : (
                                category ? "Update Category" : "Create Category"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
