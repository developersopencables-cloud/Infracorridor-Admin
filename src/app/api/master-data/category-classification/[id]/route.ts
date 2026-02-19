import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectMongoose from '@/database/mongoose-connection';
import { CategoryClassificationModel, CategoryModel } from '@/models';
import { checkAdminSession } from '@/database/auth-utils';
import { headers } from 'next/headers';
import { categoryClassificationSchema } from '@/validators/category-classification.validator';

function isValidObjectId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(_: NextRequest, context: Params) {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
        return NextResponse.json(
            { success: false, error: 'Invalid classification id' },
            { status: 400 }
        );
    }

    await connectMongoose();

    const classification = await CategoryClassificationModel.findById(id).lean();

    if (!classification) {
        return NextResponse.json(
            { success: false, error: 'Classification not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        data: classification,
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
            { success: false, error: 'Invalid classification id' },
            { status: 400 }
        );
    }

    await connectMongoose();

    try {
        const body = await request.json();
        const validatedData = categoryClassificationSchema.parse(body);

        const classification = await CategoryClassificationModel.findByIdAndUpdate(
            id,
            {
                name: validatedData.name,
                description: validatedData.description || ''
            },
            { new: true, runValidators: true }
        );

        if (!classification) {
            return NextResponse.json(
                { success: false, error: 'Classification not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: classification,
        });
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'ZodError') {
            const zodError = err as unknown as { errors: Array<{ message: string }> };
            return NextResponse.json(
                { success: false, error: zodError.errors[0]?.message || 'Validation error' },
                { status: 400 }
            );
        }

        if (err instanceof Error && 'code' in err && err.code === 11000) {
            return NextResponse.json(
                { success: false, error: 'Classification with this name already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, context: Params) {
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
        const classification = await CategoryClassificationModel.findById(id);

        if (!classification) {
            return NextResponse.json(
                { success: false, error: 'Classification not found' },
                { status: 404 }
            );
        }

        const classificationObjectId = new mongoose.Types.ObjectId(id);
        await CategoryModel.updateMany(
            { classificationIds: classificationObjectId },
            { $pull: { classificationIds: classificationObjectId } }
        );

        await CategoryClassificationModel.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Classification deleted successfully and references removed from categories'
        });

    } catch (err: unknown) {
        console.error('Error deleting classification:', err);

        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
