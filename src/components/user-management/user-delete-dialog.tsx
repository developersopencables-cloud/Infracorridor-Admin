"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { User } from "./user-management-table";
import { useDeleteUser } from "@/hooks/use-api";

interface UserDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

export function UserDeleteDialog({ open, onOpenChange, user, onSuccess }: UserDeleteDialogProps) {
  const deleteUserMutation = useDeleteUser();
  const loading = deleteUserMutation.isPending;

  const handleDelete = async () => {
    if (!user) return;

    deleteUserMutation.mutate(user.id, {
      onSuccess: () => {
        onSuccess();
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md m-4">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Delete User</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>

              {user && (
                <div className="rounded-lg border p-4 bg-muted/50 mb-4">
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Name:</span>
                      <p className="text-sm font-semibold">{user.name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Email:</span>
                      <p className="text-sm font-semibold">{user.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Role:</span>
                      <p className="text-sm font-semibold capitalize">{user.role}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                This will also delete all associated sync history for this user.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete User
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

