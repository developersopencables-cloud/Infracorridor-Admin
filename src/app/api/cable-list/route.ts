import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkAdminSession } from "@/database/auth-utils";
import { S3Service } from "@/lib/Cable-data-Sync/s3-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const headersList = await headers();
        const sessionCheck = await checkAdminSession(headersList);

        if (!sessionCheck || !sessionCheck.user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const s3Service = new S3Service();
        const data = await s3Service.getFile("allcables.json");

        if (!data) {
            return NextResponse.json(
                { success: false, error: "Failed to fetch cable list from S3" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: data,
        });
    } catch (error) {
        console.error("Error fetching cable list:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
