"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Eye,
  Loader2,
  FileText,
  Settings2,
  Map,
} from "lucide-react";
import { cn } from "@/utils/utils";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { useCreateBlog } from "@/hooks/use-api";
import { TipTapEditor } from "@/components/blog/tiptap-editor";
import { CoverImageUpload } from "@/components/blog/cover-image-upload";
import { CorridorSelector } from "@/components/blog/corridor-selector";
import { BlogPreviewDialog } from "@/components/blog/blog-preview-dialog";
import { KeywordInput } from "@/components/blog/keyword-input";
import { BlogType } from "@/types/blog";
import { CardDescription } from "@/components/ui/card";

export default function NewBlogPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const createBlogMutation = useCreateBlog();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImagePublicId, setCoverImagePublicId] = useState("");
  const [type, setType] = useState<BlogType>("general");
  const [corridorIds, setCorridorIds] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // SEO fields
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [focusKeyphrase, setFocusKeyphrase] = useState("");



  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

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



  const handleSave = async (status: "DRAFT" | "PUBLISHED") => {
    if (!validateForm()) return;

    createBlogMutation.mutate(
      {
        title: title.trim(),
        content,
        authorName: session?.user?.name || session?.user?.email || undefined,
        coverImageUrl: coverImageUrl || undefined,
        coverImagePublicId: coverImagePublicId || undefined,
        type,
        corridorIds: type === "corridor" ? corridorIds : [],
        status,
        // SEO fields
        keywords: keywords.length > 0 ? keywords : undefined,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        focusKeyphrase: focusKeyphrase.trim() || undefined,
      },
      {
        onSuccess: () => {
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

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
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
                <BreadcrumbPage>New Blog</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave("DRAFT")}
              disabled={createBlogMutation.isPending}
            >
              {createBlogMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave("PUBLISHED")}
              disabled={createBlogMutation.isPending}
            >
              {createBlogMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Publish
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 bg-gray-50 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          {/* Header Actions - Only visible on Step 1 for general navigation */}
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

                <Card>
                    <CardHeader>
                      <CardTitle>Blog Type
                        <span className="text-red-500">*</span>
                      </CardTitle>
                    
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Compact Blog Type Selector */}
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
                            <Label htmlFor="r-general" className="font-normal cursor-pointer">General</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="corridor" id="r-corridor" />
                            <Label htmlFor="r-corridor" className="font-normal cursor-pointer">Corridor</Label>
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
                {/* Step 1: Content */}
                <CoverImageUpload
                  value={coverImageUrl}
                  publicId={coverImagePublicId}
                  onChange={handleCoverImageChange}
                />

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

          </div>
        </div>

        {/* Preview Dialog - Keep persistent */}
        <BlogPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={title}
          content={content}
          coverImageUrl={coverImageUrl}
          authorName={session?.user?.name || session?.user?.email || "Author"}
          type={type}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
