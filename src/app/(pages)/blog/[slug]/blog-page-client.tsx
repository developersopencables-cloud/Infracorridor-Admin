"use client";

import { useRouter } from "next/navigation";
import { BlogWithCorridor } from "@/types/blog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft, Map, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface BlogPageClientProps {
  blog: BlogWithCorridor;
  contentHtml: string;
  isAdmin?: boolean;
}

export default function BlogPageClient({ blog, contentHtml, isAdmin }: BlogPageClientProps) {
  const router = useRouter();

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Back button - Subtle */}
        <div className="mb-8">
          <Link href={isAdmin ? "/admin/blogs" : "/blog"}>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isAdmin ? "Back to management" : "Back to blogs"}
            </Button>
          </Link>
        </div>

        <article className="space-y-6">
          {/* Cover Image */}
          {blog.coverImageUrl && (
            <div className="relative w-full aspect-[16/9] md:aspect-[2/1] rounded-2xl overflow-hidden shadow-sm bg-gray-100">
              <Image
                src={blog.coverImageUrl}
                alt={blog.title}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          )}

          <div className="space-y-4">
            {/* Date */}
            <div className="text-sm font-medium text-gray-400">
              {blog.publishedAt
                ? formatDate(blog.publishedAt)
                : formatDate(blog.createdAt)}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-[1.15]">
              {blog.title}
            </h1>
          </div>

          {/* Content */}
          <div
            className="blog-content prose prose-lg max-w-none prose-gray"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

        </article>
      </div>
    </div>
  );
}
