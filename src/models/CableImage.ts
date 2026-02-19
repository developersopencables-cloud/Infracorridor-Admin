import mongoose, { Schema, Document, Types } from "mongoose";

export interface CableImageAttrs {
    userId: string;
    cableId: string; // From allcables.json
    cableName: string;
    cloudinaryPublicId: string;
    url: string;
    folder?: string;
    width?: number;
    height?: number;
    format?: string;
    sizeBytes?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CableImageDocument extends CableImageAttrs, Document<Types.ObjectId> {
    _id: Types.ObjectId;
}

const CableImageSchema = new Schema<CableImageDocument>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        cableId: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },
        cableName: {
            type: String,
            required: true,
            trim: true,
        },
        cloudinaryPublicId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        url: {
            type: String,
            required: true,
        },
        folder: {
            type: String,
            required: false,
            index: true,
            default: "cable-images",
        },
    },
    {
        timestamps: true,
    },
);

CableImageSchema.index({ userId: 1, cableId: 1, createdAt: -1 });

// Force refresh model in dev
if (mongoose.models.CableImage) {
    delete mongoose.models.CableImage;
}

export const CableImageModel = mongoose.model<CableImageDocument>("CableImage", CableImageSchema);
