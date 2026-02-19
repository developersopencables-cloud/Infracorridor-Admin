import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary environment variables are not configured properly");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export function generateUploadSignature(params: Record<string, string | number>): {
    timestamp: number;
    signature: string;
} {
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = {
        ...params,
        timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(toSign, process.env.CLOUDINARY_API_SECRET as string);

    return { timestamp, signature };
}

export async function deleteMapImage(publicId: string) {
    return cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
    });
}

export async function deleteCloudinaryImage(publicId: string) {
    return cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
    });
}



