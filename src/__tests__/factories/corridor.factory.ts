import mongoose from 'mongoose';

export interface TestCorridorData {
  _id?: mongoose.Types.ObjectId;
  slug: string;
  title: string;
  fromCity?: string;
  toCity?: string;
  fromCountry?: string;
  toCountry?: string;
  distanceKm: number;
  avgLatencyMs: number;
  summary?: string;
  mapImageUrl: string;
  status: 'DRAFT' | 'PUBLISHED';
  type: 'city-to-city' | 'country-to-country';
  vendorIds?: string[];
  categoryIds?: string[];
  vendorCategoryPairs?: { vendorId: string; categoryId: string }[];
  customFields?: { name: string; value: string }[];
  subseaSystems: { cableId: string; name: string; imageUrl?: string }[];
  sponsor?: {
    carrierName?: string;
    companyName?: string;
    logoUrl?: string;
    websiteUrl?: string;
    bannerUrl?: string;
  } | null;
}

let corridorCounter = 0;

/**
 * Create test corridor data with sensible defaults
 * All required fields are populated, optional fields can be overridden
 */
export const createTestCorridor = (
  overrides: Partial<TestCorridorData> = {}
): TestCorridorData => {
  corridorCounter++;
  const timestamp = Date.now();

  return {
    slug: `test-corridor-${corridorCounter}-${timestamp}`,
    title: `Test Corridor ${corridorCounter}`,
    type: 'city-to-city',
    fromCity: 'New York',
    toCity: 'London',
    fromCountry: 'United States',
    toCountry: 'United Kingdom',
    distanceKm: 5500,
    avgLatencyMs: 75,
    summary: 'A test corridor for unit testing',
    mapImageUrl: 'https://example.com/map.png',
    status: 'DRAFT',
    customFields: [],
    subseaSystems: [],
    vendorIds: [],
    categoryIds: [],
    vendorCategoryPairs: [],
    ...overrides,
  };
};

/**
 * Create test corridor data for country-to-country type
 */
export const createCountryToCountryCorridor = (
  overrides: Partial<TestCorridorData> = {}
): TestCorridorData => {
  return createTestCorridor({
    type: 'country-to-country',
    fromCity: undefined,
    toCity: undefined,
    fromCountry: 'United States',
    toCountry: 'United Kingdom',
    ...overrides,
  });
};

/**
 * Create multiple test corridors
 */
export const createTestCorridors = (
  count: number,
  overrides: Partial<TestCorridorData> = {}
): TestCorridorData[] => {
  return Array.from({ length: count }, (_, i) =>
    createTestCorridor({ title: `Corridor ${i + 1}`, ...overrides })
  );
};

/**
 * Reset the corridor counter (useful for deterministic tests)
 */
export const resetCorridorCounter = () => {
  corridorCounter = 0;
};
