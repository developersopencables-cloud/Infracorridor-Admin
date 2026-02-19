import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectMongoose from '@/database/mongoose-connection';
import { VendorModel } from '@/models';
import { checkAdminSession } from '@/database/auth-utils';
import { headers } from 'next/headers';

function isValidObjectId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(request: NextRequest) {
    await connectMongoose();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const categoryId = searchParams.get('categoryId');

    const query: Record<string, unknown> = {};

    if (categoryId) {
        if (!isValidObjectId(categoryId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid categoryId' },
                { status: 400 }
            );
        }
        // Filter vendors that have this categoryId in their categoryIds array
        query.categoryIds = { $in: [categoryId] };
    }

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    const vendors = await VendorModel.find(query)
        .sort({ createdAt: -1 })
        .lean();

    return NextResponse.json({
        success: true,
        data: vendors,
        count: vendors.length,
    });
}

export async function POST(request: NextRequest) {
    const headersList = await headers();
    const admin = await checkAdminSession(headersList);

    if (!admin?.isAdmin) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    await connectMongoose();

    const { name, description, logoUrl, website, categoryIds } = await request.json();

    if (!name || !name.trim()) {
        return NextResponse.json(
            { success: false, error: 'Vendor name is required' },
            { status: 400 }
        );
    }

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
        return NextResponse.json(
            { success: false, error: 'At least one category is required' },
            { status: 400 }
        );
    }

    // Validate all category IDs
    for (const categoryId of categoryIds) {
        if (!isValidObjectId(categoryId)) {
            return NextResponse.json(
                { success: false, error: `Invalid categoryId: ${categoryId}` },
                { status: 400 }
            );
        }
    }

    try {
        const vendor = await VendorModel.create({
            _id: new mongoose.Types.ObjectId(),
            name: name.trim(),
            description: description?.trim() || '',
            logoUrl: logoUrl?.trim() || '',
            website: website?.trim() || '',
            categoryIds,
        });

        return NextResponse.json(
            { success: true, data: vendor },
            { status: 201 }
        );
    } catch (error) {
        if (
            error instanceof mongoose.Error &&
            'code' in error &&
            error.code === 11000
        ) {
            return NextResponse.json(
                { success: false, error: 'Vendor with this name already exists' },
                { status: 409 }
            );
        }
        throw error;
    }
}
