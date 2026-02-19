import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { generateUploadSignature } from "@/lib/cloudinary";
import { checkAdminSession } from "@/database/auth-utils";

type UploadType = "map-image" | "vendor-logo" | "sponsor-logo" | "banner" | "generic" | "cable-image" | "blog-cover";

interface CloudinarySignatureRequest {
    type?: UploadType;
    corridorName?: string;
    folder?: string;
}

function getBaseFolder(type: UploadType): string {
    switch (type) {
        case "map-image":
            return "map-images";
        case "cable-image":
            return "cable-images";
        case "blog-cover":
            return "blog-covers";
        case "vendor-logo":
            return "other-images/vendor-logos";
        case "sponsor-logo":
            return "other-images/sponsor-logos";
        case "banner":
            return "other-images/banners";
        default:
            return "other-images/misc";
    }
}

export async function POST(request: NextRequest) {
    try {
        const headersList = await headers();
        const sessionCheck = await checkAdminSession(headersList);

        if (!sessionCheck || !sessionCheck.user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized.",
                },
                { status: 401 },
            );
        }

        const body = (await request.json()) as CloudinarySignatureRequest;

        const uploadType: UploadType = body.type ?? "map-image";
        const { corridorName } = body;
        const folderInput = body.folder;

        const safeFolderBase = getBaseFolder(uploadType);

        const userFolderSegment = folderInput
            ? folderInput
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9-_]/g, "-")
            : undefined;

        const folder = userFolderSegment ? `${safeFolderBase}/${userFolderSegment}` : safeFolderBase;

        let baseName: string;

        if (uploadType === "map-image") {
            baseName = corridorName
                ? corridorName
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9-_]/g, "-") || "map-image"
                : "map-image";
        } else {
            const typeLabel =
                uploadType === "vendor-logo"
                    ? "vendor-logo"
                    : uploadType === "sponsor-logo"
                        ? "sponsor-logo"
                        : uploadType === "banner"
                            ? "banner"
                            : "image";

            baseName = typeLabel;
        }

        const publicId = `${baseName}-${Date.now()}`;

        const paramsToSign = {
            folder,
            public_id: publicId,
        };

        const { timestamp, signature } = generateUploadSignature(paramsToSign);

        return NextResponse.json({
            success: true,
            data: {
                cloudName: process.env.CLOUDINARY_CLOUD_NAME,
                apiKey: process.env.CLOUDINARY_API_KEY,
                folder,
                publicId,
                timestamp,
                signature,
                type: uploadType,
            },
        });
    } catch (error) {
        console.error("Error generating Cloudinary upload signature:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to generate upload signature",
            },
            { status: 500 },
        );
    }
}

