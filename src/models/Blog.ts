import mongoose, { Schema, Document, Types } from 'mongoose';

export interface BlogDocument extends Document<Types.ObjectId> {
  slug: string;
  title: string;
  content: string;
  coverImageUrl?: string;
  coverImagePublicId?: string;
  type: 'general' | 'corridor';
  corridorIds?: Types.ObjectId[];
  status: 'DRAFT' | 'PUBLISHED';
  authorId: Types.ObjectId;
  authorName?: string;
  publishedAt?: Date;
  // SEO fields
  keywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  focusKeyphrase?: string;
  canonicalUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<BlogDocument>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    coverImageUrl: {
      type: String,
      required: false,
    },
    coverImagePublicId: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      enum: ['general', 'corridor'],
      required: true,
      default: 'general',
    },
    corridorIds: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'Corridor',
      }],
      default: undefined,
      required: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'DRAFT',
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    authorName: {
      type: String,
      required: false,
    },
    publishedAt: {
      type: Date,
      required: false,
    },
    // SEO fields
    keywords: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 10;
        },
        message: 'Maximum 10 keywords allowed',
      },
    },
    metaTitle: {
      type: String,
      maxlength: 60,
      required: false,
    },
    metaDescription: {
      type: String,
      maxlength: 160,
      required: false,
    },
    focusKeyphrase: {
      type: String,
      maxlength: 100,
      required: false,
    },
    canonicalUrl: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
BlogSchema.index({ status: 1, updatedAt: -1 });
BlogSchema.index({ type: 1 });
BlogSchema.index({ title: 'text' });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Blog;
}

export const BlogModel = mongoose.models.Blog || mongoose.model<BlogDocument>('Blog', BlogSchema);
