import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

// Mock dependencies before importing route handlers
vi.mock('@/database/auth-utils', () => ({
  checkAdminSession: vi.fn(),
}));

vi.mock('@/database/mongoose-connection', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models', () => ({
  CorridorModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Import after mocking
import { GET, POST, PUT, DELETE } from './route';
import { checkAdminSession } from '@/database/auth-utils';
import { CorridorModel } from '@/models';

// Helper to create mock request
const createMockRequest = (options: {
  method: string;
  url?: string;
  body?: unknown;
}): NextRequest => {
  const url = options.url || 'http://localhost:3000/api/corridors';
  const request = new NextRequest(url, {
    method: options.method,
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  return request;
};

// Helper mock auth
const mockAdminAuth = () => {
  vi.mocked(checkAdminSession).mockResolvedValue({
    isAdmin: true,
    user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
    session: null,
  } as ReturnType<typeof checkAdminSession> extends Promise<infer T> ? T : never);
};

const mockUnauthenticated = () => {
  vi.mocked(checkAdminSession).mockResolvedValue(null);
};

describe('/api/corridors route unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // GET /api/corridors - Unit Tests
  // ============================================
  describe('GET', () => {
    describe('authentication', () => {
      it('returns 401 when user is not authenticated', async () => {
        mockUnauthenticated();

        const request = createMockRequest({ method: 'GET' });
        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/unauthorized/i);
      });

      it('returns 401 when user is not admin', async () => {
        vi.mocked(checkAdminSession).mockResolvedValue({
          isAdmin: false,
          user: { id: 'user-1', email: 'user@test.com', role: 'user' },
          session: null,
        } as ReturnType<typeof checkAdminSession> extends Promise<infer T> ? T : never);

        const request = createMockRequest({ method: 'GET' });
        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.success).toBe(false);
      });
    });

    describe('query building', () => {
      beforeEach(() => {
        mockAdminAuth();
        vi.mocked(CorridorModel.find).mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        } as unknown as ReturnType<typeof CorridorModel.find>);
      });

      it('returns empty array when no corridors exist', async () => {
        const request = createMockRequest({ method: 'GET' });
        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data).toEqual([]);
        expect(json.count).toBe(0);
        expect(json.stats).toEqual({ total: 0, published: 0, draft: 0 });
      });

      it('filters by status when provided', async () => {
        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/corridors?status=PUBLISHED',
        });

        await GET(request);

        expect(CorridorModel.find).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'PUBLISHED' })
        );
      });

      it('filters by type when provided', async () => {
        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/corridors?type=city-to-city',
        });

        await GET(request);

        expect(CorridorModel.find).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'city-to-city' })
        );
      });

      it('does not filter by status when status=ALL', async () => {
        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/corridors?status=ALL',
        });

        await GET(request);

        expect(CorridorModel.find).toHaveBeenCalledWith(
          expect.not.objectContaining({ status: expect.anything() })
        );
      });

      it('builds search query with $or for multiple fields', async () => {
        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/corridors?search=york',
        });

        await GET(request);

        expect(CorridorModel.find).toHaveBeenCalledWith(
          expect.objectContaining({
            $or: expect.arrayContaining([
              expect.objectContaining({ title: expect.any(Object) }),
              expect.objectContaining({ fromCity: expect.any(Object) }),
              expect.objectContaining({ toCity: expect.any(Object) }),
            ]),
          })
        );
      });
    });

    describe('stats calculation', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('calculates correct stats for mixed status corridors', async () => {
        const mockCorridors = [
          { _id: '1', status: 'DRAFT' },
          { _id: '2', status: 'PUBLISHED' },
          { _id: '3', status: 'PUBLISHED' },
          { _id: '4', status: 'DRAFT' },
        ];

        vi.mocked(CorridorModel.find).mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockCorridors),
          }),
        } as unknown as ReturnType<typeof CorridorModel.find>);

        const request = createMockRequest({ method: 'GET' });
        const response = await GET(request);
        const json = await response.json();

        expect(json.stats).toEqual({
          total: 4,
          published: 2,
          draft: 2,
        });
        expect(json.count).toBe(4);
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('returns 500 when database query fails', async () => {
        vi.mocked(CorridorModel.find).mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockRejectedValue(new Error('Database connection failed')),
          }),
        } as unknown as ReturnType<typeof CorridorModel.find>);

        const request = createMockRequest({ method: 'GET' });
        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.success).toBe(false);
        expect(json.error).toBe('Database connection failed');
      });
    });
  });

  // ============================================
  // POST /api/corridors - Unit Tests
  // ============================================
  describe('POST', () => {
    const validCorridorData = {
      slug: 'new-york-london',
      title: 'New York to London',
      type: 'city-to-city',
      fromCity: 'New York',
      toCity: 'London',
      fromCountry: 'United States',
      toCountry: 'United Kingdom',
      distanceKm: 5500,
      avgLatencyMs: 75,
      mapImageUrl: 'https://example.com/map.png',
      customFields: [] as { name: string; value: string }[],
      subseaSystems: [] as { cableId: string; name: string; imageUrl?: string }[],
      status: 'DRAFT' as const,
    };

    describe('authentication', () => {
      it('returns 401 when user is not authenticated', async () => {
        mockUnauthenticated();

        const request = createMockRequest({
          method: 'POST',
          body: validCorridorData,
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.success).toBe(false);
      });
    });

    describe('validation - required fields', () => {
      beforeEach(() => {
        mockAdminAuth();
        vi.mocked(CorridorModel.findOne).mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        } as unknown as ReturnType<typeof CorridorModel.findOne>);
      });

      it('returns 400 when slug is missing', async () => {
        const { slug: _slug, ...dataWithoutSlug } = validCorridorData;

        const request = createMockRequest({
          method: 'POST',
          body: dataWithoutSlug,
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/slug is required/i);
      });

      it('returns 400 when slug is empty string', async () => {
        const request = createMockRequest({
          method: 'POST',
          body: { ...validCorridorData, slug: '   ' },
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/slug is required/i);
      });

      it('returns 400 when title is missing', async () => {
        const { title: _title, ...dataWithoutTitle } = validCorridorData;

        const request = createMockRequest({
          method: 'POST',
          body: dataWithoutTitle,
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/title is required/i);
      });

      it('returns 400 when type is missing', async () => {
        const { type: _type, ...dataWithoutType } = validCorridorData;

        const request = createMockRequest({
          method: 'POST',
          body: dataWithoutType,
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/type is required/i);
      });

      it('returns 400 when mapImageUrl is missing', async () => {
        const { mapImageUrl: _mapImageUrl, ...dataWithoutMap } = validCorridorData;

        const request = createMockRequest({
          method: 'POST',
          body: dataWithoutMap,
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/map image url is required/i);
      });
    });

    describe('validation - type-specific fields', () => {
      beforeEach(() => {
        mockAdminAuth();
        vi.mocked(CorridorModel.findOne).mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        } as unknown as ReturnType<typeof CorridorModel.findOne>);
      });

      it('returns 400 when city-to-city type is missing cities', async () => {
        const { fromCity: _fromCity, toCity: _toCity, ...dataWithoutCities } = validCorridorData;

        const request = createMockRequest({
          method: 'POST',
          body: { ...dataWithoutCities, type: 'city-to-city' },
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/cities are required/i);
      });

      it('returns 400 when country-to-country type is missing countries', async () => {
        const request = createMockRequest({
          method: 'POST',
          body: {
            ...validCorridorData,
            type: 'country-to-country',
            fromCountry: undefined,
            toCountry: undefined,
          },
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/countries are required/i);
      });
    });

    describe('validation - numeric fields', () => {
      beforeEach(() => {
        mockAdminAuth();
        vi.mocked(CorridorModel.findOne).mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        } as unknown as ReturnType<typeof CorridorModel.findOne>);
      });

      it('returns 400 when distanceKm is negative', async () => {
        const request = createMockRequest({
          method: 'POST',
          body: { ...validCorridorData, distanceKm: -100 },
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/distanceKm must be a positive number/i);
      });

      it('returns 400 when distanceKm is zero', async () => {
        const request = createMockRequest({
          method: 'POST',
          body: { ...validCorridorData, distanceKm: 0 },
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/distanceKm must be a positive number/i);
      });

      it('returns 400 when avgLatencyMs is negative', async () => {
        const request = createMockRequest({
          method: 'POST',
          body: { ...validCorridorData, avgLatencyMs: -50 },
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/avgLatencyMs must be a positive number/i);
      });
    });

    describe('validation - ObjectId fields', () => {
      beforeEach(() => {
        mockAdminAuth();
        vi.mocked(CorridorModel.findOne).mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        } as unknown as ReturnType<typeof CorridorModel.findOne>);
      });

      it('returns 400 when vendorId is invalid ObjectId', async () => {
        const request = createMockRequest({
          method: 'POST',
          body: { ...validCorridorData, vendorIds: ['invalid-id'] },
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/invalid vendorId/i);
      });

      it('returns 400 when categoryId is invalid ObjectId', async () => {
        const request = createMockRequest({
          method: 'POST',
          body: { ...validCorridorData, categoryIds: ['not-valid'] },
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/invalid categoryId/i);
      });

      it('accepts valid ObjectIds for vendorIds and categoryIds', async () => {
        const validVendorId = new mongoose.Types.ObjectId().toString();
        const validCategoryId = new mongoose.Types.ObjectId().toString();

        const mockCreated = {
          ...validCorridorData,
          _id: new mongoose.Types.ObjectId(),
          vendorIds: [validVendorId],
          categoryIds: [validCategoryId],
          toObject: function () {
            return this;
          },
        };
        vi.mocked(CorridorModel.create).mockResolvedValue(mockCreated as never);

        const request = createMockRequest({
          method: 'POST',
          body: {
            ...validCorridorData,
            vendorIds: [validVendorId],
            categoryIds: [validCategoryId],
          },
        });
        const response = await POST(request);

        expect(response.status).toBe(201);
      });
    });

    describe('duplicate slug handling', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('returns 409 when slug already exists', async () => {
        vi.mocked(CorridorModel.findOne).mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: 'existing-id', slug: 'new-york-london' }),
        } as unknown as ReturnType<typeof CorridorModel.findOne>);

        const request = createMockRequest({
          method: 'POST',
          body: validCorridorData,
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(409);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/already exists/i);
      });
    });

    describe('successful creation', () => {
      beforeEach(() => {
        mockAdminAuth();
        vi.mocked(CorridorModel.findOne).mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        } as unknown as ReturnType<typeof CorridorModel.findOne>);
      });

      it('creates corridor with valid data and returns 201', async () => {
        const mockCreated = {
          ...validCorridorData,
          _id: new mongoose.Types.ObjectId(),
          toObject: function () {
            return { ...this, _id: this._id };
          },
        };
        vi.mocked(CorridorModel.create).mockResolvedValue(mockCreated as never);

        const request = createMockRequest({
          method: 'POST',
          body: validCorridorData,
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(201);
        expect(json.success).toBe(true);
        expect(json.message).toBe('Corridor created successfully');
        expect(json.data.slug).toBe(validCorridorData.slug);
      });

      it('trims whitespace from string fields', async () => {
        const mockCreated = {
          ...validCorridorData,
          slug: 'trimmed-slug',
          title: 'Trimmed Title',
          _id: new mongoose.Types.ObjectId(),
          toObject: function () {
            return this;
          },
        };
        vi.mocked(CorridorModel.create).mockResolvedValue(mockCreated as never);

        const request = createMockRequest({
          method: 'POST',
          body: {
            ...validCorridorData,
            slug: '  trimmed-slug  ',
            title: '  Trimmed Title  ',
          },
        });
        await POST(request);

        expect(CorridorModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            slug: 'trimmed-slug',
            title: 'Trimmed Title',
          })
        );
      });

      it('sets default status to DRAFT when not provided', async () => {
        const { status: _status, ...dataWithoutStatus } = validCorridorData;
        const mockCreated = {
          ...dataWithoutStatus,
          status: 'DRAFT',
          _id: new mongoose.Types.ObjectId(),
          toObject: function () {
            return this;
          },
        };
        vi.mocked(CorridorModel.create).mockResolvedValue(mockCreated as never);

        const request = createMockRequest({
          method: 'POST',
          body: dataWithoutStatus,
        });
        await POST(request);

        expect(CorridorModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'DRAFT',
          })
        );
      });
    });
  });

  // ============================================
  // PUT /api/corridors - Unit Tests
  // ============================================
  describe('PUT', () => {
    const existingCorridorId = new mongoose.Types.ObjectId().toString();

    describe('authentication', () => {
      it('returns 401 when user is not authenticated', async () => {
        mockUnauthenticated();

        const request = createMockRequest({
          method: 'PUT',
          body: { _id: existingCorridorId, title: 'Updated' },
        });
        const response = await PUT(request);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.success).toBe(false);
      });
    });

    describe('validation', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('returns 400 when _id is missing', async () => {
        const request = createMockRequest({
          method: 'PUT',
          body: { title: 'Updated Title' },
        });
        const response = await PUT(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/_id.*required/i);
      });

      it('returns 404 when corridor does not exist', async () => {
        vi.mocked(CorridorModel.findById).mockResolvedValue(null);

        const request = createMockRequest({
          method: 'PUT',
          body: { _id: existingCorridorId, title: 'Updated' },
        });
        const response = await PUT(request);
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.error).toMatch(/not found/i);
      });

      it('returns 400 when vendorId is invalid during update', async () => {
        vi.mocked(CorridorModel.findById).mockResolvedValue({
          _id: existingCorridorId,
          type: 'city-to-city',
        });

        const request = createMockRequest({
          method: 'PUT',
          body: { _id: existingCorridorId, vendorIds: ['invalid'] },
        });
        const response = await PUT(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/invalid vendorId/i);
      });
    });

    describe('successful update', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('updates corridor with valid data', async () => {
        vi.mocked(CorridorModel.findById).mockResolvedValue({
          _id: existingCorridorId,
          type: 'city-to-city',
          title: 'Original Title',
        });

        vi.mocked(CorridorModel.findByIdAndUpdate).mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: existingCorridorId,
            title: 'Updated Title',
            type: 'city-to-city',
          }),
        } as unknown as ReturnType<typeof CorridorModel.findByIdAndUpdate>);

        const request = createMockRequest({
          method: 'PUT',
          body: { _id: existingCorridorId, title: 'Updated Title' },
        });
        const response = await PUT(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toBe('Corridor updated successfully');
      });

      it('clears cities when type changes to country-to-country', async () => {
        vi.mocked(CorridorModel.findById).mockResolvedValue({
          _id: existingCorridorId,
          type: 'city-to-city',
          fromCity: 'Paris',
          toCity: 'Berlin',
        });

        vi.mocked(CorridorModel.findByIdAndUpdate).mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: existingCorridorId,
            type: 'country-to-country',
          }),
        } as unknown as ReturnType<typeof CorridorModel.findByIdAndUpdate>);

        const request = createMockRequest({
          method: 'PUT',
          body: { _id: existingCorridorId, type: 'country-to-country' },
        });
        const response = await PUT(request);

        expect(CorridorModel.findByIdAndUpdate).toHaveBeenCalledWith(
          existingCorridorId,
          expect.objectContaining({
            $unset: { fromCity: 1, toCity: 1 },
          }),
          expect.any(Object)
        );
        expect(response.status).toBe(200);
      });
    });
  });

  // ============================================
  // DELETE /api/corridors - Unit Tests
  // ============================================
  describe('DELETE', () => {
    const existingCorridorId = new mongoose.Types.ObjectId().toString();

    describe('authentication', () => {
      it('returns 401 when user is not authenticated', async () => {
        mockUnauthenticated();

        const request = createMockRequest({
          method: 'DELETE',
          url: `http://localhost:3000/api/corridors?_id=${existingCorridorId}`,
        });
        const response = await DELETE(request);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.success).toBe(false);
      });
    });

    describe('validation', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('returns 400 when _id is missing', async () => {
        const request = createMockRequest({
          method: 'DELETE',
          url: 'http://localhost:3000/api/corridors',
        });
        const response = await DELETE(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toMatch(/_id.*required/i);
      });

      it('returns 404 when corridor does not exist', async () => {
        vi.mocked(CorridorModel.findById).mockResolvedValue(null);

        const request = createMockRequest({
          method: 'DELETE',
          url: `http://localhost:3000/api/corridors?_id=${existingCorridorId}`,
        });
        const response = await DELETE(request);
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.error).toMatch(/not found/i);
      });
    });

    describe('successful deletion', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('deletes corridor and returns success', async () => {
        vi.mocked(CorridorModel.findById).mockResolvedValue({
          _id: existingCorridorId,
          title: 'To Delete',
        });
        vi.mocked(CorridorModel.findByIdAndDelete).mockResolvedValue({
          _id: existingCorridorId,
        } as never);

        const request = createMockRequest({
          method: 'DELETE',
          url: `http://localhost:3000/api/corridors?_id=${existingCorridorId}`,
        });
        const response = await DELETE(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toBe('Corridor deleted successfully');
        expect(CorridorModel.findByIdAndDelete).toHaveBeenCalledWith(existingCorridorId);
      });
    });
  });
});
