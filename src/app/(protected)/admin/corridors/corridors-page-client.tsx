"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Corridor } from "@/types/corridor";
import { CorridorsTableClient } from "@/components/master-data/corridors/corridors-table-client";
import { DeleteConfirmDialog } from "@/components/dialog/delete-confirm-dialog";
import { useDeleteCorridor } from "@/hooks/use-api";

interface CorridorsPageClientProps {
  corridors: Corridor[];
  totalItems: number;
  currentPage: number;
}

export function CorridorsPageClient({
  corridors,
  totalItems,
  currentPage,
}: CorridorsPageClientProps) {
  const router = useRouter();
  const [deleteCorridor, setDeleteCorridor] = useState<Corridor | null>(null);
  const deleteCorridorMutation = useDeleteCorridor();

  const handleEdit = (corridorId: string) => {
    router.push(`/admin/corridors/${encodeURIComponent(corridorId)}`);
  };

  const handleView = (corridorId: string) => {
    router.push(`/admin/corridors/${encodeURIComponent(corridorId)}/details`);
  };

  const handleDelete = (corridor: Corridor) => {
    setDeleteCorridor(corridor);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCorridor?._id) return;

    deleteCorridorMutation.mutate(deleteCorridor._id, {
      onSuccess: () => {
        setDeleteCorridor(null);
        router.refresh();
      },
    });
  };

  return (
    <>
      <CorridorsTableClient
        corridors={corridors}
        totalItems={totalItems}
        currentPage={currentPage}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
      />

      <DeleteConfirmDialog
        open={deleteCorridor !== null}
        onOpenChange={(open: boolean) => !open && setDeleteCorridor(null)}
        title="Delete Corridor"
        description={
          deleteCorridor
            ? `Are you sure you want to delete "${deleteCorridor.title}"? This action cannot be undone.`
            : "Are you sure you want to delete this corridor? This action cannot be undone."
        }
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
