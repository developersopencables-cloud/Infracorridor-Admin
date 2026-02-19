"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Category, CategoryClassification } from "@/types/corridor";
import { CategoriesTableClient } from "@/components/master-data/category/categories-table-client";
import { CategoryFormDialog } from "@/components/dialog/category-form-dialog";
import { CategoryDeleteConfirmDialog } from "@/components/dialog/category-delete-confirm-dialog";
import { useDeleteCategory } from "@/hooks/use-api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface CategoriesPageClientProps {
  categories: Category[];
  classifications: CategoryClassification[];
  totalItems: number;
  currentPage: number;
  stats: {
    totalCategories: number;
    totalClassifications: number;
  };
}

export function CategoriesPageClient({
  categories,
  classifications,
  totalItems,
  currentPage,
  stats,
}: CategoriesPageClientProps) {
  const router = useRouter();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const deleteCategoryMutation = useDeleteCategory();

  const handleCreate = () => {
    setEditingCategory(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (category: Category) => {
    setDeleteCategory(category);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCategory?._id) return;

    deleteCategoryMutation.mutate(deleteCategory._id, {
      onSuccess: () => {
        setDeleteCategory(null);
        router.refresh();
      },
    });
  };

  const handleFormSuccess = () => {
    setIsFormDialogOpen(false);
    setEditingCategory(null);
    router.refresh();
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Categories
          </h1>
          <p className="text-sm text-gray-600">
            Manage category master data and classifications.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* Stats */}
      {/* <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-gray-200">
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-xs text-gray-600">
              Total Categories
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.totalCategories}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-gray-200">
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-xs text-gray-600">
              Classifications
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {stats.totalClassifications}
            </CardTitle>
          </CardHeader>
        </Card>
      </div> */}

      <Card className="border-gray-200 flex-1 flex flex-col min-h-0">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Categories ({totalItems})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 overflow-hidden">
          <div className="h-full overflow-auto space-y-4">
            <CategoriesTableClient
              categories={categories}
              classifications={classifications}
              totalItems={totalItems}
              currentPage={currentPage}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        category={editingCategory}
        onSuccess={handleFormSuccess}
      />

      <CategoryDeleteConfirmDialog
        open={deleteCategory !== null}
        onOpenChange={(open: boolean) => !open && setDeleteCategory(null)}
        category={deleteCategory}
        onConfirm={handleDeleteConfirm}
        loading={deleteCategoryMutation.isPending}
      />
    </div>
  );
}
