import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

import connectMongoose from '@/database/mongoose-connection';
import { checkAdminSession } from '@/database/auth-utils';
import { BlogModel } from '@/models';
import { blogSchema } from '@/validators/blog.validator';
import { sanitizeSearch } from '@/utils/validation';
import { BlogStatus, BlogType } from '@/types/blog';

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
  return `${base}-${Date.now()}`;
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

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminCheck = await checkAdminSession(headersList);

    // if (!adminCheck || !adminCheck.isAdmin) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: 'Unauthorized. Admin access required.',
    //     },
    //     { status: 401 },
    //   );
    // }

    await connectMongoose();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status') as BlogStatus | 'ALL' | null;
    const type = searchParams.get('type') as BlogType | null;
    const corridorId = searchParams.get('corridorId'); // Keep for single filter if needed
    const corridorIds = searchParams.get('corridorIds')?.split(',');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query: Record<string, unknown> = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (corridorId) {
      query.corridorIds = new mongoose.Types.ObjectId(corridorId);
    } else if (corridorIds && corridorIds.length > 0) {
      query.corridorIds = { $in: corridorIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    const sanitizedSearch = sanitizeSearch(search);
    if (sanitizedSearch) {
      query.title = { $regex: sanitizedSearch, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [blogs, total] = await Promise.all([
      BlogModel.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('corridorIds', 'title slug fromCity toCity fromCountry toCountry')
        .lean(),
      BlogModel.countDocuments(query),
    ]);

    // Calculate stats
    const allBlogs = await BlogModel.find({}).lean();
    const publishedCount = allBlogs.filter((b) => b.status === 'PUBLISHED').length;
    const draftCount = allBlogs.filter((b) => b.status === 'DRAFT').length;
    const generalCount = allBlogs.filter((b) => b.type === 'general').length;
    const corridorCount = allBlogs.filter((b) => b.type === 'corridor').length;

    // Transform corridorIds to corridors for frontend
    const transformedBlogs = blogs.map((blog) => {
      const { corridorIds: corridors, ...rest } = blog;
      return {
        ...rest,
        corridors: corridors || [],
        corridorIds: corridors?.map((c: any) => c._id?.toString()) || [],
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedBlogs,
      count: total,
      stats: {
        total: allBlogs.length,
        published: publishedCount,
        draft: draftCount,
        general: generalCount,
        corridor: corridorCount,
      },
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch blogs',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminCheck = await checkAdminSession(headersList);

    if (!adminCheck || !adminCheck.isAdmin || !adminCheck.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Admin access required.',
        },
        { status: 401 },
      );
    }

    await connectMongoose();

    const body = await request.json();

    // Validate with Zod
    const parseResult = blogSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || 'Validation failed',
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const data = parseResult.data;

    // Validate corridorIds if type is 'corridor'
    if (data.type === 'corridor' && data.corridorIds) {
      for (const id of data.corridorIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid corridor ID: ${id}`,
            },
            { status: 400 },
          );
        }
      }
    }

    const slug = generateSlug(data.title);

    const blog = await BlogModel.create({
      _id: new mongoose.Types.ObjectId(),
      slug,
      title: data.title.trim(),
      content: data.content,
      coverImageUrl: data.coverImageUrl || undefined,
      coverImagePublicId: data.coverImagePublicId || undefined,
      type: data.type,
      corridorIds: data.type === 'corridor' && data.corridorIds
        ? data.corridorIds.map(id => new mongoose.Types.ObjectId(id))
        : undefined,
      status: data.status || 'DRAFT',
      authorId: new mongoose.Types.ObjectId(adminCheck.user.id),
      authorName: data.authorName?.trim() || undefined,
      publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
      // SEO fields
      keywords: data.keywords || [],
      metaTitle: data.metaTitle?.trim() || undefined,
      metaDescription: data.metaDescription?.trim() || undefined,
      focusKeyphrase: data.focusKeyphrase?.trim() || undefined,
      canonicalUrl: data.canonicalUrl?.trim() || undefined,
    });

    const blogData = blog.toObject();

    return NextResponse.json(
      {
        success: true,
        data: blogData,
        message: 'Blog created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating blog:', error);

    if (error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blog with this slug already exists',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create blog',
      },
      { status: 500 },
    );
  }
}
