import { NextRequest, NextResponse } from 'next/server';
import connectMongoose from '@/database/mongoose-connection';
import { CategoryModel } from '@/models';
import { checkAdminSession } from '@/database/auth-utils';
import { headers } from 'next/headers';
import { sanitizeSearch } from '@/utils/validation';
import { categorySchema } from '@/validators/category.validator';
import mongoose from 'mongoose';
export async function GET(request: NextRequest) {
    await connectMongoose();

    const { searchParams } = new URL(request.url);
    const search = sanitizeSearch(searchParams.get('search'));

    const classificationId = searchParams.get('classificationId');

    const query: Record<string, any> = {};

    if (classificationId) {
        if (!mongoose.Types.ObjectId.isValid(classificationId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid classificationId' },
                { status: 400 }
            );
        }
        query.classificationIds = { $in: [classificationId] };
    }

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    const categories = await CategoryModel.find(query)
        .populate('classificationIds', 'name')
        .sort({ createdAt: 1 })
        .lean();

    return NextResponse.json({
        success: true,
        data: categories,
        count: categories.length,
    });
}

export async function POST(request: NextRequest) {
    const headersList = await headers();
    const admin = await checkAdminSession(headersList);

    if (!admin?.isAdmin) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoose();

    try {
        const body = await request.json();
        const validatedData = categorySchema.parse(body);

        const category = await CategoryModel.create({
            _id: new mongoose.Types.ObjectId(),
            title: validatedData.title,
            description: validatedData.description || '',
            classificationIds: validatedData.classificationIds || [],
        });

        return NextResponse.json(
            { success: true, data: category },
            { status: 201 }
        );
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json(
                { success: false, error: err.errors[0].message },
                { status: 400 }
            );
        }

        if (err.code === 11000) {
            return NextResponse.json(
                { success: false, error: 'Category already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    const headersList = await headers();
    const admin = await checkAdminSession(headersList);

    if (!admin?.isAdmin) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoose();

    try {
        const body = await request.json();
        const { _id, ...data } = body;

        if (!_id) {
            return NextResponse.json(
                { success: false, error: 'Category ID is required' },
                { status: 400 }
            );
        }

        const validatedData = categorySchema.parse(data);

        const updated = await CategoryModel.findByIdAndUpdate(
            _id,
            {
                title: validatedData.title,
                description: validatedData.description || '',
                classificationIds: validatedData.classificationIds || [],
            },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Category not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json(
                { success: false, error: err.errors[0].message },
                { status: 400 }
            );
        }

        if (err.code === 11000) {
            return NextResponse.json(
                { success: false, error: 'Category with this title already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const headersList = await headers();
    const admin = await checkAdminSession(headersList);

    if (!admin?.isAdmin) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoose();

    const { searchParams } = new URL(request.url);

    const id = searchParams.get('_id') || searchParams.get('id');

    if (!id) {
        return NextResponse.json(
            { success: false, error: 'Category ID is required' },
            { status: 400 }
        );
    }

    const deleted = await CategoryModel.findByIdAndDelete(id);

    if (!deleted) {
        return NextResponse.json(
            { success: false, error: 'Category not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({ success: true });
}
