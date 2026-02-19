import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectMongoose from '@/database/mongoose-connection';
import { CategoryClassificationModel, CategoryModel } from '@/models';
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

export async function GET(_: NextRequest, context: Params) {
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
            { success: false, error: 'Invalid classification id' },
            { status: 400 }
        );
    }

    await connectMongoose();

    try {
        // First verify the classification exists
        const classification = await CategoryClassificationModel.findById(id).lean();
        
        if (!classification) {
            return NextResponse.json(
                { success: false, error: 'Classification not found' },
                { status: 404 }
            );
        }

        // Find all categories that use this classification
        const affectedCategories = await CategoryModel.find({
            classificationIds: id
        })
        .select('_id title classificationIds createdAt updatedAt')
        .lean();

        // Format the response to include classification count for each category
        const formattedCategories = affectedCategories.map(category => ({
            _id: category._id,
            title: category.title,
            classificationCount: Array.isArray(category.classificationIds) ? category.classificationIds.length : 0,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt
        }));

        return NextResponse.json({
            success: true,
            data: {
                classification: {
                    _id: classification._id,
                    name: classification.name,
                    description: classification.description
                },
                affectedCategories: formattedCategories,
                totalAffected: formattedCategories.length
            }
        });

    } catch (error) {
        console.error('Error fetching affected categories:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
