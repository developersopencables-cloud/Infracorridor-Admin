"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { FolderOpen, UploadCloud, Folder, Image as ImageIcon, Loader2, ChevronRight, Trash2, X, Edit } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMapImages, useDeleteMapImage } from "@/hooks/use-api";
import { MapImageFormDialog } from "@/components/dialog/map-image-form-dialog";
import { DeleteConfirmDialog } from "@/components/dialog/delete-confirm-dialog";

type MapImage = {
    _id: string;
    url: string;
    cloudinaryPublicId: string;
    corridorId?: string;
    corridorName?: string;
    folder?: string;
    originalFileName: string;
    createdAt?: string;
};

type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export function UploadMapImagesPage() {
    const [page] = useState(1);
    const [limit] = useState(1000);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [currentPage, setCurrentPage] = useState(1);
    const [previewImage, setPreviewImage] = useState<MapImage | null>(null);
    const [deleteImage, setDeleteImage] = useState<MapImage | null>(null);
    const [editImage, setEditImage] = useState<MapImage | null>(null);

    const {
        data: listData,
        isLoading: loadingList,
        refetch: refetchImages,
    } = useMapImages({ page, limit });

    const deleteMutation = useDeleteMapImage();

    const allImages = useMemo(() => (listData as any)?.data ?? [] as MapImage[], [listData]);

    const folders = useMemo(() => {
        const folderSet = new Set<string>();
        allImages.forEach((img: MapImage) => {
            if (img.folder) {
                const folderPath = img.folder;
                folderSet.add(folderPath);
            }
        });
        return Array.from(folderSet).sort();
    }, [allImages]);

    const folderImages = useMemo(() => {
        if (selectedFolder === "all") {
            return allImages;
        }
        if (!selectedFolder) return [];
        return allImages.filter((img: MapImage) => img.folder === selectedFolder);
    }, [allImages, selectedFolder]);

    const pageSize = 9;
    const totalPages =
        folderImages.length === 0 ? 1 : Math.max(1, Math.ceil(folderImages.length / pageSize));

    const paginatedImages = useMemo(
        () =>
            folderImages.slice(
                (currentPage - 1) * pageSize,
                (currentPage - 1) * pageSize + pageSize,
            ),
        [folderImages, currentPage],
    );

    const getFolderDisplayName = (folder: string) => {
        if (folder.startsWith("maps/")) {
            return folder.replace("maps/", "");
        }
        return folder;
    };

    const handleFolderClick = (folder: string) => {
        setSelectedFolder(folder);
        setCurrentPage(1);
    };

    const handlePrevPage = () => {
        setCurrentPage((prev) => Math.max(1, prev - 1));
    };

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    };

    const handleDeleteConfirm = () => {
        if (deleteImage?._id) {
            deleteMutation.mutate(deleteImage._id, {
                onSuccess: () => {
                    setDeleteImage(null);
                }
            });
        }
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="overflow-x-hidden">
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="">Admin</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Upload Map Images</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </header>

                <div className="flex flex-1 flex-col gap-3 p-4 bg-gray-50 overflow-x-hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                Upload Map Images
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Upload corridor map images and manage them for your corridors.
                            </p>
                        </div>
                        <Button onClick={() => setUploadDialogOpen(true)}>
                            <UploadCloud className="w-4 h-4 mr-2" />
                            Upload Image
                        </Button>
                    </div>


                    <Card className="border-gray-200">
                        <CardContent className="p-6">
                            {/* Folder Grid - File Explorer Style */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Folder className="w-4 h-4" />
                                        Folders
                                    </h3>
                                    <Button type="button" variant="outline" size="sm" onClick={() => refetchImages()}>
                                        Refresh
                                    </Button>
                                </div>
                                {loadingList ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                        {/* All Images option */}
                                        <button
                                            onClick={() => handleFolderClick("all")}
                                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${selectedFolder === "all"
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                                }`}
                                        >
                                            <div className={`w-16 h-16 mb-2 flex items-center justify-center ${selectedFolder === "all" ? "text-primary" : "text-muted-foreground"}`}>
                                                <ImageIcon className="w-12 h-12" />
                                            </div>
                                            <span className={`text-xs text-center truncate w-full ${selectedFolder === "all" ? "font-semibold text-primary" : ""}`}>
                                                All Images
                                            </span>
                                            <span className="text-xs text-muted-foreground mt-1">
                                                ({allImages.length})
                                            </span>
                                        </button>
                                        {/* Individual folders */}
                                        {folders.map((folder) => (
                                            <button
                                                key={folder}
                                                onClick={() => handleFolderClick(folder)}
                                                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${selectedFolder === folder
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/50"
                                                    }`}
                                            >
                                                <div className={`w-16 h-16 mb-2 flex items-center justify-center ${selectedFolder === folder ? "text-primary" : "text-muted-foreground"}`}>
                                                    {selectedFolder === folder ? (
                                                        <FolderOpen className="w-12 h-12" />
                                                    ) : (
                                                        <Folder className="w-12 h-12" />
                                                    )}
                                                </div>
                                                <span className={`text-xs text-center truncate w-full px-1 ${selectedFolder === folder ? "font-semibold text-primary" : ""}`}>
                                                    {getFolderDisplayName(folder)}
                                                </span>
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    ({allImages.filter((img: MapImage) => img.folder === folder).length})
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Images Grid */}
                            {selectedFolder && (
                                <div className="border-t border-border pt-6">
                                    <div className="mb-4 flex items-center gap-2 justify-between flex-wrap">
                                        <div className="flex items-center gap-2">
                                            {selectedFolder !== "all" && (
                                                <>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{getFolderDisplayName(selectedFolder)}</span>
                                                </>
                                            )}
                                            {selectedFolder === "all" && (
                                                <span className="text-sm font-medium">All Images</span>
                                            )}
                                            <span className="text-sm text-muted-foreground">
                                                ({folderImages.length} image{folderImages.length !== 1 ? "s" : ""})
                                            </span>
                                        </div>

                                        {/* View toggle */}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={viewMode === "grid" ? "default" : "outline"}
                                                onClick={() => setViewMode("grid")}
                                                className="h-7 px-2 text-xs"
                                            >
                                                Grid
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={viewMode === "table" ? "default" : "outline"}
                                                onClick={() => setViewMode("table")}
                                                className="h-7 px-2 text-xs"
                                            >
                                                Table
                                            </Button>
                                        </div>
                                    </div>

                                    {folderImages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                                            <p className="text-muted-foreground">No images found in this folder</p>
                                        </div>
                                    ) : viewMode === "grid" ? (
                                        <>
                                            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                                                {paginatedImages.map((img: MapImage) => (
                                                    <div
                                                        key={img._id}
                                                        className="border rounded-lg overflow-hidden flex flex-col bg-white cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md"
                                                        onClick={() => setPreviewImage(img)}
                                                    >
                                                        <div className="relative w-full bg-muted aspect-[4/3]">
                                                            <Image
                                                                src={img.url}
                                                                alt={img.originalFileName}
                                                                fill
                                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 18vw"
                                                                className="object-cover"
                                                                unoptimized={true}
                                                            />
                                                        </div>
                                                        <div className="p-2 space-y-1 text-[11px]">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    {img.corridorName && (
                                                                        <p className="truncate text-xs font-medium text-foreground">
                                                                            {img.corridorName}
                                                                        </p>
                                                                    )}
                                                                    {!img.corridorName && (
                                                                        <p className="truncate text-[11px] text-muted-foreground">
                                                                            {img.originalFileName}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end gap-1 pt-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditImage(img);
                                                                    }}
                                                                >
                                                                    <Edit className="w-3 h-3" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeleteImage(img);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="mt-4 overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[72px]">Preview</TableHead>
                                                        <TableHead>Name</TableHead>
                                                        <TableHead>Corridor</TableHead>
                                                        <TableHead>Folder</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedImages.map((img: MapImage) => (
                                                        <TableRow
                                                            key={img._id}
                                                            className="cursor-pointer hover:bg-muted/40"
                                                            onClick={() => setPreviewImage(img)}
                                                        >
                                                            <TableCell>
                                                                <div className="relative w-14 h-10 rounded overflow-hidden bg-muted">
                                                                    <Image
                                                                        src={img.url}
                                                                        alt={img.originalFileName}
                                                                        fill
                                                                        sizes="120px"
                                                                        className="object-cover"
                                                                        unoptimized={true}
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                <div className="truncate font-medium">
                                                                    {img.originalFileName}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {img.corridorName || "-"}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {img.folder
                                                                    ? img.folder.split("/").join(" / ")
                                                                    : "-"}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-7 w-7"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditImage(img);
                                                                        }}
                                                                    >
                                                                        <Edit className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="h-7 w-7"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setDeleteImage(img);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {folderImages.length > 0 && totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                                            <span>
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={handlePrevPage}
                                                    disabled={currentPage === 1}
                                                >
                                                    Previous
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={handleNextPage}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!selectedFolder && (
                                <div className="flex flex-col items-center justify-center py-12 text-center border-t border-border mt-6 pt-6">
                                    <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        Select a folder from above to view images
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SidebarInset>

            <MapImageFormDialog
                open={uploadDialogOpen || editImage !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setUploadDialogOpen(false);
                        setEditImage(null);
                    }
                }}
                initialData={editImage}
                onSuccess={() => {
                    refetchImages();
                    setEditImage(null);
                }}
            />

            <DeleteConfirmDialog
                open={deleteImage !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteImage(null);
                }}
                title="Delete Map Image"
                description={`Are you sure you want to delete this map image? ${deleteImage?.originalFileName}`}
                onConfirm={handleDeleteConfirm}
                loading={deleteMutation.isPending}
            />

            {/* Image preview dialog  */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative w-full h-full flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 z-10 p-4  flex items-center justify-between">
                            <div className="min-w-0 text-white">
                                <p className="text-sm font-medium truncate">
                                    {previewImage.originalFileName}
                                </p>
                                {previewImage.folder && (
                                    <p className="text-xs text-white/70 truncate">
                                        Folder: {previewImage.folder.split("/").join(" / ")}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewImage(null)}
                                className="h-10 w-10 text-white hover:bg-white/20"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Full Screen Image */}
                        <div className="flex-1 relative w-full h-full flex items-center justify-center p-4">
                            <div className="relative w-full h-full max-w-[95vw] max-h-[95vh]">
                                <Image
                                    src={previewImage.url}
                                    alt={previewImage.originalFileName}
                                    fill
                                    sizes="100vw"
                                    className="object-contain"
                                    priority
                                    unoptimized={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </SidebarProvider>
    );
}

export default UploadMapImagesPage;
