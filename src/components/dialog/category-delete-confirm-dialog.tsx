"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Info } from "lucide-react";
import { useCategoryImpact } from "@/hooks/use-api";
import { Category } from "@/types/corridor";
import { useEffect } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from "@/components/ui/dialog";

interface CategoryDeleteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: Category | null;
    onConfirm: () => void;
    loading?: boolean;
}

export function CategoryDeleteConfirmDialog({
    open,
    onOpenChange,
    category,
    onConfirm,
    loading = false,
} : CategoryDeleteConfirmDialogProps) {
    const { data: impactData, isLoading, refetch } = useCategoryImpact(category?._id || null);

    useEffect(() => {
        if (open && category?._id) {
            refetch();
        }
    }, [open, category?._id, refetch]);

    const impact = impactData?.impact;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[440px] p-0 overflow-hidden gap-0 border-none shadow-2xl bg-white dark:bg-slate-950">
                <div className="p-8">
                    <div className="flex items-start gap-5">
                        <div className="flex-shrink-0">
                            {/* <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-100 dark:border-red-900/50">
                                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
                            </div> */}
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-1">
                                Delete Category?
                            </DialogTitle>
                            <DialogDescription className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                You are about to delete <span className="font-semibold text-slate-900 dark:text-slate-200">"{category?.title}"</span>. This action is permanent and will affect associated data.
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="mt-8">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Analyzing Impact...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {impact && (
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                                            <Info className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Impact Assessment</span>
                                        </div>
                                        <div className="p-5 space-y-6">
                                            {/* Updates Section */}
                                            {impact.vendorsToUpdate.length > 0 && (
                                                <div className="flex items-start gap-3.5">
                                                    <div className="mt-1.5 w-2 h-2 rounded-full bg-orange-400 ring-4 ring-orange-50 dark:ring-orange-950/30 shrink-0" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            Will be updated ({impact.vendorsToUpdate.length} vendor{impact.vendorsToUpdate.length !== 1 ? 's' : ''})
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                            This category will be removed from their profiles, but the vendors will remain.
                                                        </p>
                                                        
                                                        <div className="mt-4 flex flex-wrap gap-1.5">
                                                            {impact.vendorsToUpdate.map((v: any) => (
                                                                <span key={v._id} className="text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md text-slate-600 dark:text-slate-300 font-medium">
                                                                    {v.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Deletes Section */}
                                            {impact.vendorsToDelete.length > 0 && (
                                                <div className="flex items-start gap-3.5">
                                                    <div className="mt-1.5 w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-50 dark:ring-red-950/30 shrink-0" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                                                            Will be deleted ({impact.vendorsToDelete.length} vendor{impact.vendorsToDelete.length !== 1 ? 's' : ''})
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                            These vendors <span className="font-medium text-slate-700 dark:text-slate-300 underline decoration-red-200 dark:decoration-red-900/50 underline-offset-2">only</span> have this category and will be removed entirely.
                                                        </p>
                                                        
                                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                                            {impact.vendorsToDelete.map((v: any) => (
                                                                <span key={v._id} className="text-[11px] bg-red-50/50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 px-2.5 py-1 rounded-md text-red-700 dark:text-red-300 font-medium">
                                                                    {v.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {impact.vendorsToUpdate.length === 0 && impact.vendorsToDelete.length === 0 && (
                                                <div className="py-4 text-center">
                                                    <p className="text-xs text-slate-400 font-medium italic">
                                                        No associated vendors will be affected.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="px-8 py-5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 gap-3 sm:gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800 font-medium"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={loading || isLoading}
                        className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white shadow-md shadow-red-200 dark:shadow-none px-8 font-semibold h-10"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : "Confirm Deletion"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
