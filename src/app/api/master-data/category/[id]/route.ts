import { NextRequest, NextResponse } from 'next/server';
import connectMongoose from '@/database/mongoose-connection';
import { CategoryModel } from '@/models';
import { checkAdminSession } from '@/database/auth-utils';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

function isValidObjectId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectMongoose();
    const { id } = await params;

    if (!isValidObjectId(id)) {
        return NextResponse.json(
            { success: false, error: 'Invalid category ID' },
            { status: 400 }
        );
    }

    const category = await CategoryModel.findById(id).lean();

    if (!category) {
        return NextResponse.json(
            { success: false, error: 'Category not found' },
            { status: 404 }
        );
    }

    const searchParams = request.nextUrl.searchParams;
    const checkImpact = searchParams.get('impact') === 'true';

    if (checkImpact) {
        const categoryObjectId = new mongoose.Types.ObjectId(id);
        const { VendorModel } = await import('@/models');
        const vendors = await VendorModel.find({ categoryIds: categoryObjectId }).lean();

        const toUpdate = vendors.filter((v: any) => v.categoryIds.length > 1);
        const toDelete = vendors.filter((v: any) => v.categoryIds.length === 1);

        return NextResponse.json({
            success: true,
            data: {
                category,
                impact: {
                    vendorsToUpdate: toUpdate.map((v: any) => ({ _id: v._id, name: v.name, categoryCount: v.categoryIds.length })),
                    vendorsToDelete: toDelete.map((v: any) => ({ _id: v._id, name: v.name, categoryCount: v.categoryIds.length })),
                    totalVendors: vendors.length
                }
            }
        });
    }

    return NextResponse.json({ success: true, data: category });
}


export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const headersList = await headers();
    const admin = await checkAdminSession(headersList);

    if (!admin?.isAdmin) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    await connectMongoose();

    const { id } = await params;

    if (!isValidObjectId(id)) {
        return NextResponse.json(
            { success: false, error: 'Invalid category ID' },
            { status: 400 }
        );
    }

    const { title, description, classificationIds } = await request.json();

    const update: Record<string, unknown> = {};

    if (title !== undefined) {
        if (!title.trim()) {
            return NextResponse.json(
                { success: false, error: 'Title cannot be empty' },
                { status: 400 }
            );
        }
        update.title = title.trim();
    }

    if (description !== undefined) {
        update.description = description.trim();
    }

    if (classificationIds !== undefined) {
        update.classificationIds = classificationIds;
    }

    try {
        const updated = await CategoryModel.findByIdAndUpdate(
            id,
            update,
            { new: true, runValidators: true }
        ).lean();

        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Category not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'Category updated successfully',
        });
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && typeof err.code === 'number') {
            return NextResponse.json(
                { success: false, error: 'Category title already exists' },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Failed to update category' },
            { status: 500 }
        );

    }
}

export async function DELETE(
    _: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const headersList = await headers();
    const session = await checkAdminSession(headersList);

    if (!session?.isAdmin) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    await connectMongoose();

    const { id } = await params;

    if (!isValidObjectId(id)) {
        return NextResponse.json(
            { success: false, error: 'Invalid category ID' },
            { status: 400 }
        );
    }

    const categoryObjectId = new mongoose.Types.ObjectId(id);
    const { VendorModel, CorridorModel } = await import('@/models');

    // 1. Find vendors that use this category
    const vendors = await VendorModel.find({ categoryIds: categoryObjectId });

    const vendorsToUpdate = vendors.filter(v => v.categoryIds.length > 1);
    const vendorsToDelete = vendors.filter(v => v.categoryIds.length === 1);

    const deletedVendorIds = vendorsToDelete.map(v => v._id);

    // 2. Perform updates and deletions
    try {
        // Update vendors that have other categories
        if (vendorsToUpdate.length > 0) {
            await VendorModel.updateMany(
                { _id: { $in: vendorsToUpdate.map(v => v._id) } },
                { $pull: { categoryIds: categoryObjectId } }
            );
        }

        // Delete vendors that only have this category
        if (vendorsToDelete.length > 0) {
            await VendorModel.deleteMany({ _id: { $in: deletedVendorIds } });
        }

        // 3. Clean up Corridors
        // Remove category from categoryIds array
        await CorridorModel.updateMany(
            { categoryIds: categoryObjectId },
            { $pull: { categoryIds: categoryObjectId } }
        );

        // Remove category from vendorCategoryPairs
        await CorridorModel.updateMany(
            { 'vendorCategoryPairs.categoryId': categoryObjectId },
            { $pull: { vendorCategoryPairs: { categoryId: categoryObjectId } } }
        );

        // Remove deleted vendors from vendorIds array
        if (deletedVendorIds.length > 0) {
            await CorridorModel.updateMany(
                { vendorIds: { $in: deletedVendorIds } },
                { $pull: { vendorIds: { $in: deletedVendorIds } } }
            );
        }

        // 4. Finally delete the category
        const deleted = await CategoryModel.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Category not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Category and associated vendor data managed successfully',
            summary: {
                vendorsUpdated: vendorsToUpdate.length,
                vendorsDeleted: vendorsToDelete.length
            }
        });
    } catch (error: any) {
        console.error('Error during category deletion cascade:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to perform cascading deletion: ' + error.message },
            { status: 500 }
        );
    }
}
