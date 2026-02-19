"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import Image from "next/image";
import { showSuccess, showError } from "@/utils/toast";

const formSchema = z.object({
    corridorName: z.string().min(1, "Corridor name is required"),
    folder: z.string().optional(),
    cloudinaryPublicId: z.string().min(1, "Image is required"),
    url: z.string().url("Invalid image URL"),
    width: z.number().optional(),
    height: z.number().optional(),
    format: z.string().optional(),
    sizeBytes: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MapImageFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    initialData?: any; // Map image data for editing
}

export function MapImageFormDialog({
    open,
    onOpenChange,
    onSuccess,
    initialData,
}: MapImageFormDialogProps) {
    const isEditing = !!initialData;
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            corridorName: "",
            folder: "",
            cloudinaryPublicId: "",
            url: "",
        },
    });

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            if (initialData) {
                // Editing mode
                setValue("corridorName", initialData.corridorName || "");
                setValue("folder", initialData.folder || "");
                setValue("cloudinaryPublicId", initialData.cloudinaryPublicId || "");
                setValue("url", initialData.url || "");
                setPreviewUrl(initialData.url || null);
            } else {
                // Create mode
                reset();
                setValue("folder", "maps/general");
                setPreviewUrl(null);
            }
        }
    }, [open, initialData, setValue, reset]);

    const handleRemoveImage = () => {
        setValue("cloudinaryPublicId", "");
        setValue("url", "");
        setValue("width", undefined);
        setValue("height", undefined);
        setValue("format", undefined);
        setValue("sizeBytes", undefined);
        setPreviewUrl(null);
    };

    const onSubmit = async (data: FormValues) => {
        try {
            setIsSubmitting(true);

            const payload = {
                ...data,
                publicId: data.cloudinaryPublicId,
                secureUrl: data.url,
                originalFileName: data.corridorName,
                folder: data.folder || "maps/general",
            };

            const url = isEditing 
                ? `/api/upload-map-images/${initialData._id}`
                : "/api/upload-map-images";
            
            const method = isEditing ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'create'} map image`);
            }

            showSuccess(result.message || `Map image ${isEditing ? 'updated' : 'created'} successfully`);
            onSuccess?.();
            onOpenChange(false);
            reset();
        } catch (error) {
            console.error(`Error ${isEditing ? 'updating' : 'creating'} map image:`, error);
            showError(error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} map image`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit' : 'Upload'} Map Image</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Update the map image details' : 'Upload a new map image for a corridor'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Corridor Name */}
                    <div className="space-y-2">
                        <Label htmlFor="corridorName">Corridor Name</Label>
                        <Input
                            id="corridorName"
                            {...register("corridorName")}
                            placeholder="e.g., London to New York"
                        />
                        {errors.corridorName && (
                            <p className="text-sm text-red-500">{errors.corridorName.message}</p>
                        )}
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label>Map Image</Label>
                        {previewUrl ? (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                                <Image
                                    src={previewUrl}
                                    alt="Preview"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={handleRemoveImage}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <ImageUpload
                                value=""
                                onChange={(value) => {
                                    if (typeof value === 'object' && value.url && value.publicId) {
                                        setValue("cloudinaryPublicId", value.publicId);
                                        setValue("url", value.url);
                                        setPreviewUrl(value.url);
                                    }
                                }}
                                folder={watch("folder") || "maps/general"}
                                uploadType="map-image"
                                 hideUrlInput={true}
                            />
                        )}
                        {errors.cloudinaryPublicId && (
                            <p className="text-sm text-red-500">{errors.cloudinaryPublicId.message}</p>
                        )}
                    </div>

                    {/* Folder - Only shown in create mode */}
                    {!isEditing && (
                        <div className="space-y-2">
                            <Label htmlFor="folder">Folder</Label>
                            <Input
                                id="folder"
                                {...register("folder")}
                                placeholder="e.g., maps/general"
                            />
                            <p className="text-xs text-muted-foreground">
                                Images will be organized in this folder
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEditing ? 'Update' : 'Upload'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
