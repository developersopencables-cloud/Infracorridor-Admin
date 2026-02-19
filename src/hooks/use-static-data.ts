import { useQuery } from "@tanstack/react-query";
import { fetchCountries, fetchCities, fetchCitiesByCountry, type Country, type City } from "@/services/static-data.service";

/**
 * Query key factories for static data
 */
export const staticDataKeys = {
    all: ["static-data-v1"] as const,
    countries: () => [...staticDataKeys.all, "countries"] as const,
    cities: () => [...staticDataKeys.all, "cities"] as const,
    citiesByCountry: (code: string) => [...staticDataKeys.all, "cities", code] as const,
};

/**
 * Hook to fetch countries using TanStack Query
 */
export function useCountries() {
    return useQuery<Country[]>({
        queryKey: staticDataKeys.countries(),
        queryFn: fetchCountries,
        staleTime: 1000 * 60 * 60, // 1 hour
        gcTime: 1000 * 60 * 60 * 2, // 2 hours
    });
}

/**
 * Hook to fetch all cities from CSV (legacy/fallback)
 */
export function useCities() {
    return useQuery<City[]>({
        queryKey: staticDataKeys.cities(),
        queryFn: fetchCities,
        staleTime: Infinity,
        gcTime: 1000 * 60 * 60,
    });
}

/**
 * Hook to fetch cities for a specific country using API
 */
export function useCitiesByCountry(countryCode?: string) {
    return useQuery<City[]>({
        queryKey: staticDataKeys.citiesByCountry(countryCode || ""),
        queryFn: () => fetchCitiesByCountry(countryCode!),
        enabled: !!countryCode,
        staleTime: 1000 * 60 * 60,
    });
}

