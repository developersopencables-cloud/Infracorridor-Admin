"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BlogWithCorridor } from "@/types/blog";
import { BlogsTableClient } from "@/components/blog/blogs-table-client";
import { BlogDeleteConfirmDialog } from "@/components/dialog/blog-delete-confirm-dialog";
import { useDeleteBlog } from "@/hooks/use-api";

interface BlogsPageClientProps {
  blogs: BlogWithCorridor[];
  totalItems: number;
  currentPage: number;
}

export function BlogsPageClient({
  blogs,
  totalItems,
  currentPage,
}: BlogsPageClientProps) {
  const router = useRouter();
  const [deleteBlog, setDeleteBlog] = useState<BlogWithCorridor | null>(null);
  const deleteBlogMutation = useDeleteBlog();

  const handleEdit = (blogId: string) => {
    router.push(`/admin/blogs/${encodeURIComponent(blogId)}`);
  };

  const handleView = (blog: BlogWithCorridor) => {
    window.open(`/blog/${blog.slug}`, "_blank");
  };

  const handleDelete = (blog: BlogWithCorridor) => {
    setDeleteBlog(blog);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteBlog?._id) return;

    deleteBlogMutation.mutate(deleteBlog._id, {
      onSuccess: () => {
        setDeleteBlog(null);
        router.refresh(); // Refresh server component data
      },
    });
  };

  return (
    <>
      <BlogsTableClient
        blogs={blogs}
        totalItems={totalItems}
        currentPage={currentPage}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
      />

      <BlogDeleteConfirmDialog
        open={deleteBlog !== null}
        onOpenChange={(open: boolean) => !open && setDeleteBlog(null)}
        blog={deleteBlog}
        onConfirm={handleDeleteConfirm}
        loading={deleteBlogMutation.isPending}
      />
    </>
  );
}
