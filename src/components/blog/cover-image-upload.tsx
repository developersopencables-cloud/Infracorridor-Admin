"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { showError } from "@/utils/toast";
import { uploadEndpoints } from "@/utils/endpoints";
import { cn } from "@/utils/utils";

interface CoverImageUploadProps {
  value?: string;
  publicId?: string;
  onChange: (data: { url: string; publicId: string } | null) => void;
  className?: string;
}

export function CoverImageUpload({
  value,
  publicId,
  onChange,
  className,
}: CoverImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showError("Invalid file type", "Please upload an image file.");
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      showError("File too large", "Please upload an image smaller than 10MB.");
      return;
    }

    setUploading(true);

    try {
      const sigRes = await fetch(uploadEndpoints.imageSignature(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "blog-cover" }),
      });

      const sigJson = await sigRes.json();
      if (!sigRes.ok || !sigJson.success) {
        throw new Error(sigJson.error || "Failed to get upload signature");
      }

      const { cloudName, apiKey, timestamp, signature, folder, publicId: newPublicId } = sigJson.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);
      formData.append("public_id", newPublicId);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      const uploadJson = await uploadRes.json();

      if (!uploadRes.ok || uploadJson.error) {
        throw new Error(uploadJson.error?.message || "Upload failed");
      }

      onChange({
        url: uploadJson.secure_url,
        publicId: uploadJson.public_id,
      });
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("File size too large")) {
        errorMessage = "The file is too large. Please upload an image smaller than 10MB.";
      }
      showError("Upload failed", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
        className="hidden"
      />

      {value ? (
        <div className="relative w-full h-64 rounded-lg overflow-hidden group">
          <Image
            src={value}
            alt="Cover image"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Replace
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "w-full h-64 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors",
            "bg-muted/30 hover:bg-muted/50",
            dragActive && "border-primary bg-primary/5",
            uploading && "opacity-60 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Add a cover image
              </p>
              <p className="text-xs text-muted-foreground">
                Drag and drop or click to upload
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload from computer
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
