"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  X,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
} from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCableImages, useDeleteCableImage } from "@/hooks/use-api";
import { CableImageFormDialog } from "@/components/dialog/cable-image-form-dialog";
import { DeleteConfirmDialog } from "@/components/dialog/delete-confirm-dialog";
import { useSession } from "@/database/auth-client";
import { useRouter } from "next/navigation";

// Interface for Cable Image based on model
interface CableImage {
  _id: string;
  url: string;
  cloudinaryPublicId: string;
  cableId: string;
  cableName: string;
  folder?: string;
  createdAt?: string;
}

export default function CableImagesPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editImage, setEditImage] = useState<CableImage | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [previewImage, setPreviewImage] = useState<CableImage | null>(null);
  const [deleteImage, setDeleteImage] = useState<CableImage | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  const {
    data: response,
    isLoading: loadingList,
    refetch: refetchImages,
  } = useCableImages({ page: 1, limit: 1000 });

  const deleteMutation = useDeleteCableImage();

  const allImages = useMemo(
    () => (response as any)?.data?.data ?? ([] as CableImage[]),
    [response],
  );

  const folderImages = allImages;

  const pageSize = 12;
  const totalPages =
    folderImages.length === 0
      ? 1
      : Math.max(1, Math.ceil(folderImages.length / pageSize));

  const paginatedImages = useMemo(
    () =>
      folderImages.slice(
        (currentPage - 1) * pageSize,
        (currentPage - 1) * pageSize + pageSize,
      ),
    [folderImages, currentPage, pageSize],
  );

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
        },
      });
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

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
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Cable Images</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-3 p-4 bg-gray-50 overflow-x-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Cable Images
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage cable reference images library.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => refetchImages()} variant="outline" size="sm" className="hidden sm:flex">
                {/* <Loader2 className={`w-4 h-4 mr-2 ${loadingList ? 'animate-spin' : ''}`} /> */}
                Refresh
              </Button>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <UploadCloud className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
            </div>
          </div>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              {/* Images Display */}
              <div className="pt-0">
                <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">All Images</span>
                    <span className="text-sm text-muted-foreground">
                      ({folderImages.length} image
                      {folderImages.length !== 1 ? "s" : ""})
                    </span>
                  </div>

                  {/* View toggle */}
                  <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/40">
                    <Button
                      type="button"
                      size="sm"
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                      onClick={() => setViewMode("grid")}
                      className="h-8 w-8 p-0"
                      title="Grid View"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={viewMode === "table" ? "secondary" : "ghost"}
                      onClick={() => setViewMode("table")}
                      className="h-8 w-8 p-0"
                      title="Table View"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {loadingList ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
                  </div>
                ) : folderImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No images found in the library
                    </p>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {paginatedImages.map((img: CableImage) => (
                      <div
                        key={img._id}
                        className="group border rounded-lg overflow-hidden flex flex-col bg-white cursor-pointer transition-all hover:shadow-lg border-transparent hover:border-primary/20"
                        onClick={() => setPreviewImage(img)}
                      >
                        <div className="relative w-full bg-muted aspect-video">
                          <Image
                            src={img.url}
                            alt={img.cableName}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 15vw"
                            className="object-cover"
                            unoptimized={true}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(img);
                              }}
                            >
                              Preview
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {img.cableName}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground font-mono">
                                {img.cableId}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 -mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditImage(img);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteImage(img);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto border rounded-md">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-[80px]">Preview</TableHead>
                          <TableHead>Cable Name</TableHead>
                          <TableHead>Cable ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedImages.map((img: CableImage) => (
                          <TableRow
                            key={img._id}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => setPreviewImage(img)}
                          >
                            <TableCell>
                              <div className="relative w-14 h-10 rounded overflow-hidden bg-muted border">
                                <Image
                                  src={img.url}
                                  alt={img.cableName}
                                  fill
                                  sizes="120px"
                                  className="object-cover"
                                  unoptimized={true}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">
                                {img.cableName}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {img.cableId}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {img.createdAt
                                ? new Date(img.createdAt).toLocaleDateString()
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditImage(img);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteImage(img);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
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
                  <div className="flex items-center justify-between mt-6 pt-4 border-t text-sm text-muted-foreground">
                    <span>
                      Showing {(currentPage - 1) * pageSize + 1} to{" "}
                      {Math.min(currentPage * pageSize, folderImages.length)}{" "}
                      of {folderImages.length} images
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <Button
                            key={p}
                            variant={currentPage === p ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8 text-xs"
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <CableImageFormDialog
        open={uploadDialogOpen || !!editImage}
        onOpenChange={(open) => {
          if (!open) {
            setUploadDialogOpen(false);
            setEditImage(null);
          }
        }}
        initialData={editImage}
        onSuccess={() => {
          refetchImages();
          setUploadDialogOpen(false);
          setEditImage(null);
        }}
      />

      <DeleteConfirmDialog
        open={deleteImage !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteImage(null);
        }}
        title="Delete Cable Image"
        description={`Are you sure you want to delete this cable image? This will remove the image for "${deleteImage?.cableName}" permanently.`}
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />

      {/* Image preview dialog  */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative w-full h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
              <div className="min-w-0 text-white">
                <p className="text-lg font-semibold truncate">
                  {previewImage.cableName}
                </p>
                <p className="text-sm text-white/70 truncate font-mono">
                  {previewImage.cableId}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewImage(null)}
                className="h-12 w-12 text-white hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Image Container */}
            <div className="flex-1 relative w-full h-full flex items-center justify-center p-4">
              <div className="relative w-full h-full max-w-6xl max-h-[85vh]">
                <Image
                  src={previewImage.url}
                  alt={previewImage.cableName}
                  fill
                  sizes="90vw"
                  className="object-contain drop-shadow-2xl"
                  priority
                  unoptimized={true}
                />
              </div>
            </div>

            {/* Bottom Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center bg-gradient-to-t from-black/60 to-transparent">
              <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-[10px] md:text-xs">
                {previewImage.cableId} •{" "}
                {previewImage.createdAt
                  ? new Date(previewImage.createdAt).toLocaleString()
                  : "Recently Added"}
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
