"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  X,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useMapImages, useCableImages } from "@/hooks/use-api";

interface ImageItem {
  _id: string;
  url: string;
  cloudinaryPublicId?: string;
  corridorName?: string;
  folder?: string;
  originalFileName?: string;
  createdAt?: string;
}

interface ImageSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageUrl: string) => void;
  title?: string;
  mode?: "map" | "cable";
}

export function ImageSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  title = "Select Image",
  mode = "map",
}: ImageSelectorDialogProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Auto-select 'all' when in cable mode
  useEffect(() => {
    if (open && mode === "cable" && !selectedFolder) {
      setSelectedFolder("all");
    }
  }, [open, mode, selectedFolder]);

  // Use appropriate hook based on mode
  const mapImagesQuery = useMapImages({ limit: 1000 });
  const cableImagesQuery = useCableImages({ limit: 1000 });

  const currentQuery = mode === "cable" ? cableImagesQuery : mapImagesQuery;
  const { data, isLoading: loading, error } = currentQuery;

  const allImages = useMemo(() => {
    if (!data?.success || !data?.data) return [];

    if (mode === "cable" && data?.data?.data) {
      // Adapt cable images to MapImage structure
      return data.data.data.map((img: { _id: string; url: string; cloudinaryPublicId?: string; cableName?: string; createdAt?: string }): ImageItem => ({
        _id: img._id,
        url: img.url,
        cloudinaryPublicId: img.cloudinaryPublicId,
        corridorName: img.cableName,
        folder: img.cableName,
        createdAt: img.createdAt,
      }));
    } else {
      // Map images structure
      return (data.data || []) as ImageItem[];
    }
  }, [data, mode]);

  // Extract unique folders from images
  const folders = useMemo(() => {
    const folderSet = new Set<string>();
    allImages.forEach((img: ImageItem) => {
      if (img.folder) {
        // Extract the folder name (after "maps/")
        const folderPath = img.folder;
        folderSet.add(folderPath);
      }
    });
    return Array.from(folderSet).sort();
  }, [allImages]);

  // Get images for selected folder or all images if "all" is selected
  const folderImages = useMemo(() => {
    if (selectedFolder === "all") {
      return allImages;
    }
    if (!selectedFolder) return [];
    return allImages.filter((img: ImageItem) => img.folder === selectedFolder);
  }, [allImages, selectedFolder]);

  const handleFolderClick = (folder: string) => {
    setSelectedFolder(folder);
    setSelectedImage(null);
  };

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleConfirm = () => {
    if (selectedImage) {
      onSelect(selectedImage);
      onOpenChange(false);

      setSelectedFolder(null);
      setSelectedImage(null);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);

    setSelectedFolder(null);
    setSelectedImage(null);
  };

  if (!open) return null;

  // Show error state if there's an error
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md m-4 p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Images</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "Failed to load images"}
            </p>
            <Button onClick={handleCancel}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  const getFolderDisplayName = (folder: string) => {
    if (folder.startsWith("maps/")) {
      return folder.replace("maps/", "");
    }
    return folder;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a folder to view images{" "}
              {mode === "cable" && (
                <span className="ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  Cable Library
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Folder Grid - File Explorer Style */}
          <div className="border-b border-border overflow-y-auto p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Folders
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* All Images option */}
                <button
                  onClick={() => handleFolderClick("all")}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${
                    selectedFolder === "all"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`w-16 h-16 mb-2 flex items-center justify-center ${selectedFolder === "all" ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <ImageIcon className="w-12 h-12" />
                  </div>
                  <span
                    className={`text-xs text-center truncate w-full ${selectedFolder === "all" ? "font-semibold text-primary" : ""}`}
                  >
                    All Images
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    ({allImages.length})
                  </span>
                </button>
                {/* Individual folders only for map mode */}
                {mode !== "cable" &&
                  folders.map((folder) => (
                    <button
                      key={folder}
                      onClick={() => handleFolderClick(folder)}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${
                        selectedFolder === folder
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div
                        className={`w-16 h-16 mb-2 flex items-center justify-center ${selectedFolder === folder ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {selectedFolder === folder ? (
                          <FolderOpen className="w-12 h-12" />
                        ) : (
                          <Folder className="w-12 h-12" />
                        )}
                      </div>
                      <span
                        className={`text-xs text-center truncate w-full px-1 ${selectedFolder === folder ? "font-semibold text-primary" : ""}`}
                      >
                        {getFolderDisplayName(folder)}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        (
                        {
                          allImages.filter((img: ImageItem) => img.folder === folder)
                            .length
                        }
                        )
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Images Grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
            {!selectedFolder ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a folder from the left to view images
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : folderImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No images found in this folder
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2">
                  {selectedFolder !== "all" && (
                    <>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {getFolderDisplayName(selectedFolder)}
                      </span>
                    </>
                  )}
                  {selectedFolder === "all" && (
                    <span className="text-sm font-medium">All Images</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    ({folderImages.length} image
                    {folderImages.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {folderImages.map((img: ImageItem) => (
                    <div
                      key={img._id}
                      onClick={() => handleImageSelect(img.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedImage === img.url
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={img.originalFileName || "Image"}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                      />
                      {/* Corridor name below image */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate text-center">
                        {img.corridorName || (
                          <span className="italic text-gray-300">
                            No corridor
                          </span>
                        )}
                      </div>
                      {selectedImage === img.url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-2">
                            <span>{img.corridorName}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedImage}>
            Select Image
          </Button>
        </div>
      </div>
    </div>
  );
}
