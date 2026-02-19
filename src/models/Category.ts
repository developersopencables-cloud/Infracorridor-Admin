import mongoose, { Schema, Document } from 'mongoose';

export interface CategoryDocument extends Document {
    title: string;
    description: string;
    classificationIds?: mongoose.Types.ObjectId[] | null;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new Schema<CategoryDocument>(
    {
        title: {
            type: String,
            required: true,
            trim: true,

        },
        description: {
            type: String,
            default: '',
            trim: true,

        },
        classificationIds: [{
            type: Schema.Types.ObjectId,
            ref: 'CategoryClassification',
            default: [],
        }],
    },
    {
        timestamps: true,
    }
);

CategorySchema.index(
    { title: 1 },
    { unique: true, collation: { locale: 'en', strength: 2 } }
);

CategorySchema.index({ title: 'text', description: 'text' });

if (process.env.NODE_ENV === 'development') {
    delete mongoose.models.Category;
}

export const CategoryModel =
    mongoose.models.Category ||
    mongoose.model<CategoryDocument>('Category', CategorySchema);
