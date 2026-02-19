import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

import connectMongoose from '@/database/mongoose-connection';
import { checkAdminSession } from '@/database/auth-utils';
import { CorridorModel } from '@/models';
import { sanitizeSearch } from '@/utils/validation';

type CorridorStatus = 'DRAFT' | 'PUBLISHED';

interface CorridorPayload {
  slug: string;
  title: string;
  fromCity?: string;
  toCity?: string;
  distanceKm: number;
  avgLatencyMs: number;
  summary?: string;
  mapImageUrl: string;
  fromCountry?: string;
  toCountry?: string;
  status?: CorridorStatus;
  type: 'city-to-city' | 'country-to-country';
  sponsor?: {
    carrierName?: string;
    companyName?: string;
    logoUrl?: string;
    websiteUrl?: string;
    bannerUrl?: string;
  } | null;
  vendorIds?: string[];
  categoryIds?: string[];
  vendorCategoryPairs?: { vendorId: string; categoryId: string; order: number }[];
  orderedCategories?: { categoryId: string; order: number }[];
  customFields?: { name: string; value: string }[];
  subseaSystems: { cableId: string; name: string; imageUrl?: string }[];
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
}

const normalizeText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
};

// Helper to normalize corridor document for client consumption
const normalizeCorridorDoc = (doc: any) => ({
  ...doc,
  _id: doc._id?.toString?.() ?? String(doc._id),
  vendorIds: (doc.vendorIds || []).map((vid: any) => vid?.toString?.() ?? String(vid)),
  categoryIds: (doc.categoryIds || []).map((cid: any) => cid?.toString?.() ?? String(cid)),
  vendorCategoryPairs: (doc.vendorCategoryPairs || []).map((p: any) => ({
    vendorId: p.vendorId?.toString?.() ?? String(p.vendorId),
    categoryId: p.categoryId?.toString?.() ?? String(p.categoryId),
    order: p.order ?? 0,
  })),
  orderedCategories: (doc.orderedCategories || []).map((oc: any) => ({
    categoryId: oc.categoryId?.toString?.() ?? String(oc.categoryId),
    order: oc.order ?? 0,
  })),
  createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
});

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminCheck = await checkAdminSession(headersList);

    // if (!adminCheck || !adminCheck.isAdmin) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: 'Unauthorized. Admin access required.',
    //     },
    //     { status: 401 },
    //   );
    // }

    await connectMongoose();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status') as CorridorStatus | 'ALL' | null;
    const type = searchParams.get('type') as 'city-to-city' | 'country-to-country' | null;

    const query: Record<string, unknown> = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const sanitizedSearch = sanitizeSearch(search);
    if (sanitizedSearch) {
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { fromCity: { $regex: sanitizedSearch, $options: 'i' } },
        { toCity: { $regex: sanitizedSearch, $options: 'i' } },
        { fromCountry: { $regex: sanitizedSearch, $options: 'i' } },
        { toCountry: { $regex: sanitizedSearch, $options: 'i' } },
        { summary: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const corridors = await CorridorModel.find(query).sort({ updatedAt: -1 }).lean();

    const publishedCount = corridors.filter((c) => c.status === 'PUBLISHED').length;
    const draftCount = corridors.filter((c) => c.status === 'DRAFT').length;

    // Normalize all corridors for client consumption
    const normalizedCorridors = corridors.map(normalizeCorridorDoc);

    return NextResponse.json({
      success: true,
      data: normalizedCorridors,
      count: corridors.length,
      stats: {
        total: corridors.length,
        published: publishedCount,
        draft: draftCount,
      },
    });
  } catch (error) {
    console.error('Error fetching corridors:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch corridors',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminCheck = await checkAdminSession(headersList);

    if (!adminCheck || !adminCheck.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Admin access required.',
        },
        { status: 401 },
      );
    }

    await connectMongoose();

    const body = (await request.json()) as CorridorPayload & {
      _id?: string;
      isPublished?: boolean;
      carrierIds?: string[];
      dataCenterIds?: string[];
      exchangeIds?: string[];
      lastMileProviderIds?: string[];
      vendorCategoryPairs?: { vendorId: string; categoryId: string; order: number }[];
      orderedCategories?: { categoryId: string; order: number }[];
    };
    console.log("POST Corridor Body:", JSON.stringify(body, null, 2));
    // Strip out old fields that shouldn't be sent
    const {
      slug,
      title,
      fromCity,
      toCity,
      distanceKm,
      avgLatencyMs,
      summary,
      mapImageUrl,
      status,
      sponsor,
      type,
      fromCountry,
      toCountry,
      vendorIds = [],
      categoryIds = [],
      vendorCategoryPairs = [],
      orderedCategories = [],
      customFields = [],
      subseaSystems = [],
      metaTitle,
      metaDescription,
      keywords = [],
    } = body;

    const normalizedFromCountry = normalizeText(fromCountry);
    const normalizedToCountry = normalizeText(toCountry);

    if (!slug || !slug.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Slug is required',
        },
        { status: 400 },
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title is required',
        },
        { status: 400 },
      );
    }
    if (!type || !type.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: ' Corridor type is required',
        },
        { status: 400 },
      );
    }

    if (type === 'city-to-city') {
      if (!fromCity || !fromCity.trim() || !toCity || !toCity.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'From and To cities are required for city-to-city corridors',
          },
          { status: 400 },
        );
      }
    } else {
      if (!normalizedFromCountry || !normalizedToCountry) {
        return NextResponse.json(
          {
            success: false,
            error: 'From and To countries are required for country-to-country corridors',
          },
          { status: 400 },
        );
      }
    }

    if (typeof distanceKm !== 'number' || Number.isNaN(distanceKm) || distanceKm <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'distanceKm must be a positive number',
        },
        { status: 400 },
      );
    }

    if (typeof avgLatencyMs !== 'number' || Number.isNaN(avgLatencyMs) || avgLatencyMs <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'avgLatencyMs must be a positive number',
        },
        { status: 400 },
      );
    }

    if (!mapImageUrl || !mapImageUrl.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Map image URL is required',
        },
        { status: 400 },
      );
    }

    // Enforce unique slug for retry-safe POST
    const existingBySlug = await CorridorModel.findOne({ slug: slug.trim() }).lean();
    if (existingBySlug) {
      return NextResponse.json(
        {
          success: false,
          error: `Corridor with slug "${slug.trim()}" already exists`,
        },
        { status: 409 },
      );
    }

    const safeVendorIds = Array.isArray(vendorIds) ? vendorIds : [];
    const safeCategoryIds = Array.isArray(categoryIds) ? categoryIds : [];

    const invalidVendorId = safeVendorIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidVendorId) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid vendorId: ${invalidVendorId}`,
        },
        { status: 400 },
      );
    }

    const invalidCategoryId = safeCategoryIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidCategoryId) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid categoryId: ${invalidCategoryId}`,
        },
        { status: 400 },
      );
    }

    const isCityToCity = type === 'city-to-city';

    const safeVendorCategoryPairs = Array.isArray(vendorCategoryPairs) ? vendorCategoryPairs : [];
    const invalidPair = safeVendorCategoryPairs.find(
      (p) => !mongoose.Types.ObjectId.isValid(p.vendorId) || !mongoose.Types.ObjectId.isValid(p.categoryId)
    );

    if (invalidPair) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid pair detected: vendorId ${invalidPair.vendorId}, categoryId ${invalidPair.categoryId}`,
        },
        { status: 400 },
      );
    }

    // Validate orderedCategories
    const safeOrderedCategories = Array.isArray(orderedCategories) ? orderedCategories : [];
    const invalidOrderedCategory = safeOrderedCategories.find(
      (oc) => !mongoose.Types.ObjectId.isValid(oc.categoryId) || typeof oc.order !== 'number'
    );

    if (invalidOrderedCategory) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid orderedCategory detected: categoryId ${invalidOrderedCategory.categoryId}, order ${invalidOrderedCategory.order}`,
        },
        { status: 400 },
      );
    }

    // Additional validation for country-to-country
    if (!isCityToCity) {
      if (!normalizedFromCountry || !normalizedToCountry) {
        return NextResponse.json(
          {
            success: false,
            error: "From and To countries are required for country-to-country corridors",
          },
          { status: 400 }
        );
      }
    }

    if (!Array.isArray(customFields)) {
      return NextResponse.json(
        {
          success: false,
          error: "customFields must be an array",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(subseaSystems)) {
      return NextResponse.json(
        {
          success: false,
          error: "subseaSystems must be an array",
        },
        { status: 400 }
      );
    }

    const corridor = await CorridorModel.create({
      _id: new mongoose.Types.ObjectId(),
      slug: slug.trim(),
      title: title.trim(),
      fromCity: isCityToCity ? fromCity?.trim() : undefined,
      toCity: isCityToCity ? toCity?.trim() : undefined,
      fromCountry: normalizedFromCountry,
      toCountry: normalizedToCountry,
      distanceKm,
      avgLatencyMs,
      type,
      summary: summary?.trim() || '',
      mapImageUrl: mapImageUrl.trim(),
      status: status ?? 'DRAFT',
      sponsor: sponsor ?? undefined,
      vendorIds: safeVendorIds,
      categoryIds: safeCategoryIds,
      vendorCategoryPairs: safeVendorCategoryPairs,
      orderedCategories: safeOrderedCategories,
      customFields,
      subseaSystems,
      metaTitle: metaTitle?.trim(),
      metaDescription: metaDescription?.trim(),
      keywords: Array.isArray(keywords) ? keywords.filter(k => k?.trim()).map(k => k.trim()) : [],
    });

    const data = normalizeCorridorDoc(corridor.toObject());

    return NextResponse.json(
      {
        success: true,
        data,
        message: 'Corridor created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating corridor:', error);

    if (error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Corridor with this slug already exists',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create corridor',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminCheck = await checkAdminSession(headersList);

    if (!adminCheck || !adminCheck.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Admin access required.',
        },
        { status: 401 },
      );
    }

    await connectMongoose();

    const body = (await request.json()) as CorridorPayload & {
      _id?: string;
      isPublished?: boolean;
      carrierIds?: string[];
      dataCenterIds?: string[];
      exchangeIds?: string[];
      lastMileProviderIds?: string[];
      vendorCategoryPairs?: { vendorId: string; categoryId: string; order: number }[];
      orderedCategories?: { categoryId: string; order: number }[];
    };

    const {
      _id,
      slug,
      title,
      fromCity,
      type,
      toCity,
      distanceKm,
      avgLatencyMs,
      summary,
      mapImageUrl,
      status,
      sponsor,
      fromCountry,
      toCountry,
      vendorIds,
      categoryIds,
      vendorCategoryPairs,
      orderedCategories,
      customFields,
      subseaSystems,
      metaTitle,
      metaDescription,
      keywords,
    } = body;

    if (!_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Corridor ID (_id) is required',
        },
        { status: 400 },
      );
    }

    const existing = await CorridorModel.findById(_id);
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Corridor not found',
        },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (slug !== undefined) updateData.slug = slug.trim();
    if (title !== undefined) updateData.title = title.trim();
    if (type !== undefined) updateData.type = type;
    if (distanceKm !== undefined) updateData.distanceKm = distanceKm;
    if (avgLatencyMs !== undefined) updateData.avgLatencyMs = avgLatencyMs;
    if (summary !== undefined) updateData.summary = summary?.trim() || '';
    if (mapImageUrl !== undefined) updateData.mapImageUrl = mapImageUrl.trim();
    if (fromCity !== undefined) updateData.fromCity = fromCity?.trim();
    if (toCity !== undefined) updateData.toCity = toCity?.trim();
    if (fromCountry !== undefined) updateData.fromCountry = normalizeText(fromCountry);
    if (toCountry !== undefined) updateData.toCountry = normalizeText(toCountry);
    if (status !== undefined) updateData.status = status;
    if (sponsor !== undefined) updateData.sponsor = sponsor ?? undefined;

    if (vendorIds !== undefined) {
      const safeVendorIds = Array.isArray(vendorIds) ? vendorIds : [];
      const invalidVendorId = safeVendorIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalidVendorId) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid vendorId: ${invalidVendorId}`,
          },
          { status: 400 },
        );
      }
      updateData.vendorIds = safeVendorIds;
    }

    if (categoryIds !== undefined) {
      const safeCategoryIds = Array.isArray(categoryIds) ? categoryIds : [];
      const invalidCategoryId = safeCategoryIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalidCategoryId) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid categoryId: ${invalidCategoryId}`,
          },
          { status: 400 },
        );
      }
      updateData.categoryIds = safeCategoryIds;
    }

    if (vendorCategoryPairs !== undefined) {
      const safePairs = Array.isArray(vendorCategoryPairs) ? vendorCategoryPairs : [];
      const invalidPair = safePairs.find(
        (p) => !mongoose.Types.ObjectId.isValid(p.vendorId) || !mongoose.Types.ObjectId.isValid(p.categoryId)
      );
      if (invalidPair) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid pair detected: vendorId ${invalidPair.vendorId}, categoryId ${invalidPair.categoryId}`,
          },
          { status: 400 },
        );
      }
      updateData.vendorCategoryPairs = safePairs;


      updateData.vendorIds = [...new Set(safePairs.map(p => p.vendorId.toString()))].map(id => new mongoose.Types.ObjectId(id));
      updateData.categoryIds = [...new Set(safePairs.map(p => p.categoryId.toString()))].map(id => new mongoose.Types.ObjectId(id));
    }

    if (orderedCategories !== undefined) {
      const safeOrderedCategories = Array.isArray(orderedCategories) ? orderedCategories : [];
      const invalidOrderedCategory = safeOrderedCategories.find(
        (oc) => !mongoose.Types.ObjectId.isValid(oc.categoryId) || typeof oc.order !== 'number'
      );
      if (invalidOrderedCategory) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid orderedCategory detected: categoryId ${invalidOrderedCategory.categoryId}, order ${invalidOrderedCategory.order}`,
          },
          { status: 400 },
        );
      }
      updateData.orderedCategories = safeOrderedCategories;
    }

    if (customFields !== undefined) {
      if (!Array.isArray(customFields)) {
        return NextResponse.json(
          {
            success: false,
            error: "customFields must be an array",
          },
          { status: 400 }
        );
      }
      updateData.customFields = customFields;
    }

    if (subseaSystems !== undefined) {
      if (!Array.isArray(subseaSystems)) {
        return NextResponse.json(
          {
            success: false,
            error: "subseaSystems must be an array",
          },
          { status: 400 }
        );
      }
      updateData.subseaSystems = subseaSystems;
    }

    if (metaTitle !== undefined) updateData.metaTitle = metaTitle?.trim();
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription?.trim();
    if (keywords !== undefined) {
      updateData.keywords = Array.isArray(keywords) ? keywords.filter(k => k?.trim()).map(k => k.trim()) : [];
    }

    // Type-based cleanup: ensure only relevant fields are set or cleared
    const effectiveType = (type ?? existing.type) as 'city-to-city' | 'country-to-country';
    if (effectiveType === 'city-to-city') {
      // For city-to-city, we keep countries but they are not the primary route identifier
    } else if (effectiveType === 'country-to-country') {

      const updated = await CorridorModel.findByIdAndUpdate(_id, {
        $unset: {
          fromCity: 1,
          toCity: 1,
        },
        ...updateData,
      }, {
        new: true,
        runValidators: true,
      }).lean();

      return NextResponse.json({
        success: true,
        data: updated ? normalizeCorridorDoc(updated) : null,
        message: 'Corridor updated successfully',
      });
    }

    const updated = await CorridorModel.findByIdAndUpdate(_id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update corridor',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: normalizeCorridorDoc(updated),
      message: 'Corridor updated successfully',
    });
  } catch (error) {
    console.error('Error updating corridor:', error);

    if (error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Corridor with this slug already exists',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update corridor',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminCheck = await checkAdminSession(headersList);

    if (!adminCheck || !adminCheck.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Admin access required.',
        },
        { status: 401 },
      );
    }

    await connectMongoose();

    const { searchParams } = new URL(request.url);
    const _id = searchParams.get('_id');

    if (!_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Corridor ID (_id) is required',
        },
        { status: 400 },
      );
    }

    const existing = await CorridorModel.findById(_id);
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Corridor not found',
        },
        { status: 404 },
      );
    }

    await CorridorModel.findByIdAndDelete(_id);

    return NextResponse.json({
      success: true,
      message: 'Corridor deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting corridor:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete corridor',
      },
      { status: 500 },
    );
  }
}


