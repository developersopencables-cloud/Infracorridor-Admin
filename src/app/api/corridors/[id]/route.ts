import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

import connectMongoose from '@/database/mongoose-connection';
import { checkAdminSession } from '@/database/auth-utils';
import { CorridorModel, CategoryModel, VendorModel } from '@/models';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
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

    const { id } = await params;

    const corridor = await CorridorModel.findById(id).lean();
    if (!corridor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Corridor not found',
        },
        { status: 404 },
      );
    }

    const vendorIds = (corridor.vendorIds || []).map((vendorId: unknown) => vendorId?.toString?.() ?? String(vendorId));
    const categoryIds = (corridor.categoryIds || []).map((categoryId: unknown) => categoryId?.toString?.() ?? String(categoryId));

    const [vendorDocs, categoryDocsInitial] = await Promise.all([
      vendorIds.length
        ? VendorModel.find({ _id: { $in: vendorIds } }).lean()
        : Promise.resolve([]),
      categoryIds.length
        ? CategoryModel.find({ _id: { $in: categoryIds } }).lean()
        : Promise.resolve([]),
    ]);

    const vendorCategoryIds = vendorDocs
      .flatMap((vendor: any) => vendor.categoryIds || [])
      .filter(Boolean)
      .map((categoryId: any) => categoryId?.toString?.() ?? String(categoryId));

    const existingCategoryIdSet = new Set(categoryIds);
    const additionalCategoryIds = vendorCategoryIds.filter(
      (categoryId) => categoryId && !existingCategoryIdSet.has(categoryId),
    );

    const additionalCategoryDocs = additionalCategoryIds.length
      ? await CategoryModel.find({ _id: { $in: additionalCategoryIds } }).lean()
      : [];

    const categoryDocs = [...categoryDocsInitial, ...additionalCategoryDocs];

    const normalizeDoc = <T extends { _id: unknown; createdAt?: unknown; updatedAt?: unknown }>(doc: T) => ({
      ...doc,
      _id: doc._id?.toString?.() ?? String(doc._id),
      createdAt:
        doc.createdAt && doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : doc.createdAt ?? null,
      updatedAt:
        doc.updatedAt && doc.updatedAt instanceof Date
          ? doc.updatedAt.toISOString()
          : doc.updatedAt ?? null,
    });

    const corridorData = normalizeDoc({
      ...corridor,
      vendorIds,
      categoryIds,
      vendorCategoryPairs: (corridor.vendorCategoryPairs || []).map((p: any) => ({
        vendorId: p.vendorId?.toString?.() ?? String(p.vendorId),
        categoryId: p.categoryId?.toString?.() ?? String(p.categoryId),
        order: p.order ?? 0,
      })),
      orderedCategories: (corridor.orderedCategories || []).map((oc: any) => ({
        categoryId: oc.categoryId?.toString?.() ?? String(oc.categoryId),
        order: oc.order ?? 0,
      })),
    });

    const normalizeId = (value: unknown) => {
      if (!value) return undefined;
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && 'toString' in value) {
        try {
          return (value as { toString: () => string }).toString();
        } catch (error) {
          console.warn('Failed to convert value to string:', value, error);
          return undefined;
        }
      }
      return String(value);
    };

    const vendorDetails = vendorDocs.map((doc: any) => {
      const normalized = normalizeDoc(doc) as Record<string, unknown>;
      return {
        ...normalized,
        categoryIds: (doc.categoryIds || []).map(normalizeId).filter(Boolean),
      };
    });
    const categoryDetails = categoryDocs.map(normalizeDoc);

    return NextResponse.json({
      success: true,
      data: {
        corridor: corridorData,
        relations: {
          vendors: vendorIds.map((vendorId: string) => ({
            corridorId: corridorData._id,
            vendorId,
          })),
          categories: categoryIds.map((categoryId: string) => ({
            corridorId: corridorData._id,
            categoryId,
          })),
          vendorCategoryPairs: corridorData.vendorCategoryPairs,
          orderedCategories: corridorData.orderedCategories,
        },
        details: {
          vendors: vendorDetails,
          categories: categoryDetails,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching corridor details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch corridor details',
      },
      { status: 500 },
    );
  }
}

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

export async function PUT(request: NextRequest, { params }: Params) {
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

    const { id } = await params;

    const body = (await request.json()) as Partial<CorridorPayload> & {
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

    const existing = await CorridorModel.findById(id);
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
      const invalidVendorId = safeVendorIds.find((vid) => !mongoose.Types.ObjectId.isValid(vid));
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
      const invalidCategoryId = safeCategoryIds.find((cid) => !mongoose.Types.ObjectId.isValid(cid));
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
            error: 'customFields must be an array',
          },
          { status: 400 },
        );
      }
      updateData.customFields = customFields;
    }

    if (subseaSystems !== undefined) {
      if (!Array.isArray(subseaSystems)) {
        return NextResponse.json(
          {
            success: false,
            error: 'subseaSystems must be an array',
          },
          { status: 400 },
        );
      }
      updateData.subseaSystems = subseaSystems;
    }

    if (metaTitle !== undefined) updateData.metaTitle = metaTitle?.trim();
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription?.trim();
    if (keywords !== undefined) {
      updateData.keywords = Array.isArray(keywords) ? keywords.filter(k => k?.trim()).map(k => k.trim()) : [];
    }

    const effectiveType = (type ?? existing.type) as 'city-to-city' | 'country-to-country';
    if (effectiveType === 'country-to-country') {
      updateData.fromCity = undefined;
      updateData.toCity = undefined;
    }

    const updated = await CorridorModel.findByIdAndUpdate(id, updateData, {
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

    // Normalize ObjectIds to strings for client consumption
    const normalizedUpdated = {
      ...updated,
      _id: updated._id?.toString?.() ?? String(updated._id),
      vendorIds: (updated.vendorIds || []).map((vid: any) => vid?.toString?.() ?? String(vid)),
      categoryIds: (updated.categoryIds || []).map((cid: any) => cid?.toString?.() ?? String(cid)),
      vendorCategoryPairs: (updated.vendorCategoryPairs || []).map((p: any) => ({
        vendorId: p.vendorId?.toString?.() ?? String(p.vendorId),
        categoryId: p.categoryId?.toString?.() ?? String(p.categoryId),
        order: p.order ?? 0,
      })),
      orderedCategories: (updated.orderedCategories || []).map((oc: any) => ({
        categoryId: oc.categoryId?.toString?.() ?? String(oc.categoryId),
        order: oc.order ?? 0,
      })),
      createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
      updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : updated.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: normalizedUpdated,
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
