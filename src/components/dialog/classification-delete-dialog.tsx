"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Info, Layers } from "lucide-react";
import { useAffectedCategories } from "@/hooks/use-api";
import { useEffect } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from "@/components/ui/dialog";

interface ClassificationDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classification: { _id: string; name: string; description?: string } | null;
  onConfirm: (id: string) => void;
  loading?: boolean;
}

interface AffectedCategory {
  _id: string;
  title: string;
  classificationCount: number;
}

export function ClassificationDeleteDialog({
  open,
  onOpenChange,
  classification,
  onConfirm,
  loading = false,
}: ClassificationDeleteDialogProps) {
  // Only call the hook when we have a valid classification ID
  const { data: affectedData, isLoading: isLoadingAffected, refetch } =
    useAffectedCategories(classification && open ? classification._id : null);

  useEffect(() => {
    if (open && classification?._id) {
        refetch();
    }
  }, [open, classification?._id, refetch]);

  const impact = affectedData as { affectedCategories: AffectedCategory[], totalAffected: number } | null;
  const affectedCategories = impact?.affectedCategories || [];
  const totalAffected = impact?.totalAffected || 0;

  const handleConfirm = () => {
    if (classification?._id) {
      onConfirm(classification._id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[460px] p-0 overflow-hidden gap-0 border-none shadow-2xl bg-white dark:bg-slate-950">
            <div className="p-8">
                <div className="flex items-start gap-5">
                    {/* Icon commented out to match vendor dialog change */}
                    {/* <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-100 dark:border-red-900/50">
                            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
                        </div>
                    </div> */}
                    <div className="flex-1">
                        <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-1">
                            Delete Classification?
                        </DialogTitle>
                        <DialogDescription className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            You are about to delete <span className="font-semibold text-slate-900 dark:text-slate-200">"{classification?.name}"</span>. This action cannot be undone.
                        </DialogDescription>
                    </div>
                </div>

                <div className="mt-8">
                    {isLoadingAffected ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Analyzing Impact...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {totalAffected > 0 ? (
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Impact Assessment</span>
                                    </div>
                                    <div className="p-5 space-y-6">
                                        <div className="flex items-start gap-3.5">
                                            <div className="mt-1.5 w-2 h-2 rounded-full bg-orange-400 ring-4 ring-orange-50 dark:ring-orange-950/30 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                    Affected Categories ({totalAffected})
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                    This classification will be removed from these categories, but the categories will remain.
                                                </p>
                                                <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                                    {affectedCategories.map((category) => (
                                                        <div key={category._id} className="flex items-center gap-2.5 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-md text-slate-600 dark:text-slate-300">
                                                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="font-medium truncate flex-1">{category.title}</span>
                                                            {/* <span className="text-[10px] text-slate-400 font-bold ml-2">
                                                                {category.classificationCount} cls
                                                            </span> */}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-5 flex gap-3.5 items-start">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                                        <div className="w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">Safe to delete</p>
                                        <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mt-0.5 leading-relaxed">
                                            This classification is not currently used by any categories and can be safely removed.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Verification</h4>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        <span>Full removal of <span className="font-medium text-slate-900 dark:text-slate-200">"{classification?.name}"</span></span>
                                    </li>
                                    <li className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        <span>Action cannot be reversed</span>
                                    </li>
                                </ul>
                            </div>
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
                    onClick={handleConfirm}
                    disabled={loading || isLoadingAffected}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white shadow-md shadow-red-200 dark:shadow-none px-8 font-semibold h-10"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                        </>
                    ) : "Delete Classification"}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
