"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryClassification } from "@/types/corridor";
import { X, Loader2 } from "lucide-react";
import { categoryClassificationSchema, type CategoryClassificationInput } from "@/validators/category-classification.validator";
import { useCreateCategoryClassification, useUpdateCategoryClassification } from "@/hooks/use-api";

interface CategoryClassificationFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classification?: CategoryClassification | null;
    onSuccess?: () => void;
}

export function CategoryClassificationFormDialog({
    open,
    onOpenChange,
    classification,
    onSuccess,
}: CategoryClassificationFormDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CategoryClassificationInput>({
        resolver: zodResolver(categoryClassificationSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    const createMutation = useCreateCategoryClassification();
    const updateMutation = useUpdateCategoryClassification();

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    useEffect(() => {
        if (open) {
            if (classification) {
                reset({
                    name: classification.name || "",
                    description: classification.description || "",
                });
            } else {
                reset({
                    name: "",
                    description: "",
                });
            }
        }
    }, [open, classification, reset]);

    const onSubmit = async (data: CategoryClassificationInput) => {
        if (classification) {
            await updateMutation.mutateAsync(
                { id: classification._id, data },
                {
                    onSuccess: () => {
                        onSuccess?.();
                        onOpenChange(false);
                    },
                }
            );
        } else {
            await createMutation.mutateAsync(data, {
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
                            {classification ? "Edit Category Classification" : "Create New Category Classification"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {classification
                                ? "Update classification information"
                                : "Add a new classification layer for categories"}
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
                            <Label htmlFor="name">
                                Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                {...register("name")}
                                placeholder="Enter classification name"
                                disabled={isSubmitting}
                                aria-invalid={errors.name ? "true" : "false"}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                {...register("description")}
                                placeholder="Enter classification description (optional)"
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
                                    {classification ? "Updating..." : "Creating..."}
                                </>
                            ) : (
                                classification ? "Update Classification" : "Create Classification"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
