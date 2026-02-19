import mongoose, { Schema, Document, Types } from 'mongoose';

export interface VendorDocument extends Document {
  name: string;
  description: string;
  logoUrl: string;
  website?: string;
  categoryIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<VendorDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    logoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    categoryIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Category',
      required: true,
      validate: {
        validator: function (v: Types.ObjectId[]) {
          return v && v.length > 0;
        },
        message: 'At least one category is required'
      },
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

VendorSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

VendorSchema.index({ name: 'text', description: 'text' });

export const VendorModel =
  mongoose.models.Vendor ||
  mongoose.model<VendorDocument>('Vendor', VendorSchema);
