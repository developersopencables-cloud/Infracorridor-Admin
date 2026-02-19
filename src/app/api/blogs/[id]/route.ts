import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

import connectMongoose from '@/database/mongoose-connection';
import { checkAdminSession } from '@/database/auth-utils';
import { BlogModel } from '@/models';
import { blogUpdateSchema } from '@/validators/blog.validator';
import { deleteCloudinaryImage } from '@/lib/cloudinary';



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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const headersList = await headers();
    const adminCheck = await checkAdminSession(headersList);

    if (!adminCheck || !adminCheck.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Admin access required.',
        },
        { status: 401 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid blog ID',
        },
        { status: 400 },
      );
    }

    await connectMongoose();

    const blog = await BlogModel.findById(id)
      .populate('corridorIds', 'title slug fromCity toCity fromCountry toCountry')
      .lean();

    if (!blog) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blog not found',
        },
        { status: 404 },
      );
    }

    // Transform corridorIds to corridors
    const { corridorIds: corridors, ...rest } = blog;
    const transformedBlog = {
      ...rest,
      corridors: corridors || [],
      corridorIds: corridors?.map((c: any) => c._id?.toString()) || [],
    };

    return NextResponse.json({
      success: true,
      data: transformedBlog,
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch blog',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const headersList = await headers();
    const adminCheck = await checkAdminSession(headersList);

    if (!adminCheck || !adminCheck.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Admin access required.',
        },
        { status: 401 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid blog ID',
        },
        { status: 400 },
      );
    }

    await connectMongoose();

    const existing = await BlogModel.findById(id);
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blog not found',
        },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Validate with Zod
    const parseResult = blogUpdateSchema.safeParse(body);
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
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) {
      updateData.title = data.title.trim();
    }

    if (data.content !== undefined) {
      updateData.content = data.content;
    }

    if (data.authorName !== undefined) {
      updateData.authorName = data.authorName?.trim() || undefined;
    }

    if (data.coverImageUrl !== undefined) {
      // Delete old image if replacing with a new one
      if (
        existing.coverImagePublicId &&
        data.coverImageUrl !== existing.coverImageUrl
      ) {
        try {
          await deleteCloudinaryImage(existing.coverImagePublicId);
        } catch (e) {
          console.error('Failed to delete old cover image:', e);
        }
      }
      updateData.coverImageUrl = data.coverImageUrl || undefined;
    }

    if (data.coverImagePublicId !== undefined) {
      updateData.coverImagePublicId = data.coverImagePublicId || undefined;
    }

    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    if (data.corridorIds !== undefined) {
      if (data.corridorIds && Array.isArray(data.corridorIds)) {
        updateData.corridorIds = data.corridorIds.map(id => new mongoose.Types.ObjectId(id));
      } else {
        updateData.corridorIds = [];
      }
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      // Set publishedAt when publishing for the first time
      if (data.status === 'PUBLISHED' && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    // SEO fields
    if (data.keywords !== undefined) {
      updateData.keywords = data.keywords || [];
    }

    if (data.metaTitle !== undefined) {
      updateData.metaTitle = data.metaTitle?.trim() || undefined;
    }

    if (data.metaDescription !== undefined) {
      updateData.metaDescription = data.metaDescription?.trim() || undefined;
    }

    if (data.focusKeyphrase !== undefined) {
      updateData.focusKeyphrase = data.focusKeyphrase?.trim() || undefined;
    }

    if (data.canonicalUrl !== undefined) {
      updateData.canonicalUrl = data.canonicalUrl?.trim() || undefined;
    }

    const updated = await BlogModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('corridorIds', 'title slug fromCity toCity fromCountry toCountry')
      .lean();

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update blog',
        },
        { status: 500 },
      );
    }

    // Transform corridorIds to corridors
    const { corridorIds: corridors, ...rest } = updated;
    const transformedBlog = {
      ...rest,
      corridors: corridors || [],
      corridorIds: corridors?.map((c: any) => c._id?.toString()) || [],
    };

    return NextResponse.json({
      success: true,
      data: transformedBlog,
      message: 'Blog updated successfully',
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update blog',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const headersList = await headers();
    const adminCheck = await checkAdminSession(headersList);

    if (!adminCheck || !adminCheck.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Admin access required.',
        },
        { status: 401 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid blog ID',
        },
        { status: 400 },
      );
    }

    await connectMongoose();

    const existing = await BlogModel.findById(id);
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blog not found',
        },
        { status: 404 },
      );
    }

    // Delete cover image from Cloudinary if exists
    if (existing.coverImagePublicId) {
      try {
        await deleteCloudinaryImage(existing.coverImagePublicId);
      } catch (e) {
        console.error('Failed to delete cover image:', e);
      }
    }

    await BlogModel.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete blog',
      },
      { status: 500 },
    );
  }
}
