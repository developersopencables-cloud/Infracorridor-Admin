import { NextRequest, NextResponse } from "next/server";
import connectMongoose from '@/database/mongoose-connection';
import RfpModel from '@/models/Rfp';
import { checkAdminSession } from '@/database/auth-utils';
import { headers } from 'next/headers';
import { sanitizeSearch } from '@/utils/validation';


export async function GET(request: NextRequest) {
    const headersList = await headers();
    const admin = await checkAdminSession(headersList);

    if (!admin?.isAdmin) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoose();

    const { searchParams } = new URL(request.url);
    const search = sanitizeSearch(searchParams.get('search'));
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = 50;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    const [rfps, total] = await Promise.all([
        RfpModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        RfpModel.countDocuments(query),
    ]);

    const transformedRfps = rfps.map((rfp) => ({
        ...rfp,
        _id: rfp._id.toString(),
    }));

    return NextResponse.json({
        success: true,
        data: transformedRfps,
        count: total,
    });
}


