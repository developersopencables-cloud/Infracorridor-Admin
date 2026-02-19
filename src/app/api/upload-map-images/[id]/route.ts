import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import connectMongoose from "@/database/mongoose-connection";
import { checkAdminSession } from "@/database/auth-utils";
import { MapImageModel } from "@/models";
import { deleteMapImage } from "@/lib/cloudinary";

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
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

        const { id } = await context.params;

        const mapImage = await MapImageModel.findById(id);
        if (!mapImage) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Map image not found",
                },
                { status: 404 },
            );
        }

        if (mapImage.userId !== adminCheck.user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Forbidden.",
                },
                { status: 403 },
            );
        }

        await deleteMapImage(mapImage.cloudinaryPublicId);
        await MapImageModel.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: "Map image deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting map image:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete map image",
            },
            { status: 500 },
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
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

        const { id } = await context.params;
        const body = await request.json();

        const mapImage = await MapImageModel.findById(id);
        if (!mapImage) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Map image not found",
                },
                { status: 404 },
            );
        }

        if (mapImage.userId !== adminCheck.user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Forbidden.",
                },
                { status: 403 },
            );
        }

        // Update allowed fields
        const updateData: any = {};

        if (body.corridorId !== undefined) updateData.corridorId = body.corridorId || null;
        if (body.corridorName !== undefined) updateData.corridorName = body.corridorName;
        if (body.folder !== undefined) updateData.folder = body.folder;
        if (body.originalFileName !== undefined) updateData.originalFileName = body.originalFileName;

        // If image is being replaced
        if (body.cloudinaryPublicId && body.cloudinaryPublicId !== mapImage.cloudinaryPublicId) {
            // Delete old image from Cloudinary
            await deleteMapImage(mapImage.cloudinaryPublicId);

            updateData.cloudinaryPublicId = body.cloudinaryPublicId;
            updateData.url = body.url;
            if (body.width) updateData.width = body.width;
            if (body.height) updateData.height = body.height;
            if (body.format) updateData.format = body.format;
            if (body.sizeBytes) updateData.sizeBytes = body.sizeBytes;
        }

        const updatedMapImage = await MapImageModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return NextResponse.json({
            success: true,
            data: updatedMapImage,
            message: "Map image updated successfully",
        });
    } catch (error) {
        console.error("Error updating map image:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to update map image",
            },
            { status: 500 },
        );
    }
}
