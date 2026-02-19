"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryClassification } from "@/types/corridor";
import { CategoryClassificationsTableClient } from "@/components/master-data/category-classifications/category-classifications-table-client";
import { CategoryClassificationFormDialog } from "@/components/dialog/category-classification-form-dialog";
import { ClassificationDeleteDialog } from "@/components/dialog/classification-delete-dialog";
import { useDeleteCategoryClassification } from "@/hooks/use-api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface CategoryClassificationsPageClientProps {
  classifications: CategoryClassification[];
  totalItems: number;
  currentPage: number;
}

export function CategoryClassificationsPageClient({
  classifications,
  totalItems,
  currentPage,
}: CategoryClassificationsPageClientProps) {
  const router = useRouter();
  const [editingClassification, setEditingClassification] = useState<CategoryClassification | null>(null);
  const [deleteClassification, setDeleteClassification] = useState<CategoryClassification | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const deleteMutation = useDeleteCategoryClassification();

  const handleCreate = () => {
    setEditingClassification(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (classification: CategoryClassification) => {
    setEditingClassification(classification);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (classification: CategoryClassification) => {
    setDeleteClassification(classification);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteClassification?._id) return;

    deleteMutation.mutate(deleteClassification._id, {
      onSuccess: () => {
        setDeleteClassification(null);
        router.refresh();
      },
    });
  };

  const handleFormSuccess = () => {
    setIsFormDialogOpen(false);
    setEditingClassification(null);
    router.refresh();
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Category Classifications
          </h1>
          <p className="text-sm text-gray-600">
            Manage classification layers for categories.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Classification
        </Button>
      </div>

      <Card className="border-gray-200 flex-1 flex flex-col min-h-0">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Classifications ({totalItems})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 overflow-hidden">
          <div className="h-full overflow-auto space-y-4">
            <CategoryClassificationsTableClient
              classifications={classifications}
              totalItems={totalItems}
              currentPage={currentPage}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </CardContent>
      </Card>

      <CategoryClassificationFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        classification={editingClassification}
        onSuccess={handleFormSuccess}
      />

      <ClassificationDeleteDialog
        open={deleteClassification !== null}
        onOpenChange={(open: boolean) => !open && setDeleteClassification(null)}
        classification={deleteClassification}
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
