"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TipTapRenderer } from "./tiptap-renderer";
import { Badge } from "@/components/ui/badge";
import { User, Calendar } from "lucide-react";
import Image from "next/image";

interface BlogPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  coverImageUrl?: string;
  authorName?: string;
  type: "general" | "corridor";
  corridorTitles?: string[];
}

export function BlogPreviewDialog({
  open,
  onOpenChange,
  title,
  content,
  coverImageUrl,
  authorName = "Author",
  type,
  corridorTitles = [],
}: BlogPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Preview: {title}</DialogTitle>
        </DialogHeader>

        {/* Cover Image */}
        {coverImageUrl && (
          <div className="relative w-full h-64 bg-muted">
            <Image
              src={coverImageUrl}
              alt={title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary" className="capitalize">
              {type}
            </Badge>
            {type === "corridor" && corridorTitles.length > 0 && corridorTitles.map((ct, idx) => (
              <Badge key={idx} variant="outline">{ct}</Badge>
            ))}
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Preview
            </Badge>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {title || "Untitled"}
          </h1>

          {/* Author & Reading time */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{authorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Content */}
          {content ? (
            <TipTapRenderer content={content} />
          ) : (
            <p className="text-muted-foreground italic">No content yet...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
