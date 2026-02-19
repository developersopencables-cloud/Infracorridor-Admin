import mongoose, { Schema, Document } from 'mongoose';

export interface CategoryClassificationDocument extends Document {
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CategoryClassificationSchema = new Schema<CategoryClassificationDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

CategoryClassificationSchema.index(
    { name: 1 },
    { unique: true, collation: { locale: 'en', strength: 2 } }
);

CategoryClassificationSchema.index({ name: 'text', description: 'text' });

export const CategoryClassificationModel =
    mongoose.models.CategoryClassification ||
    mongoose.model<CategoryClassificationDocument>('CategoryClassification', CategoryClassificationSchema);
