"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  FileText,
} from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSession } from "@/database/auth-client";
import { useBlog, useUpdateBlog } from "@/hooks/use-api";
import { TipTapEditor } from "@/components/blog/tiptap-editor";
import { CoverImageUpload } from "@/components/blog/cover-image-upload";
import { CorridorSelector } from "@/components/blog/corridor-selector";
import { BlogPreviewDialog } from "@/components/blog/blog-preview-dialog";
import { KeywordInput } from "@/components/blog/keyword-input";
import { BlogType, BlogWithCorridor } from "@/types/blog";
import { CardDescription } from "@/components/ui/card";

export default function EditBlogPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const blogId = params.id as string;

  const { data: blogData, isLoading: blogLoading } = useBlog(blogId);
  const updateBlogMutation = useUpdateBlog();

  const blog = blogData as BlogWithCorridor | null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImagePublicId, setCoverImagePublicId] = useState("");
  const [type, setType] = useState<BlogType>("general");
  const [corridorIds, setCorridorIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  // SEO fields
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [focusKeyphrase, setFocusKeyphrase] = useState("");

  useEffect(() => {
    if (!sessionPending && !session?.user) {
      router.push("/login");
    }
  }, [session, sessionPending, router]);

  // Initialize form with blog data
  useEffect(() => {
    if (blog && !initialized) {
      setTitle(blog.title || "");
      setContent(blog.content || "");
      setAuthorName(blog.authorName || "");
      setCoverImageUrl(blog.coverImageUrl || "");
      setCoverImagePublicId(blog.coverImagePublicId || "");
      setType(blog.type || "general");
      setCorridorIds(blog.corridorIds || []);
      setStatus(blog.status || "DRAFT");
      // SEO fields
      setMetaTitle(blog.metaTitle || "");
      setMetaDescription(blog.metaDescription || "");
      setKeywords(blog.keywords || []);
      setFocusKeyphrase(blog.focusKeyphrase || "");
      setInitialized(true);
    }
  }, [blog, initialized]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length > 200) {
      newErrors.title = "Title must be less than 200 characters";
    }

    if (!content.trim()) {
      newErrors.content = "Content is required";
    }



    if (type === "corridor" && corridorIds.length === 0) {
      newErrors.corridorIds = "Please select at least one corridor";
    }

    // SEO validation
    if (metaTitle && metaTitle.length > 60) {
      newErrors.metaTitle = "Meta title must be 60 characters or less";
    }

    if (metaDescription && metaDescription.length > 160) {
      newErrors.metaDescription = "Meta description must be 160 characters or less";
    }

    if (keywords.length > 10) {
      newErrors.keywords = "Maximum 10 keywords allowed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (newStatus?: "DRAFT" | "PUBLISHED") => {
    if (!validateForm()) return;

    updateBlogMutation.mutate(
      {
        id: blogId,
        data: {
          title: title.trim(),
          authorName: authorName.trim() || undefined,
          coverImageUrl: coverImageUrl || undefined,
          coverImagePublicId: coverImagePublicId || undefined,
          type,
          corridorIds: type === "corridor" ? corridorIds : [],
          status: newStatus || status,
          // SEO fields
          keywords: keywords.length > 0 ? keywords : undefined,
          metaTitle: metaTitle.trim() || undefined,
          metaDescription: metaDescription.trim() || undefined,
          focusKeyphrase: focusKeyphrase.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          if (newStatus) {
            setStatus(newStatus);
          }
          router.push("/admin/blogs");
        },
      }
    );
  };

  const handleCoverImageChange = (
    data: { url: string; publicId: string } | null
  ) => {
    if (data) {
      setCoverImageUrl(data.url);
      setCoverImagePublicId(data.publicId);
    } else {
      setCoverImageUrl("");
      setCoverImagePublicId("");
    }
  };

  if (sessionPending || blogLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Blog not found</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-x-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin/blogs">Blogs</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit Blog</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave("DRAFT")}
              disabled={updateBlogMutation.isPending}
            >
              {updateBlogMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {status === "PUBLISHED" ? "Unpublish" : "Save Draft"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave(status === "PUBLISHED" ? undefined : "PUBLISHED")}
              disabled={updateBlogMutation.isPending}
            >
              {updateBlogMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                status === "PUBLISHED" ? <Save className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />
              )}
              {status === "PUBLISHED" ? "Save Changes" : "Publish"}
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 bg-gray-50 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/blogs")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blogs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              disabled={!title && !content}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>

          <div className="max-w-4xl mx-auto w-full space-y-6 pb-20">
            {/* Blog Type */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Blog Type
                  <span className="text-red-500">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-6">
                  <RadioGroup
                    value={type}
                    onValueChange={(value) => {
                      setType(value as BlogType);
                      if (value === "general") setCorridorIds([]);
                    }}
                    className="flex items-center gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="general" id="r-general" />
                      <Label htmlFor="r-general" className="font-normal cursor-pointer">
                        General
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="corridor" id="r-corridor" />
                      <Label htmlFor="r-corridor" className="font-normal cursor-pointer">
                        Corridor
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {type === "corridor" && (
                  <div className="pt-2 max-w-md">
                    <CorridorSelector
                      values={corridorIds}
                      onChange={setCorridorIds}
                      error={errors.corridorIds}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cover Image */}
            <CoverImageUpload
              value={coverImageUrl}
              publicId={coverImagePublicId}
              onChange={handleCoverImageChange}
            />

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Blog Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter blog title..."
                className={`text-xl font-semibold h-12 px-4 ${errors.title ? "border-destructive" : ""}`}
              />
              {errors.title && (
                <p className="text-sm text-destructive px-1">{errors.title}</p>
              )}
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
              <Label>
                Blog Content <span className="text-destructive">*</span>
              </Label>
              <TipTapEditor
                value={content}
                onChange={setContent}
                placeholder="Write your story..."
                minHeight="500px"
                minimal={true}
                className={errors.content ? "border-l-2 border-destructive pl-4" : ""}
              />
              {errors.content && (
                <p className="text-sm text-destructive mt-2">{errors.content}</p>
              )}
            </div>

            <Separator className="my-8" />

            {/* Advanced Settings Stack */}
            <div className="grid gap-6">
              {/* Author */}
              {/* <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Author (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Enter author name..."
                  />
                </CardContent>
              </Card> */}

              {/* SEO Settings */}
              {/* <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">SEO Settings (Optional)</CardTitle>
                  <CardDescription>
                    Optimize your blog for search engines and social media
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <Input
                      id="metaTitle"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder="SEO-optimized title for search results (max 60 chars)"
                      maxLength={60}
                      className={errors.metaTitle ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {metaTitle.length}/60 - Leave empty to use blog title
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <Textarea
                      id="metaDescription"
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder="Description for search results (max 160 chars)"
                      maxLength={160}
                      rows={3}
                      className={errors.metaDescription ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {metaDescription.length}/160 - Leave empty to use excerpt
                    </p>
                  </div>

                  <div>
                    <Label>Keywords</Label>
                    <KeywordInput
                      value={keywords}
                      onChange={setKeywords}
                      max={10}
                    />
                  </div>

                  <div>
                    <Label htmlFor="focusKeyphrase">Focus Keyphrase</Label>
                    <Input
                      id="focusKeyphrase"
                      value={focusKeyphrase}
                      onChange={(e) => setFocusKeyphrase(e.target.value)}
                      placeholder="Main keyword you want to rank for"
                      maxLength={100}
                    />
                  </div>
                </CardContent>
              </Card> */}

              {/* Info Detail */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Publication Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={status === "PUBLISHED" ? "default" : "secondary"}>
                      {status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{blog.updatedAt ? new Date(blog.updatedAt).toLocaleDateString() : "-"}</span>
                  </div>
                  {blog.publishedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Published Date</span>
                      <span>{new Date(blog.publishedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Preview Dialog */}
        <BlogPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={title}
          content={content}
          coverImageUrl={coverImageUrl}
          authorName={authorName || blog.authorName}
          type={type}
          corridorTitles={blog.corridors?.map(c => c.title)}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
