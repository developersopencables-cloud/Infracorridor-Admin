import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import connectMongoose from "@/database/mongoose-connection";
import { checkAdminSession } from "@/database/auth-utils";
import { CableImageModel } from "@/models";
import { deleteMapImage } from "@/lib/cloudinary"; // reusing the generic delete function

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
        const { cableId, cableName, cloudinaryPublicId, url, width, height, format, sizeBytes } = body;

        const cableImage = await CableImageModel.findById(id);
        if (!cableImage) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cable image not found",
                },
                { status: 404 },
            );
        }

        if (cableImage.userId !== adminCheck.user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Forbidden.",
                },
                { status: 403 },
            );
        }

        // If a new image is being uploaded, delete the old one from Cloudinary
        if (cloudinaryPublicId && cloudinaryPublicId !== cableImage.cloudinaryPublicId) {
            await deleteMapImage(cableImage.cloudinaryPublicId);
        }

        const updatedImage = await CableImageModel.findByIdAndUpdate(
            id,
            {
                cableId,
                cableName,
                cloudinaryPublicId,
                url,
                width,
                height,
                format,
                sizeBytes,
            },
            { new: true }
        );

        return NextResponse.json({
            success: true,
            data: updatedImage,
        });
    } catch (error) {
        console.error("Error updating cable image:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to update cable image",
            },
            { status: 500 },
        );
    }
}

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

        const cableImage = await CableImageModel.findById(id);
        if (!cableImage) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cable image not found",
                },
                { status: 404 },
            );
        }

        if (cableImage.userId !== adminCheck.user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Forbidden.",
                },
                { status: 403 },
            );
        }

        await deleteMapImage(cableImage.cloudinaryPublicId);
        await CableImageModel.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: "Cable image deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting cable image:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete cable image",
            },
            { status: 500 },
        );
    }
}
