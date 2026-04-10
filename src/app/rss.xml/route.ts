import { NextResponse } from 'next/server';
import connectMongoose from '@/database/mongoose-connection';
import { BlogModel } from '@/models';

export const dynamic = 'force-dynamic';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

    await connectMongoose();

    // Fetch latest 50 published blogs
    const blogs = await BlogModel.find({ status: 'PUBLISHED' })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const rssItems = blogs
      .map((blog) => {
        const link = `${baseUrl}/blog/${blog.slug}`;
        const pubDate = blog.publishedAt
          ? new Date(blog.publishedAt).toUTCString()
          : new Date(blog.createdAt).toUTCString();
        const description = blog.metaDescription || `Read ${blog.title} by ${blog.authorName}`;

        return `
    <item>
      <title>${escapeXml(blog.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(description)}</description>
      <author>${escapeXml(blog.authorName)}</author>
      <pubDate>${pubDate}</pubDate>
      ${blog.coverImageUrl ? `<enclosure url="${escapeXml(blog.coverImageUrl)}" type="image/jpeg" />` : ''}
      ${blog.keywords ? blog.keywords.map((kw: string) => `<category>${escapeXml(kw)}</category>`).join('\n      ') : ''}
    </item>`;
      })
      .join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>InfraCorridors Blog</title>
    <link>${baseUrl}</link>
    <description>Latest insights on submarine cable infrastructure corridors and bandwidth management</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new NextResponse('Error generating RSS feed', { status: 500 });
  }
}
