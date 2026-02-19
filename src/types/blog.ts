import { Corridor } from './corridor';

export type BlogType = 'general' | 'corridor';
export type BlogStatus = 'DRAFT' | 'PUBLISHED';

export interface Blog {
  _id: string;
  slug: string;
  title: string;
  content: string;
  coverImageUrl?: string;
  coverImagePublicId?: string;
  type: BlogType;
  corridorIds?: string[];
  status: BlogStatus;
  authorId: string;
  authorName?: string;
  publishedAt?: Date | string;
  // SEO fields
  keywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  focusKeyphrase?: string;
  canonicalUrl?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BlogWithCorridor extends Blog {
  corridors?: Array<Pick<Corridor, '_id' | 'title' | 'slug' | 'fromCity' | 'toCity' | 'fromCountry' | 'toCountry'>>;
}

export interface BlogFilters {
  search?: string;
  status?: BlogStatus;
  type?: BlogType;
  corridorId?: string;
  corridorIds?: string[];
  page?: number;
  limit?: number;
}

export interface BlogStats {
  total: number;
  published: number;
  draft: number;
  general: number;
  corridor: number;
}

export interface BlogListResponse {
  success: boolean;
  data: Blog[];
  count: number;
  stats: BlogStats;
}

export interface BlogCreateInput {
  title: string;
  content: string;
  authorName?: string;
  coverImageUrl?: string;
  coverImagePublicId?: string;
  type: BlogType;
  corridorIds?: string[] | null;
  status?: BlogStatus;
  // SEO fields
  keywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  focusKeyphrase?: string;
  canonicalUrl?: string;
}

export interface BlogUpdateInput extends Partial<BlogCreateInput> { }
