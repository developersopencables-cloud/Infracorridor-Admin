import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectMongoose from '@/database/mongoose-connection';
import { VendorModel } from '@/models';
import { checkAdminSession } from '@/database/auth-utils';
import { headers } from 'next/headers';

function isValidObjectId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(request: NextRequest, context: Params) {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
        return NextResponse.json(
            { success: false, error: 'Invalid vendor id' },
            { status: 400 }
        );
    }

    await connectMongoose();

    const vendor = await VendorModel.findById(id).lean();

    if (!vendor) {
        return NextResponse.json(
            { success: false, error: 'Vendor not found' },
            { status: 404 }
        );
    }

    const searchParams = typeof request.url === 'string' ? new URL(request.url).searchParams : new URL(request.nextUrl).searchParams;
    const checkImpact = searchParams.get('impact') === 'true';

    if (checkImpact) {
        const { CorridorModel } = await import('@/models');
        const corridors = await CorridorModel.find({
            $or: [
                { vendorIds: id },
                { 'vendorCategoryPairs.vendorId': id }
            ]
        }).select('title slug type').lean();

        return NextResponse.json({
            success: true,
            data: {
                vendor,
                impact: {
                    corridorsAffected: corridors.map((c: any) => ({ _id: c._id, title: c.title, slug: c.slug, type: c.type })),
                    totalCorridors: corridors.length
                }
            }
        });
    }

    return NextResponse.json({
        success: true,
        data: vendor,
    });
}

export async function PUT(request: NextRequest, context: Params) {
    const headersList = await headers();
    const admin = await checkAdminSession(headersList);

    if (!admin?.isAdmin) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
        return NextResponse.json(
            { success: false, error: 'Invalid vendor id' },
            { status: 400 }
        );
    }

    await connectMongoose();

    const updates = await request.json();

    if (updates.categoryIds) {
        if (!Array.isArray(updates.categoryIds) || updates.categoryIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'At least one category is required' },
                { status: 400 }
            );
        }
        // Validate all category IDs
        for (const categoryId of updates.categoryIds) {
            if (!isValidObjectId(categoryId)) {
                return NextResponse.json(
                    { success: false, error: `Invalid categoryId: ${categoryId}` },
                    { status: 400 }
                );
            }
        }
    }

    try {
        const vendor = await VendorModel.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!vendor) {
            return NextResponse.json(
                { success: false, error: 'Vendor not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: vendor,
        });
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
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to update vendor' },
            { status: 500 }
        );
    }
}

export async function DELETE(_: NextRequest, context: Params) {
    const headersList = await headers();
    const admin = await checkAdminSession(headersList);

    if (!admin?.isAdmin) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
        return NextResponse.json(
            { success: false, error: 'Invalid vendor id' },
            { status: 400 }
        );
    }

    await connectMongoose();

    const { CorridorModel } = await import('@/models');
    const vendorObjectId = new mongoose.Types.ObjectId(id);

    // Remove vendor from vendorIds array in all corridors
    await CorridorModel.updateMany(
        { vendorIds: vendorObjectId },
        { $pull: { vendorIds: vendorObjectId } }
    );

    // Remove vendor from vendorCategoryPairs in all corridors
    await CorridorModel.updateMany(
        { 'vendorCategoryPairs.vendorId': vendorObjectId },
        { $pull: { vendorCategoryPairs: { vendorId: vendorObjectId } } }
    );

    const deleted = await VendorModel.findByIdAndDelete(id);

    if (!deleted) {
        return NextResponse.json(
            { success: false, error: 'Vendor not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        message: 'Vendor deleted and references removed from corridors',
    });
}
