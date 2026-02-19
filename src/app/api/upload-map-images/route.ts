import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import mongoose from "mongoose";

import connectMongoose from "@/database/mongoose-connection";
import { checkAdminSession } from "@/database/auth-utils";
import { MapImageModel } from "@/models";

export async function POST(request: NextRequest) {
    try {
        const headersList = await headers();
        const adminCheck = await checkAdminSession(headersList);

        if (!adminCheck || !adminCheck.user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized.",
                },
                { status: 401 },
            );
        }

        await connectMongoose();

        const body = (await request.json()) as {
            publicId: string;
            secureUrl?: string;
            corridorId?: string;
            corridorName?: string;
            folder?: string;
            originalFileName?: string;
        };

        const { publicId, secureUrl, corridorId, corridorName, folder, originalFileName } = body;

        if (!publicId || !publicId.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    error: "publicId is required",
                },
                { status: 400 },
            );
        }

        /* if (!corridorId && !corridorName) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Either corridorId or corridorName is required",
                },
                { status: 400 },
            );
        } */

        const url = secureUrl;

        if (!url || !url.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    error: "secureUrl is required",
                },
                { status: 400 },
            );
        }

        if (corridorId && !mongoose.Types.ObjectId.isValid(corridorId)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid corridorId",
                },
                { status: 400 },
            );
        }

        const fullCloudinaryPublicId =
            folder && folder.trim().length > 0 ? `${folder}/${publicId}` : publicId;

        const mapImage = await MapImageModel.create({
            userId: adminCheck.user.id,
            corridorId: corridorId || undefined,
            corridorName: corridorName || undefined,
            cloudinaryPublicId: fullCloudinaryPublicId,
            url,
            originalFileName: originalFileName || publicId,
            folder: folder,
        });

        return NextResponse.json(
            {
                success: true,
                data: mapImage.toObject(),
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error saving map image metadata:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to save map image metadata",
            },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const headersList = await headers();
        const adminCheck = await checkAdminSession(headersList);

        if (!adminCheck || !adminCheck.user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized.",
                },
                { status: 401 },
            );
        }

        await connectMongoose();

        const { searchParams } = new URL(request.url);
        const corridorId = searchParams.get("corridorId");
        const corridorName = searchParams.get("corridorName");
        const folder = searchParams.get("folder");
        const page = Number(searchParams.get("page") || "1");
        const limit = Math.min(Number(searchParams.get("limit") || "20"), 100);

        const query: Record<string, unknown> = {
            userId: adminCheck.user.id || undefined,
        };

        if (corridorId) {
            query.corridorId = corridorId;
        }

        if (corridorName) {
            query.corridorName = corridorName;
        }

        if (folder) {
            query.folder = folder;
        }

        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            MapImageModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            MapImageModel.countDocuments(query),
        ]);

        return NextResponse.json({
            success: true,
            data: items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching map images:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch map images",
            },
            { status: 500 },
        );
    }
}


