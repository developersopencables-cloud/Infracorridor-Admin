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
