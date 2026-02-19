import { NextRequest, NextResponse } from 'next/server';
import connectMongoose from '@/database/mongoose-connection';
import { CategoryClassificationModel } from '@/models';
import { checkAdminSession } from '@/database/auth-utils';
import { headers } from 'next/headers';
import { sanitizeSearch } from '@/utils/validation';
import { categoryClassificationSchema } from '@/validators/category-classification.validator';

export async function GET(request: NextRequest) {
    await connectMongoose();

    const { searchParams } = new URL(request.url);
    const search = sanitizeSearch(searchParams.get('search'));

    const query = search
        ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ],
        }
        : {};

    const classifications = await CategoryClassificationModel.find(query)
        .sort({ createdAt: 1 })
        .lean();

    return NextResponse.json({
        success: true,
        data: classifications,
        count: classifications.length,
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
        const validatedData = categoryClassificationSchema.parse(body);

        const classification = await CategoryClassificationModel.create({
            name: validatedData.name,
            description: validatedData.description || '',
        });

        return NextResponse.json(
            { success: true, data: classification },
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
                { success: false, error: 'Classification already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
