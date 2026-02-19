import mongoose, { Schema, Document, Types } from "mongoose";

export interface MapImageAttrs {
    userId: string;
    corridorId?: Types.ObjectId;
    corridorName?: string;
    cloudinaryPublicId: string;
    url: string;
    originalFileName: string;
    folder?: string;
    width?: number;
    height?: number;
    format?: string;
    sizeBytes?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface MapImageDocument extends MapImageAttrs, Document<Types.ObjectId> {
    _id: Types.ObjectId;
}

const MapImageSchema = new Schema<MapImageDocument>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        corridorId: {
            type: Schema.Types.ObjectId,
            required: false,
            index: true,
            ref: "Corridor",
        },
        corridorName: {
            type: String,
            required: false,
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
        originalFileName: {
            type: String,
            required: true,
        },
        folder: {
            type: String,
            required: false,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

MapImageSchema.index({ userId: 1, corridorId: 1, createdAt: -1 });
MapImageSchema.index({ userId: 1, folder: 1, createdAt: -1 });

export const MapImageModel =
    mongoose.models.MapImage || mongoose.model<MapImageDocument>("MapImage", MapImageSchema);


