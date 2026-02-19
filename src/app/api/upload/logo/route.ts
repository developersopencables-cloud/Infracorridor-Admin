import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { checkAdminSession } from "@/database/auth-utils";
import { headers } from "next/headers";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export async function POST(request: NextRequest) {
    try {
        const headersList = await headers();
        const adminCheck = await checkAdminSession(headersList);

        if (!adminCheck || !adminCheck.isAdmin) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized. Admin access required.",
                },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                {
                    success: false,
                    error: "No file provided",
                },
                { status: 400 }
            );
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(", ")}`,
                },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    success: false,
                    error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
                },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const fileExtension = file.name.split(".").pop() || "png";
        const fileName = `${randomUUID()}.${fileExtension}`;
        const uploadDir = join(process.cwd(), "public", "uploads", "logos");

        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, buffer);

        const fileUrl = `/uploads/logos/${fileName}`;

        return NextResponse.json({
            success: true,
            data: {
                url: fileUrl,
                fileName: fileName,
                size: file.size,
                type: file.type,
            },
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to upload file",
            },
            { status: 500 }
        );
    }
}

