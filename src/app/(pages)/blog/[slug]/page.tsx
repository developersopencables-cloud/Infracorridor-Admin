import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import connectMongoose from '@/database/mongoose-connection';
import { BlogModel } from '@/models';
import { BlogWithCorridor } from '@/types/blog';
import { generateBlogStructuredData, generateBreadcrumbStructuredData } from '@/lib/structured-data';
import { checkAdminSession } from '@/database/auth-utils';
import BlogPageClient from './blog-page-client';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

interface Props {
  params: Promise<{ slug: string }>;
}

// Convert TipTap JSON to sanitized HTML
function convertTipTapToHTML(content: string): string {
  try {
    const json = JSON.parse(content);

    const html = generateHTML(json, [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg my-4",
        },
      }),
      Link.configure({
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4 hover:text-primary/80",
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
    ]);

    // Post-process: Fix external links that lack a protocol (e.g., 'www.google.com')
    // This prevents them from being treated as relative links by the browser.
    const fixedHtml = html.replace(/href="([^"|#|/][^"]+)"/g, (match, p1) => {
      // If it looks like a domain (has a dot) and doesn't have a protocol or start with a slash/hash
      if (!p1.includes('://') && !p1.startsWith('mailto:') && !p1.startsWith('tel:') && (p1.startsWith('www.') || p1.includes('.'))) {
        return `href="https://${p1}"`;
      }
      return match;
    });

    return fixedHtml;
  } catch (error) {
    console.error('Error converting TipTap JSON to HTML:', error);
    return '';
  }
}

// Server-side data fetching
async function getBlogBySlug(slug: string, isAdmin: boolean = false): Promise<BlogWithCorridor | null> {
  try {
    await connectMongoose();

    const query: any = {
      slug: slug.trim(),
    };

    if (!isAdmin) {
      query.status = 'PUBLISHED';
    }

    const blog = await BlogModel.findOne(query)
      .populate('corridorIds', 'title slug fromCity toCity fromCountry toCountry')
      .lean();

    if (!blog) {
      return null;
    }

    // Transform corridorIds to corridors
    const { corridorIds: corridors, corridorId: _oldId, ...rest } = blog as any;
    const transformedBlog = {
      ...rest,
      _id: blog._id.toString(),
      authorId: blog.authorId.toString(),
      publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : undefined,
      createdAt: blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
      updatedAt: blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
      corridors: corridors ? (corridors as any[]).map(c => ({
        ...c,
        _id: c._id.toString(),
      })) : [],
      corridorIds: corridors ? (corridors as any[]).map(c => c._id.toString()) : [],
    } as BlogWithCorridor;

    return transformedBlog;
  } catch (error) {
    console.error('Error fetching blog:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return {
      title: 'Blog Not Found',
      description: 'The requested blog post could not be found.',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
  const url = `${baseUrl}/blog/${slug}`;
  const title = blog.metaTitle || blog.title;
  const description = blog.metaDescription || `Read ${blog.title} by ${blog.authorName}`;

  return {
    title,
    description,
    keywords: blog.keywords || [],
    authors: [{ name: blog.authorName }],
    creator: blog.authorName,
    publisher: 'InfraCorridors',

    // Open Graph (Facebook, LinkedIn)
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: 'InfraCorridors',
      images: blog.coverImageUrl ? [{
        url: blog.coverImageUrl,
        width: 1200,
        height: 630,
        alt: title,
      }] : [],
      publishedTime: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : undefined,
      modifiedTime: new Date(blog.updatedAt).toISOString(),
      authors: blog.authorName ? [blog.authorName] : undefined,
      tags: blog.keywords || [],
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: blog.coverImageUrl ? [blog.coverImageUrl] : [],
    },

    // Canonical URL
    alternates: {
      canonical: blog.canonicalUrl || url,
    },

    // Robots
    robots: {
      index: blog.status === 'PUBLISHED',
      follow: blog.status === 'PUBLISHED',
    },
  };
}

// Server Component
export default async function PublicBlogPage({ params }: Props) {
  const { slug } = await params;
  
  // Check if user is admin to allow previewing drafts
  const headersList = await headers();
  const adminCheck = await checkAdminSession(headersList);
  const isAdminUser = !!adminCheck?.isAdmin;

  const blog = await getBlogBySlug(slug, isAdminUser);

  if (!blog) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

  // Convert TipTap JSON to HTML on the server
  const contentHtml = convertTipTapToHTML(blog.content);

  // Generate structured data
  const articleStructuredData = generateBlogStructuredData(blog, baseUrl);
  const breadcrumbStructuredData = generateBreadcrumbStructuredData(blog, baseUrl);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
      />

      {/* Client Component for interactive UI */}
      <BlogPageClient blog={blog} contentHtml={contentHtml} isAdmin={isAdminUser} />
    </>
  );
}
