import { Blog } from '@/types/blog';

/**
 * Calculate word count from TipTap JSON content
 */
function calculateWordCount(content: string): number {
  try {
    const parsed = JSON.parse(content);
    const text = extractTextFromTipTap(parsed);
    return text.split(/\s+/).filter(Boolean).length;
  } catch {
    // Fallback for plain text
    return content.split(/\s+/).filter(Boolean).length;
  }
}

function extractTextFromTipTap(node: unknown): string {
  if (!node || typeof node !== 'object') return '';

  const n = node as Record<string, unknown>;

  if (n.type === 'text' && typeof n.text === 'string') {
    return n.text;
  }

  if (Array.isArray(n.content)) {
    return n.content.map(extractTextFromTipTap).join(' ');
  }

  return '';
}

/**
 * Generate JSON-LD Article schema for a blog post
 * @see https://schema.org/Article
 */
export function generateBlogStructuredData(blog: Blog, baseUrl: string) {
  const url = `${baseUrl}/blog/${blog.slug}`;
  const wordCount = calculateWordCount(blog.content);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: blog.title,
    description: blog.metaDescription || `Read ${blog.title} by ${blog.authorName}`,
    image: blog.coverImageUrl || undefined,
    datePublished: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : undefined,
    dateModified: new Date(blog.updatedAt).toISOString(),
    author: {
      '@type': 'Person',
      name: blog.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'InfraCorridors',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    keywords: blog.keywords?.join(', ') || undefined,
    wordCount,
    articleSection: blog.type === 'corridor' ? 'Corridor' : 'General',
    inLanguage: 'en-US',
  };
}

/**
 * Generate JSON-LD BreadcrumbList schema for a blog post
 * @see https://schema.org/BreadcrumbList
 */
export function generateBreadcrumbStructuredData(blog: Blog, baseUrl: string) {
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: baseUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Blog',
      item: `${baseUrl}/blog`,
    },
  ];

  // Add corridor breadcrumb if blog type is corridor
  if (blog.type === 'corridor' && blog.corridorIds && blog.corridorIds.length > 0) {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: 'Corridors',
      item: `${baseUrl}/corridors`,
    });
  }

  // Add current blog post
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: blog.title,
    item: `${baseUrl}/blog/${blog.slug}`,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}
