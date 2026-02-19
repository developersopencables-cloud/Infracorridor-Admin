import { MetadataRoute } from 'next';
import connectMongoose from '@/database/mongoose-connection';
import { BlogModel } from '@/models';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

  await connectMongoose();

  // Fetch all published blogs
  const blogs = await BlogModel.find({ status: 'PUBLISHED' })
    .select('slug updatedAt')
    .sort({ updatedAt: -1 })
    .lean();

  const blogUrls = blogs.map((blog) => ({
    url: `${baseUrl}/blog/${blog.slug}`,
    lastModified: blog.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Static pages
  const staticUrls = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
  ];

  return [...staticUrls, ...blogUrls];
}
