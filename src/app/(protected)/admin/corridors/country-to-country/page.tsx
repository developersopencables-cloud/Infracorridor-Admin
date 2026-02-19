"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Map, Plus, Search, Loader2, Edit, Trash2, ImageUp } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCorridors, useDeleteCorridor } from "@/hooks/use-api";
import { showSuccess } from "@/utils/toast";
import { DeleteConfirmDialog } from "@/components/dialog/delete-confirm-dialog";
import { ImageSelectorDialog } from "@/components/dialog/image-selector-dialog";
import { CountryToCountryCorridor } from "@/types/corridor";

export default function CountryToCountryPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteCorridor, setDeleteCorridor] = useState<CountryToCountryCorridor | null>(null);
    const [imageSelectorOpen, setImageSelectorOpen] = useState(false);

    const { data: corridorsData, isLoading: loading } = useCorridors({
        type: "country-to-country",
        search: searchQuery,
    });
    
    const deleteCorridorMutation = useDeleteCorridor();

    const corridors = (corridorsData?.data as CountryToCountryCorridor[]) || [];

    const handleCreate = () => {
        router.push("/admin/corridors/new?type=country-to-country");
    };

    const handleEdit = (corridor: CountryToCountryCorridor) => {
        router.push(`/admin/corridors/${encodeURIComponent(corridor._id)}`);
    };

    const handleDelete = (corridor: CountryToCountryCorridor) => {
        setDeleteCorridor(corridor);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteCorridor?._id) return;

        deleteCorridorMutation.mutate(deleteCorridor._id, {
            onSuccess: () => {
                setDeleteCorridor(null);
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <div className="flex-1 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Map className="w-6 h-6" />
                                Country to Country Corridors
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Manage country-to-country corridor connections
                            </p>
                        </div>
                        <Button onClick={() => setImageSelectorOpen(true)}>
                            <ImageUp className="w-4 h-4 mr-2" />
                            Select Image
                        </Button>
                    </div>

                    <div className="mb-4 flex items-center justify-between">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search corridors..."
                                className="w-full pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add New
                        </Button>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Corridor</TableHead>
                                            <TableHead>Route</TableHead>
                                            <TableHead className="text-right">Distance (km)</TableHead>
                                            <TableHead className="text-right">Latency (ms)</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead>Updated</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {corridors.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center">
                                                    No corridors found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            corridors.map((corridor) => (
                                                <TableRow key={corridor._id}>
                                                    <TableCell className="font-medium">{corridor.title}</TableCell>
                                                    <TableCell>
                                                        {corridor.fromCountry} → {corridor.toCountry}
                                                    </TableCell>
                                                    <TableCell className="text-right">{corridor.distanceKm}</TableCell>
                                                    <TableCell className="text-right">{corridor.avgLatencyMs}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={corridor.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                                                            {corridor.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(corridor.createdAt).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(corridor.updatedAt).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit(corridor)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(corridor)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <DeleteConfirmDialog
                    open={deleteCorridor !== null}
                    onOpenChange={(open) => !open && setDeleteCorridor(null)}
                    title="Delete Corridor"
                    description={
                        deleteCorridor
                            ? `Are you sure you want to delete the corridor "${deleteCorridor.title}"?`
                            : "Are you sure you want to delete this corridor?"
                    }
                    onConfirm={handleDeleteConfirm}
                />

                <ImageSelectorDialog
                    open={imageSelectorOpen}
                    onOpenChange={setImageSelectorOpen}
                    onSelect={(imageUrl) => {
                        showSuccess("Image selected", `Selected image URL: ${imageUrl}`);
                        // You can use imageUrl here for your needs
                    }}
                    title="Select Map Image"
                />
            </SidebarInset>
        </SidebarProvider>
    );
}