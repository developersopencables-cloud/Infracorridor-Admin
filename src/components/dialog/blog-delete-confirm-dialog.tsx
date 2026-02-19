"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Info, FileText } from "lucide-react";
import { Blog } from "@/types/blog";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";

interface BlogDeleteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    blog: Blog | null;
    onConfirm: () => void;
    loading?: boolean;
}

export function BlogDeleteConfirmDialog({
    open,
    onOpenChange,
    blog,
    onConfirm,
    loading = false,
} : BlogDeleteConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[440px] p-0 overflow-hidden gap-0 border-none shadow-2xl bg-white dark:bg-slate-950">
                <div className="p-8">
                    <div className="flex items-start gap-5">
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-1">
                                Delete Blog?
                            </DialogTitle>
                            <DialogDescription className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                You are about to delete <span className="font-semibold text-slate-900 dark:text-slate-200">"{blog?.title}"</span>. This action is permanent and cannot be undone.
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="mt-8">
                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Blog Details</span>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="flex items-start gap-3.5">
                                        <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-400 ring-4 ring-blue-50 dark:ring-blue-950/30 shrink-0" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2.5 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-md text-slate-600 dark:text-slate-300">
                                                <FileText className="w-3 h-3 text-slate-400" />
                                                <span className="font-medium truncate flex-1">{blog?.title}</span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                                                <span className="capitalize px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{blog?.type}</span>
                                                <span className={`px-2 py-0.5 rounded ${blog?.status === 'PUBLISHED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                    {blog?.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-xl p-4 flex gap-3.5 items-start">
                                <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                <p className="text-[12px] text-orange-800 dark:text-orange-300 leading-relaxed font-medium">
                                    The blog content, cover image, and all associated data will be permanently removed.
                                </p>
                            </div>
                        </div>
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
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white shadow-md shadow-red-200 dark:shadow-none px-8 font-semibold h-10"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : "Delete Blog"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
