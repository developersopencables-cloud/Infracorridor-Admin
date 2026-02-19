"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { X, UploadCloud, Loader2, ImagePlus } from "lucide-react";
import { mapImagesEndpoints } from "@/utils/endpoints";
import { showError, showSuccess } from "@/utils/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UploadImageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function UploadImageDialog({
    open,
    onOpenChange,
    onSuccess,
}: UploadImageDialogProps) {
    const [corridorId, setCorridorId] = useState("");
    const [corridorName, setCorridorName] = useState("");
    const [folder, setFolder] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const queryClient = useQueryClient();

    const canUpload = !!file && (!!corridorId || !!corridorName);

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!file || !canUpload) {
                throw new Error("Missing file or corridor information");
            }

            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            if (file.size > MAX_FILE_SIZE) {
                throw new Error("FILE_TOO_LARGE");
            }

            const sigRes = await fetch(mapImagesEndpoints.getCloudinarySignature(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    corridorId: corridorId || undefined,
                    corridorName: corridorName || undefined,
                    folder: folder || undefined,
                }),
            });
            const sigJson = await sigRes.json();
            if (!sigRes.ok || !sigJson.success) {
                throw new Error(sigJson.error || "Failed to get upload signature");
            }

            const { cloudName, apiKey, timestamp, signature, folder: signedFolder, publicId } = sigJson.data;

            const formData = new FormData();
            formData.append("file", file);
            formData.append("api_key", apiKey);
            formData.append("timestamp", String(timestamp));
            formData.append("signature", signature);
            formData.append("folder", signedFolder);
            formData.append("public_id", publicId);

            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: "POST",
                body: formData,
            });
            const uploadJson = await uploadRes.json();
            if (!uploadRes.ok || uploadJson.error) {
                throw new Error(uploadJson.error?.message || "Cloudinary upload failed");
            }

            const metaRes = await fetch(mapImagesEndpoints.createMeta(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    publicId,
                    secureUrl: uploadJson.secure_url,
                    corridorId: corridorId || undefined,
                    corridorName: corridorName || undefined,
                    folder: signedFolder,
                    originalFileName: uploadJson.original_filename || file.name,
                }),
            });
            const metaJson = await metaRes.json();
            if (!metaRes.ok || !metaJson.success) {
                throw new Error(metaJson.error || "Failed to save image metadata");
            }
        },
        onSuccess: async () => {
            showSuccess("Image uploaded", "Map image uploaded and saved successfully");
            setFile(null);
            setCorridorId("");
            setCorridorName("");
            setFolder("");
            await queryClient.invalidateQueries({ queryKey: ["map-images"] });
            onOpenChange(false);
            if (onSuccess) {
                onSuccess();
            }
        },
        onError: (error) => {
            let errorMessage = error instanceof Error ? error.message : "Unknown error";

            if (errorMessage === "FILE_TOO_LARGE" || errorMessage.includes("File size too large") || errorMessage.includes("Maximum is")) {
                errorMessage = "The file is too large. Please upload an image smaller than 10MB.";
            }

            showError("Upload failed", errorMessage);
        },
    });

    const handleCancel = () => {
        setFile(null);
        setCorridorId("");
        setCorridorName("");
        setFolder("");
        onOpenChange(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Upload Map Image
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Upload corridor map images to Cloudinary
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancel}
                        className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Form */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        uploadMutation.mutate();
                    }}
                    className="flex-1 overflow-y-auto p-6"
                >
                    <FieldGroup className="space-y-1">

                        <Field>
                            <FieldLabel>Corridor Name</FieldLabel>
                            <Input
                                value={corridorName}
                                onChange={(e) => setCorridorName(e.target.value)}
                                placeholder="e.g., Mumbai-Singapore"
                                className="mt-1"
                            />
                        </Field>

                        <Field>
                            <FieldLabel>
                                Folder <span className="text-gray-400">(optional)</span>
                            </FieldLabel>
                            <Input
                                value={folder}
                                onChange={(e) => setFolder(e.target.value)}
                                placeholder="e.g., maps-2026"
                                className="mt-1"
                            />
                            <FieldDescription>
                                Custom folder name under the maps directory
                            </FieldDescription>
                        </Field>

                        <Field>
                            <FieldLabel>Image File</FieldLabel>
                            <div className="mt-1">
                                <label
                                    htmlFor="file-upload"
                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {file ? (
                                            <>
                                                <ImagePlus className="w-8 h-8 mb-2 text-green-500" />
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {(file.size / 1024).toFixed(2)} KB
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    <span className="font-semibold">Click to upload</span>{" "}
                                                    or drag and drop
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    PNG, JPG, WEBP, GIF, SVG up to 10MB
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <Input
                                        id="file-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0] || null;
                                            setFile(f);
                                        }}
                                    />
                                </label>
                            </div>
                        </Field>
                    </FieldGroup>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={uploadMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={(e) => {
                            e.preventDefault();
                            uploadMutation.mutate();
                        }}
                        disabled={!canUpload || uploadMutation.isPending}
                        className="min-w-[140px]"
                    >
                        {uploadMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Upload Image
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

