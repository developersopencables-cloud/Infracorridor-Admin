"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/utils/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import { useCreateCableImage, useUpdateCableImage, useCableList, useCableImages } from "@/hooks/use-api";
import Image from "next/image";

const formSchema = z.object({
    cableId: z.string().min(1, "Cable is required"),
    cloudinaryPublicId: z.string().min(1, "Image is required"),
    url: z.string().url("Invalid image URL"),
    width: z.number().optional(),
    height: z.number().optional(),
    format: z.string().optional(),
    sizeBytes: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CableImageFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    initialData?: any; // Cable image data for editing
}

export function CableImageFormDialog({
    open,
    onOpenChange,
    onSuccess,
    initialData,
}: CableImageFormDialogProps) {
    const isFromInitialData = !!initialData;
    const [openCombobox, setOpenCombobox] = useState(false);
    const { data: cables = [], isLoading: isLoadingCables } = useCableList();
    const { data: existingImagesData } = useCableImages({ page: 1, limit: 1000 });
    
    const existingImages = (existingImagesData as any)?.data?.data || [];
    
    const createMutation = useCreateCableImage();
    const updateMutation = useUpdateCableImage();

    const {
        register: _register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            cableId: "",
            cloudinaryPublicId: "",
            url: "",
        },
    });

    const selectedCableId = watch("cableId");
    const selectedCableName = cables.find((c: any) => c.id === selectedCableId)?.name || "";

    // Check if selected cable already has an image
    const existingImageForSelectedCable = !isFromInitialData && selectedCableId 
        ? existingImages.find((img: any) => img.cableId === selectedCableId)
        : null;

    const isActuallyUpdating = isFromInitialData || !!existingImageForSelectedCable;
    const updateId = initialData?._id || existingImageForSelectedCable?._id;
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setValue("cableId", initialData.cableId);
                setValue("cloudinaryPublicId", initialData.cloudinaryPublicId);
                setValue("url", initialData.url);
                setValue("width", initialData.width);
                setValue("height", initialData.height);
                setValue("format", initialData.format);
                setValue("sizeBytes", initialData.sizeBytes);
            } else {
                reset({
                    cableId: "",
                    cloudinaryPublicId: "",
                    url: "",
                });
            }
            setOpenCombobox(false);
        }
    }, [open, initialData, reset, setValue]);

    // Populate image fields if existing image found for selected cable
    useEffect(() => {
        if (existingImageForSelectedCable && !isFromInitialData) {
            setValue("cloudinaryPublicId", existingImageForSelectedCable.cloudinaryPublicId);
            setValue("url", existingImageForSelectedCable.url);
            setValue("width", existingImageForSelectedCable.width);
            setValue("height", existingImageForSelectedCable.height);
            setValue("format", existingImageForSelectedCable.format);
            setValue("sizeBytes", existingImageForSelectedCable.sizeBytes);
        }
    }, [existingImageForSelectedCable, isFromInitialData, setValue]);

    const onSubmit = async (data: FormValues) => {
        const payload = {
            ...data,
            cableName: selectedCableName,
        };

        if (isActuallyUpdating && updateId) {
            await updateMutation.mutateAsync(
                { id: updateId, data: payload },
                {
                    onSuccess: () => {
                        onSuccess?.();
                        onOpenChange(false);
                    },
                }
            );
        } else {
            await createMutation.mutateAsync(
                payload,
                {
                    onSuccess: () => {
                        onSuccess?.();
                        onOpenChange(false);
                    },
                }
            );
        }
    };

    const handleImageUpload = (result: any) => {
        setValue("cloudinaryPublicId", result.publicId);
        setValue("url", result.url);
        setValue("width", result.width);
        setValue("height", result.height);
        setValue("format", result.format);
        setValue("sizeBytes", result.bytes);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isActuallyUpdating ? "Edit Cable Image" : "Upload Cable Image"}</DialogTitle>
                    <DialogDescription>
                        {isActuallyUpdating 
                            ? "Update the image for the selected cable." 
                            : "Select a cable and upload an image (SVG, PNG, JPG)."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Cable <span className="text-destructive">*</span></Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="w-full justify-between"
                                    disabled={isActuallyUpdating && isFromInitialData}
                                >
                                    {selectedCableId
                                        ? cables.find((c: any) => c.id === selectedCableId)?.name
                                        : "Select cable..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[460px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search cable..." />
                                    <CommandList>
                                        <CommandEmpty>No cable found.</CommandEmpty>
                                        <CommandGroup>
                                            {cables.map((cable: any) => (
                                                <CommandItem
                                                    key={cable.id}
                                                    value={cable.name}
                                                    onSelect={() => {
                                                        setValue("cableId", cable.id);
                                                        setOpenCombobox(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedCableId === cable.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {cable.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {errors.cableId && (
                            <p className="text-sm text-destructive">{errors.cableId.message}</p>
                        )}
                        
                        {existingImageForSelectedCable && (
                            <div className="mt-2 p-3 border border-yellow-200 bg-yellow-50 rounded-md">
                                <p className="text-xs text-yellow-800 font-medium mb-2">This cable image is already added</p>
                                <div 
                                    className="relative h-20 w-32 rounded border overflow-hidden cursor-pointer group shadow-sm bg-white"
                                    onClick={() => setPreviewUrl(existingImageForSelectedCable.url)}
                                >
                                    <img 
                                        src={existingImageForSelectedCable.url} 
                                        alt="Existing" 
                                        className="w-full h-full object-cover opacity-60 transition-all group-hover:opacity-100"
                                     />
                                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                                         <span className="text-[10px] font-bold text-black drop-shadow-sm">PREVIEW</span>
                                     </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Cable Image <span className="text-destructive">*</span></Label>
                        <ImageUpload
                            value={watch("url")}
                            onChange={handleImageUpload}
                            onRemove={() => {
                                setValue("cloudinaryPublicId", "");
                                setValue("url", "");
                            }}
                            uploadType="cable-image"
                            folder="cable-images"
                            hideUrlInput={true}
                            onPreview={setPreviewUrl}
                        />
                        {errors.url && (
                            <p className="text-sm text-destructive">{errors.url.message}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                            {(createMutation.isPending || updateMutation.isPending) && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isActuallyUpdating ? "Update" : "Upload"}
                        </Button>
                    </div>
                </form>
            </DialogContent>

            {/* Full Screen Big Preview */}
            {previewUrl && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all animate-in fade-in duration-200"
                    onClick={() => setPreviewUrl(null)}
                >
                    <div 
                        className="relative w-full h-full flex items-center justify-center p-4 md:p-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative w-full h-full max-w-6xl max-h-[85vh]">
                            <Image 
                                src={previewUrl} 
                                alt="Big Preview" 
                                fill
                                className="object-contain drop-shadow-2xl"
                                unoptimized={true}
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 rounded-full h-12 w-12 text-white hover:bg-white/20 transition-colors"
                            onClick={() => setPreviewUrl(null)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            )}
        </Dialog>
    );
}
