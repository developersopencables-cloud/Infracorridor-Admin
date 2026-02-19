export interface CorridorSponsor {
  carrierName?: string;
  companyName?: string;
  logoUrl?: string;
  websiteUrl?: string;
  bannerUrl?: string;
}
export interface SubseaSystem {
  cableId: string;
  name: string;
  imageUrl?: string;
}

export interface CustomField {
  name: string;
  value: string;
}

export interface OrderedCategory {
  categoryId: string;
  order: number;
}

export interface Corridor {
  _id: string;
  slug: string;
  title: string;
  fromCity?: string;
  toCity?: string;
  fromCountry?: string;
  toCountry?: string;
  distanceKm: number;
  avgLatencyMs: number;
  summary: string;
  mapImageUrl: string;
  status: 'DRAFT' | 'PUBLISHED';
  type: 'city-to-city' | 'country-to-country';
  vendorIds?: string[];
  categoryIds?: string[];
  vendorCategoryPairs?: { vendorId: string; categoryId: string; order: number }[];
  orderedCategories?: OrderedCategory[];
  sponsor?: CorridorSponsor;
  customFields?: CustomField[];
  subseaSystems?: SubseaSystem[];
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Carrier {
  _id: string;
  name: string;
  description: string;
  logoUrl: string;
  website: string;
  isActive: boolean;
  createdAt: Date | string;
}

export interface DataCenter {
  _id: string;
  name: string;
  country?: string;
  description?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Exchange {
  _id: string;
  name: string;
  description?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Vendor {
  _id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  categoryIds?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Category {
  _id: string;
  title: string;
  description?: string;
  classificationIds?: (string | { _id: string; name: string;[key: string]: any })[] | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CategoryClassification {
  _id: string;
  name: string;
  description?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LastMileProvider {
  _id: string;
  name: string;
  region?: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CorridorCarrier {
  _id: string;
  corridorId: string;
  carrierId: string;
  position: number;
  isSponsored: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CorridorDataCenter {
  _id: string;
  corridorId: string;
  dataCenterId: string;
  position: number;
  isSponsored: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CorridorExchange {
  _id: string;
  corridorId: string;
  exchangeId: string;
  position: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CorridorVendor {
  _id: string;
  corridorId: string;
  vendorId: string;
  position: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CorridorLastMile {
  _id: string;
  corridorId: string;
  providerId: string;
  position: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
export interface CityToCityCorridor {
  _id: string;
  title: string;
  fromCity: string;
  toCity: string;
  distanceKm: number;
  avgLatencyMs: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
}
export interface CountryToCountryCorridor {
  _id: string;
  type: 'country-to-country' | 'city-to-city';
  title: string;
  fromCountry: string;
  toCountry: string;
  distanceKm: number;
  avgLatencyMs: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
}
export interface CorridorWithRelations extends Corridor {
  carriers?: (CorridorCarrier & { carrier?: Carrier })[];
  dataCenters?: (CorridorDataCenter & { dataCenter?: DataCenter })[];
  exchanges?: (CorridorExchange & { exchange?: Exchange })[];
  vendors?: (CorridorVendor & { vendor?: Vendor })[];
  lastMileProviders?: (CorridorLastMile & { provider?: LastMileProvider })[];
}

