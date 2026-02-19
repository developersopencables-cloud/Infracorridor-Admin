import mongoose, { Schema, Document, Types } from 'mongoose';
import { CorridorSponsor, SubseaSystem } from '@/types/corridor';

export interface VendorCategoryPair {
  vendorId: Types.ObjectId;
  categoryId: Types.ObjectId;
  order: number;
}

export interface OrderedCategory {
  categoryId: Types.ObjectId;
  order: number;
}

export interface CustomField {
  name: string;
  value: string;
}

export interface CorridorDocument extends Document<Types.ObjectId> {
  slug: string;
  title: string;
  fromCity?: string;
  toCity?: string;
  fromCountry?: string;
  toCountry?: string;
  fromCounty?: string;
  toCounty?: string;
  distanceKm: number;
  avgLatencyMs: number;
  summary: string;
  mapImageUrl: string;
  status: 'DRAFT' | 'PUBLISHED';
  type: 'city-to-city' | 'country-to-country';
  vendorIds: Types.ObjectId[];
  categoryIds: Types.ObjectId[];
  vendorCategoryPairs: VendorCategoryPair[];
  orderedCategories: OrderedCategory[];
  sponsor?: CorridorSponsor;
  customFields?: CustomField[];
  subseaSystems: SubseaSystem[];
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SponsorSchema = new Schema<CorridorSponsor>({
  carrierName: {
    type: String,
    required: false,
  },
  companyName: {
    type: String,
    required: false,
  },
  logoUrl: {
    type: String,
    required: false,
  },
  websiteUrl: {
    type: String,
    required: false,
  },
  bannerUrl: {
    type: String,
    required: false,
  },
}, { _id: false });

const CorridorSchema = new Schema<CorridorDocument>(
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
    fromCity: {
      type: String,
      required: false,
      index: true,
    },
    toCity: {
      type: String,
      required: false,
      index: true,
    },
    fromCountry: {
      type: String,
      required: false,
      index: true,
    },
    toCountry: {
      type: String,
      required: false,
      index: true,
    },
    fromCounty: {
      type: String,
      required: false,
      index: true,
    },
    toCounty: {
      type: String,
      required: false,
      index: true,
    },
    distanceKm: {
      type: Number,
      required: true,
    },
    avgLatencyMs: {
      type: Number,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    mapImageUrl: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'DRAFT',
      index: true,
    },

    type: {
      type: String,
      enum: ['city-to-city', 'country-to-country'],
      required: true,
      default: 'city-to-city',
    },
    vendorIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Vendor',
      required: false,
      default: [],
    },
    categoryIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Category',
      required: false,
      default: [],
    },
    vendorCategoryPairs: {
      type: [{
        vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
        order: { type: Number, required: true, default: 0 },
        _id: false
      }],
      required: false,
      default: [],
    },
    orderedCategories: {
      type: [{
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
        order: { type: Number, required: true, default: 0 },
        _id: false
      }],
      required: false,
      default: [],
    },
    sponsor: {
      type: SponsorSchema,
      required: false,
    },
    customFields: {
      type: [{
        name: { type: String, required: true },
        value: { type: String, required: true },
        _id: false
      }],
      required: false,
      default: [],
    },
    subseaSystems: {
      type: [{
        cableId: { type: String, required: true },
        name: { type: String, required: true },
        imageUrl: { type: String, required: false },
        _id: false
      }],
      required: true,
      default: [],
    },
    metaTitle: {
      type: String,
      required: false,
    },
    metaDescription: {
      type: String,
      required: false,
    },
    keywords: {
      type: [String],
      required: false,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);


const syncArrays = function (this: any) {
  if (this.vendorCategoryPairs) {
    const vIds = [...new Set(this.vendorCategoryPairs.map((p: any) => p.vendorId?.toString()))].filter(Boolean) as string[];
    this.vendorIds = vIds.map((id) => new mongoose.Types.ObjectId(id));
  }

  // Sync categoryIds from orderedCategories (sorted by order)
  if (this.orderedCategories && this.orderedCategories.length > 0) {
    const sortedCategories = [...this.orderedCategories].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    const cIds = sortedCategories.map((c: any) => c.categoryId?.toString()).filter(Boolean) as string[];
    this.categoryIds = cIds.map((id) => new mongoose.Types.ObjectId(id));
  } else if (this.vendorCategoryPairs) {
    // Fallback to vendorCategoryPairs if no orderedCategories
    const cIds = [...new Set(this.vendorCategoryPairs.map((p: any) => p.categoryId?.toString()))].filter(Boolean) as string[];
    this.categoryIds = cIds.map((id) => new mongoose.Types.ObjectId(id));
  }
};

CorridorSchema.pre('save', function () {
  syncArrays.call(this);
});

CorridorSchema.index({ fromCity: 1, toCity: 1 });
CorridorSchema.index({ status: 1, updatedAt: -1 });


if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Corridor;
}

export const CorridorModel = mongoose.models.Corridor || mongoose.model<CorridorDocument>('Corridor', CorridorSchema);


