"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, Image as ImageIcon } from "lucide-react";
import { showError } from "@/utils/toast";
import { uploadEndpoints } from "@/utils/endpoints";

type UploadKind = "vendor-logo" | "sponsor-logo" | "banner" | "generic" | "cable-image" | "map-image" | "blog-cover";

interface ImageUploadProps {
    value: string | { url: string; publicId: string };
    onChange: (value: string | { url: string; publicId: string }) => void;
    label?: string;
    error?: string;
    previewSize?: "sm" | "md" | "lg";
    uploadType?: UploadKind;
    folder?: string;
    onRemove?: () => void;
    hideUrlInput?: boolean;
    onPreview?: (url: string) => void;
}

export function ImageUpload({
    value,
    onChange,
    label = "",
    error,
    previewSize = "md",
    uploadType = "generic",
    folder: propFolder,
    onRemove,
    hideUrlInput = false,
    onPreview,
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [imageError, setImageError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sizeClasses = {
        sm: "w-16 h-16",
        md: "w-24 h-24",
        lg: "w-32 h-32",
    };

    const imageUrl = (typeof value === "string" ? value : value?.url) || "";
    const isValidUrl = imageUrl.startsWith("http") || imageUrl.startsWith("/");

    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            return;
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            showError("File too large", "Please upload an image smaller than 10MB.");
            return;
        }

        setUploading(true);

        try {  // Get Cloudinary upload signature from central API
            const sigRes = await fetch(uploadEndpoints.imageSignature(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: uploadType,
                    folder: propFolder,
                }),
            });

            const sigJson = await sigRes.json();
            if (!sigRes.ok || !sigJson.success) {
                throw new Error(sigJson.error || "Failed to get upload signature");
            }

            const {
                cloudName,
                apiKey,
                timestamp,
                signature,
                folder,
                publicId,
            } = sigJson.data as {
                cloudName: string;
                apiKey: string;
                timestamp: number;
                signature: string;
                folder: string;
                publicId: string;
            };

            const formData = new FormData();
            formData.append("file", file);
            formData.append("api_key", apiKey);
            formData.append("timestamp", String(timestamp));
            formData.append("signature", signature);
            formData.append("folder", folder);
            formData.append("public_id", publicId);

            const uploadRes = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: "POST",
                    body: formData,
                },
            );
            const uploadJson = await uploadRes.json();

            if (!uploadRes.ok || uploadJson.error) {
                throw new Error(uploadJson.error?.message || "Cloudinary upload failed");
            }

            if (typeof onChange === "function") {
              
                onChange({
                    url: uploadJson.secure_url,
                    publicId: uploadJson.public_id,
                    width: uploadJson.width,
                    height: uploadJson.height,
                    format: uploadJson.format,
                    bytes: uploadJson.bytes,
                    originalFilename: uploadJson.original_filename
                } as any);
            }
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            if (errorMessage.includes("File size too large") || errorMessage.includes("Maximum is")) {
                errorMessage = "The file is too large. Please upload an image smaller than 10MB.";
            }

            showError(
                "Upload failed",
                errorMessage,
            );
        } finally {
            setUploading(false);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => {
        setDragActive(false);
    };

    const handleRemove = () => {
        if (onRemove) {
            onRemove();
        } else {
            onChange("" as any);
        }
        setImageError(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleDropZoneClick = () => {
        if (!uploading && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="space-y-2">
            {!hideUrlInput && label && <Label>{label}</Label>}

            {!hideUrlInput && (
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            type="text"
                            value={(typeof value === "string" ? value : value?.url || "") as string}
                            onChange={(e) => {
                                if (typeof value === "string") {
                                    onChange(e.target.value);
                                } else {
                                    onChange({ ...value, url: e.target.value });
                                }
                            }}
                            placeholder="Enter image URL or upload a file"
                            aria-invalid={error ? "true" : "false"}
                        />
                        {error && (
                            <p className="text-sm text-destructive mt-1">{error}</p>
                        )}
                    </div>
                </div>
            )}
            
            {!hideUrlInput && !value && (
                <div className="text-center text-sm text-muted-foreground my-2">
                    <span className="text-muted-foreground">or</span>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
                disabled={uploading}
            />
            {value && (
                <div className="mt-3 relative inline-block">
                    <div
                        className={`${sizeClasses[previewSize]} rounded-lg overflow-hidden bg-muted border-2 border-border relative group`}
                    >
                        {!imageError && isValidUrl && (
                            <Image
                                src={imageUrl}
                                alt="Image preview"
                                fill
                                sizes="(max-width: 640px) 4rem, (max-width: 768px) 6rem, 8rem"
                                className={`object-cover ${onPreview ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                                onError={() => setImageError(true)}
                                unoptimized={true}
                                onClick={() => onPreview?.(imageUrl)}
                            />
                        )}
                        {(!isValidUrl || imageError) && (
                             <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                 <ImageIcon className="w-8 h-8 opacity-20" />
                             </div>
                        )}
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            aria-label="Remove image"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {!value && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={handleDropZoneClick}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-primary/60 hover:bg-primary/5 ${dragActive
                            ? "border-primary bg-primary/10"
                            : "border-muted-foreground/25"
                        } ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>Drag and drop an image here, or click to browse</>
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, WEBP, GIF, SVG up to 10MB
                    </p>
                </div>
            )}
        </div>
    );
}
