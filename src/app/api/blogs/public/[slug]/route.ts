import { NextRequest, NextResponse } from 'next/server';

import connectMongoose from '@/database/mongoose-connection';
import { BlogModel } from '@/models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || !slug.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blog slug is required',
        },
        { status: 400 },
      );
    }

    await connectMongoose();

    const blog = await BlogModel.findOne({
      slug: slug.trim(),
      status: 'PUBLISHED',
    })
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
    console.error('Error fetching public blog:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch blog',
      },
      { status: 500 },
    );
  }
}
