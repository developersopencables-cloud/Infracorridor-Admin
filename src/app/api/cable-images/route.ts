import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import mongoose from "mongoose";
import connectMongoose from "@/database/mongoose-connection";
import { CableImageModel } from "@/models";
import { checkAdminSession } from "@/database/auth-utils";

export async function GET(request: NextRequest) {
    try {
        await connectMongoose();
        const headersList = await headers();
        const sessionCheck = await checkAdminSession(headersList);

        if (!sessionCheck || !sessionCheck.user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search");

        const skip = (page - 1) * limit;

        const query: any = {};
        if (search) {
            query.$or = [
                { cableName: { $regex: search, $options: "i" } },
            ];
        }

        const [images, total] = await Promise.all([
            CableImageModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            CableImageModel.countDocuments(query),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                data: images,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error("Error fetching cable images:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch cable images" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectMongoose();
        const headersList = await headers();
        const sessionCheck = await checkAdminSession(headersList);

        if (!sessionCheck || !sessionCheck.user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { cableId, cableName, cloudinaryPublicId, url, width, height, format, sizeBytes } = body;

        if (!cableId || !cableName || !cloudinaryPublicId || !url) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const newImage = await CableImageModel.create({
            userId: sessionCheck.user.id,
            cableId,
            cableName,
            cloudinaryPublicId,
            url,
            folder: "cable-images",
            width,
            height,
            format,
            sizeBytes,
        });

        return NextResponse.json({
            success: true,
            data: newImage,
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating cable image:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create cable image" },
            { status: 500 }
        );
    }
}
