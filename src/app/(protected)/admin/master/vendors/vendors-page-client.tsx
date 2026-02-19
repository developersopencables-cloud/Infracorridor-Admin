"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Vendor, Category } from "@/types/corridor";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VendorsTableClient } from "@/components/master-data/vendor/vendors-table-client";
import { VendorFormDialog } from "@/components/dialog/vendor-form-dialog";
import { VendorDeleteConfirmDialog } from "@/components/dialog/vendor-delete-confirm-dialog";
import { useDeleteVendor } from "@/hooks/use-api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface VendorsPageClientProps {
  vendors: Vendor[];
  categories: Category[];
  totalItems: number;
  currentPage: number;
  stats: {
    totalVendors: number;
    totalCategories: number;
  };
}

export function VendorsPageClient({
  vendors,
  categories,
  totalItems,
  currentPage,
  stats,
}: VendorsPageClientProps) {
  const router = useRouter();
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const deleteVendorMutation = useDeleteVendor();

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      map[cat._id] = cat.title;
    });
    return map;
  }, [categories]);

  const handleCreate = () => {
    setEditingVendor(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (vendor: Vendor) => {
    setDeleteVendor(vendor);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteVendor || !deleteVendor._id) return;

    deleteVendorMutation.mutate(deleteVendor._id, {
      onSuccess: () => {
        setDeleteVendor(null);
        router.refresh();
      },
    });
  };

  const handleFormSuccess = () => {
    setIsFormDialogOpen(false);
    setEditingVendor(null);
    router.refresh();
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Vendors
          </h1>
          <p className="text-sm text-gray-600">
            Manage vendor information and settings.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Vendor
        </Button>
      </div>

     

      <Card className="border-gray-200 flex-1 flex flex-col min-h-0">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Vendors ({totalItems})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 overflow-hidden">
          <div className="h-full overflow-auto space-y-4">
            <VendorsTableClient
              vendors={vendors}
              categories={categories}
              categoryMap={categoryMap}
              totalItems={totalItems}
              currentPage={currentPage}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </CardContent>
      </Card>

      <VendorFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        vendor={editingVendor}
        onSuccess={handleFormSuccess}
      />

      <VendorDeleteConfirmDialog
        open={deleteVendor !== null}
        onOpenChange={(open: boolean) => !open && setDeleteVendor(null)}
        vendor={deleteVendor}
        onConfirm={handleDeleteConfirm}
        loading={deleteVendorMutation.isPending}
      />
    </div>
  );
}
