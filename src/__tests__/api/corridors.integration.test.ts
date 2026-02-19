import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import mongoose from 'mongoose';
import * as appHandler from '@/app/api/corridors/route';
import { CorridorModel } from '@/models';
import { createTestCorridor, createCountryToCountryCorridor } from '../factories/corridor.factory';
import { mockAdminAuth, mockUnauthenticated } from '../helpers/auth.mock';

// Mock dependencies
vi.mock('@/database/auth-utils');
vi.mock('@/database/mongoose-connection', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('/api/corridors', () => {
  // ============================================
  // GET /api/corridors
  // ============================================
  describe('GET', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('returns empty array when no corridors exist', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.data).toEqual([]);
          expect(json.count).toBe(0);
          expect(json.stats).toEqual({
            total: 0,
            published: 0,
            draft: 0,
          });
        },
      });
    });

    it('returns corridors list with stats', async () => {
      // Seed test data
      await CorridorModel.create(createTestCorridor({ title: 'Corridor 1', status: 'DRAFT' }));
      await CorridorModel.create(createTestCorridor({ title: 'Corridor 2', status: 'PUBLISHED' }));
      await CorridorModel.create(createTestCorridor({ title: 'Corridor 3', status: 'PUBLISHED' }));

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.data).toHaveLength(3);
          expect(json.count).toBe(3);
          expect(json.stats).toEqual({
            total: 3,
            published: 2,
            draft: 1,
          });
        },
      });
    });

    it('filters by status=PUBLISHED', async () => {
      await CorridorModel.create(createTestCorridor({ status: 'DRAFT' }));
      await CorridorModel.create(createTestCorridor({ status: 'PUBLISHED' }));

      await testApiHandler({
        appHandler,
        url: '/api/corridors?status=PUBLISHED',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          const json = await res.json();

          expect(json.success).toBe(true);
          expect(json.data).toHaveLength(1);
          expect(json.data[0].status).toBe('PUBLISHED');
        },
      });
    });

    it('filters by status=DRAFT', async () => {
      await CorridorModel.create(createTestCorridor({ status: 'DRAFT' }));
      await CorridorModel.create(createTestCorridor({ status: 'PUBLISHED' }));

      await testApiHandler({
        appHandler,
        url: '/api/corridors?status=DRAFT',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          const json = await res.json();

          expect(json.success).toBe(true);
          expect(json.data).toHaveLength(1);
          expect(json.data[0].status).toBe('DRAFT');
        },
      });
    });

    it('returns all when status=ALL', async () => {
      await CorridorModel.create(createTestCorridor({ status: 'DRAFT' }));
      await CorridorModel.create(createTestCorridor({ status: 'PUBLISHED' }));

      await testApiHandler({
        appHandler,
        url: '/api/corridors?status=ALL',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          const json = await res.json();

          expect(json.data).toHaveLength(2);
        },
      });
    });

    it('filters by type=city-to-city', async () => {
      await CorridorModel.create(createTestCorridor({ type: 'city-to-city' }));
      await CorridorModel.create(createCountryToCountryCorridor());

      await testApiHandler({
        appHandler,
        url: '/api/corridors?type=city-to-city',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          const json = await res.json();

          expect(json.data).toHaveLength(1);
          expect(json.data[0].type).toBe('city-to-city');
        },
      });
    });

    it('filters by type=country-to-country', async () => {
      await CorridorModel.create(createTestCorridor({ type: 'city-to-city' }));
      await CorridorModel.create(createCountryToCountryCorridor());

      await testApiHandler({
        appHandler,
        url: '/api/corridors?type=country-to-country',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          const json = await res.json();

          expect(json.data).toHaveLength(1);
          expect(json.data[0].type).toBe('country-to-country');
        },
      });
    });

    it('searches by title', async () => {
      await CorridorModel.create(createTestCorridor({ 
        title: 'New York to London',
        summary: 'A corridor connecting New York and London'
      }));
      await CorridorModel.create(createTestCorridor({ 
        title: 'Singapore to Tokyo', 
        fromCity: 'Singapore',
        toCity: 'Tokyo',
        fromCountry: 'Japan', 
        toCountry: 'China',
        summary: 'A corridor connecting Singapore and Tokyo'
      }));

      await testApiHandler({
        appHandler,
        url: '/api/corridors?search=york',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          const json = await res.json();

          expect(json.data).toHaveLength(1);
          expect(json.data[0].title).toContain('York');
        },
      });
    });

    it('searches by fromCity', async () => {
      await CorridorModel.create(createTestCorridor({ fromCity: 'Paris' }));
      await CorridorModel.create(createTestCorridor({ fromCity: 'Berlin' }));

      await testApiHandler({
        appHandler,
        url: '/api/corridors?search=paris',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          const json = await res.json();

          expect(json.data).toHaveLength(1);
          expect(json.data[0].fromCity).toBe('Paris');
        },
      });
    });

    it('returns 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' });
          const json = await res.json();

          expect(res.status).toBe(401);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/unauthorized/i);
        },
      });
    });
  });

  // ============================================
  // POST /api/corridors
  // ============================================
  describe('POST', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('creates corridor with valid city-to-city data', async () => {
      const corridorData = createTestCorridor();

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(201);
          expect(json.success).toBe(true);
          expect(json.data.title).toBe(corridorData.title);
          expect(json.data.slug).toBe(corridorData.slug);
          expect(json.data._id).toBeDefined();
          expect(json.message).toBe('Corridor created successfully');
        },
      });

      // Verify in database
      const saved = await CorridorModel.findOne({ slug: corridorData.slug });
      expect(saved).not.toBeNull();
      expect(saved?.title).toBe(corridorData.title);
    });

    it('creates corridor with valid country-to-country data', async () => {
      const corridorData = createCountryToCountryCorridor();

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(201);
          expect(json.success).toBe(true);
          expect(json.data.type).toBe('country-to-country');
          expect(json.data.fromCountry).toBe(corridorData.fromCountry);
          expect(json.data.toCountry).toBe(corridorData.toCountry);
        },
      });
    });

    it('returns 400 for missing slug', async () => {
      const corridorData = createTestCorridor();
      delete (corridorData as unknown as Record<string, unknown>).slug;

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/slug is required/i);
        },
      });
    });

    it('returns 400 for missing title', async () => {
      const corridorData = createTestCorridor();
      delete (corridorData as unknown as Record<string, unknown>).title;

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/title is required/i);
        },
      });
    });

    it('returns 400 for missing type', async () => {
      const corridorData = createTestCorridor();
      delete (corridorData as unknown as Record<string, unknown>).type;

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/type is required/i);
        },
      });
    });

    it('returns 400 for missing cities on city-to-city type', async () => {
      const corridorData = createTestCorridor({
        type: 'city-to-city',
        fromCity: undefined,
        toCity: undefined,
      });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/cities are required/i);
        },
      });
    });

    it('returns 400 for missing countries on country-to-country type', async () => {
      const corridorData = {
        ...createCountryToCountryCorridor(),
        fromCountry: undefined,
        toCountry: undefined,
      };

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/countries are required/i);
        },
      });
    });

    it('returns 400 for invalid distanceKm', async () => {
      const corridorData = createTestCorridor({ distanceKm: -100 });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/distanceKm must be a positive number/i);
        },
      });
    });

    it('returns 400 for invalid avgLatencyMs', async () => {
      const corridorData = createTestCorridor({ avgLatencyMs: -50 });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/avgLatencyMs must be a positive number/i);
        },
      });
    });

    it('returns 400 for missing mapImageUrl', async () => {
      const corridorData = createTestCorridor();
      delete (corridorData as unknown as Record<string, unknown>).mapImageUrl;

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/map image url is required/i);
        },
      });
    });

    it('returns 400 for invalid vendorId', async () => {
      const corridorData = createTestCorridor({
        vendorIds: ['invalid-id'],
      });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/invalid vendorId/i);
        },
      });
    });

    it('returns 400 for invalid categoryId', async () => {
      const corridorData = createTestCorridor({
        categoryIds: ['invalid-id'],
      });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/invalid categoryId/i);
        },
      });
    });

    it('returns 409 for duplicate slug', async () => {
      const existingCorridor = createTestCorridor({ slug: 'duplicate-slug' });
      await CorridorModel.create(existingCorridor);

      const newCorridor = createTestCorridor({ slug: 'duplicate-slug' });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCorridor),
          });
          const json = await res.json();

          expect(res.status).toBe(409);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/already exists/i);
        },
      });
    });

    it('accepts valid vendorIds and categoryIds', async () => {
      const validVendorId = new mongoose.Types.ObjectId().toString();
      const validCategoryId = new mongoose.Types.ObjectId().toString();

      const corridorData = createTestCorridor({
        vendorIds: [validVendorId],
        categoryIds: [validCategoryId],
      });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(201);
          expect(json.success).toBe(true);
        },
      });
    });

    it('creates corridor with sponsor data', async () => {
      const corridorData = createTestCorridor({
        sponsor: {
          carrierName: 'Test Carrier',
          companyName: 'Test Company',
          logoUrl: 'https://example.com/logo.png',
          websiteUrl: 'https://example.com',
          bannerUrl: 'https://example.com/banner.png',
        },
      });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(201);
          expect(json.data.sponsor.carrierName).toBe('Test Carrier');
        },
      });
    });

    it('creates corridor with subseaSystems', async () => {
      const corridorData = createTestCorridor({
        subseaSystems: [
          { cableId: 'cable-1', name: 'Atlantic Cable', imageUrl: 'https://example.com/cable.png' },
          { cableId: 'cable-2', name: 'Pacific Cable' },
        ],
      });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corridorData),
          });
          const json = await res.json();

          expect(res.status).toBe(201);
          expect(json.data.subseaSystems).toHaveLength(2);
        },
      });
    });

    it('returns 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createTestCorridor()),
          });
          const json = await res.json();

          expect(res.status).toBe(401);
          expect(json.success).toBe(false);
        },
      });
    });
  });

  // ============================================
  // PUT /api/corridors
  // ============================================
  describe('PUT', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('updates corridor with valid data', async () => {
      const corridor = await CorridorModel.create(createTestCorridor());

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _id: corridor._id.toString(),
              title: 'Updated Title',
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.data.title).toBe('Updated Title');
          expect(json.message).toBe('Corridor updated successfully');
        },
      });

      // Verify in database
      const updated = await CorridorModel.findById(corridor._id);
      expect(updated?.title).toBe('Updated Title');
    });

    it('updates multiple fields at once', async () => {
      const corridor = await CorridorModel.create(createTestCorridor());

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _id: corridor._id.toString(),
              title: 'New Title',
              distanceKm: 8000,
              avgLatencyMs: 100,
              status: 'PUBLISHED',
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.data.title).toBe('New Title');
          expect(json.data.distanceKm).toBe(8000);
          expect(json.data.avgLatencyMs).toBe(100);
          expect(json.data.status).toBe('PUBLISHED');
        },
      });
    });

    it('returns 400 for missing _id', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Updated Title' }),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/_id.*required/i);
        },
      });
    });

    it('returns 404 for non-existent corridor', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _id: fakeId,
              title: 'Updated Title',
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(404);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/not found/i);
        },
      });
    });

    it('returns 400 for invalid vendorId during update', async () => {
      const corridor = await CorridorModel.create(createTestCorridor());

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _id: corridor._id.toString(),
              vendorIds: ['invalid-id'],
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.error).toMatch(/invalid vendorId/i);
        },
      });
    });

    it('clears cities when changing to country-to-country type', async () => {
      const corridor = await CorridorModel.create(
        createTestCorridor({
          type: 'city-to-city',
          fromCity: 'Paris',
          toCity: 'Berlin',
          fromCountry: 'France',
          toCountry: 'Germany',
        })
      );

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _id: corridor._id.toString(),
              type: 'country-to-country',
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.data.type).toBe('country-to-country');
          expect(json.data.fromCity).toBeUndefined();
          expect(json.data.toCity).toBeUndefined();
        },
      });
    });

    it('returns 401 for unauthenticated request', async () => {
      mockUnauthenticated();
      const corridor = await CorridorModel.create(createTestCorridor());

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _id: corridor._id.toString(),
              title: 'Updated',
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(401);
          expect(json.success).toBe(false);
        },
      });
    });
  });

  // ============================================
  // DELETE /api/corridors
  // ============================================
  describe('DELETE', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('deletes corridor successfully', async () => {
      const corridor = await CorridorModel.create(createTestCorridor());

      await testApiHandler({
        appHandler,
        url: `/api/corridors?_id=${corridor._id.toString()}`,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'DELETE' });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.message).toBe('Corridor deleted successfully');
        },
      });

      // Verify deleted from database
      const deleted = await CorridorModel.findById(corridor._id);
      expect(deleted).toBeNull();
    });

    it('returns 400 for missing _id', async () => {
      await testApiHandler({
        appHandler,
        url: '/api/corridors',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'DELETE' });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/_id.*required/i);
        },
      });
    });

    it('returns 404 for non-existent corridor', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await testApiHandler({
        appHandler,
        url: `/api/corridors?_id=${fakeId}`,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'DELETE' });
          const json = await res.json();

          expect(res.status).toBe(404);
          expect(json.success).toBe(false);
          expect(json.error).toMatch(/not found/i);
        },
      });
    });

    it('returns 401 for unauthenticated request', async () => {
      mockUnauthenticated();
      const corridor = await CorridorModel.create(createTestCorridor());

      await testApiHandler({
        appHandler,
        url: `/api/corridors?_id=${corridor._id.toString()}`,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'DELETE' });
          const json = await res.json();

          expect(res.status).toBe(401);
          expect(json.success).toBe(false);
        },
      });
    });
  });
});
