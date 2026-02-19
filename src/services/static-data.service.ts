/**
 * Service layer for static data files
 
 */

export interface Country {
    id: number;
    code: string;
    name: string;
    emoji?: string;
}

export interface City {
    city: string;
    city_ascii: string;
    country: string;
    iso2: string;
}

export interface CountriesResponse {
    count: number;
    countries: Country[];
}

/**
 * Fetch countries from external API via proxy
 */
export async function fetchCountries(): Promise<Country[]> {
    try {
    
        const cacheKey = "csc_countries_cache_v1";
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error("Error parsing cached countries:", e);
            }
        }

        const response = await fetch("/api/external/countries");
        if (!response.ok) {
            throw new Error("Failed to fetch countries");
        }
        const data = await response.json();

       
        const countriesList = Array.isArray(data) ? data : (data?.data || []);

        if (!Array.isArray(countriesList)) {
            console.error("Unexpected response format from countries API:", data);
            return [];
        }

        const mappedCountries = countriesList.map((country: any) => ({
            id: country.id || Math.random(),
            code: country.iso2 || "",
            name: country.name || "",
            emoji: country.emoji || ""
        }));

        
        try {
            sessionStorage.setItem(cacheKey, JSON.stringify(mappedCountries));
        } catch (e) {
            console.error("Error caching countries:", e);
        }

        return mappedCountries;
    } catch (error) {
        console.error("Error fetching countries:", error);
        throw error;
    }
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
            if (j + 1 < line.length && line[j + 1] === '"') {
                current += '"';
                j++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            values.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
}

/**
 * Fetch cities from static CSV file
 */
export async function fetchCities(): Promise<City[]> {
    try {

        const cached = sessionStorage.getItem("worldcities_cache");
        if (cached) {
            try {
                const parsedCities = JSON.parse(cached) as City[];

                return parsedCities.sort((a, b) =>
                    a.city.localeCompare(b.city, undefined, { sensitivity: "base" })
                );
            } catch {

            }
        }

        const response = await fetch("/data/worldcities.csv");
        if (!response.ok) {
            throw new Error("Failed to fetch cities");
        }

        const text = await response.text();
        const lines = text.split("\n");

        if (lines.length < 2) {
            throw new Error("Invalid CSV format");
        }


        const headerLine = lines[0];
        const headers = headerLine
            .split(",")
            .map((h) => h.replace(/^"|"$/g, "").trim());

        const cityIndex = headers.indexOf("city");
        const cityAsciiIndex = headers.indexOf("city_ascii");
        const countryIndex = headers.indexOf("country");
        const iso2Index = headers.indexOf("iso2");

        if (cityIndex === -1) {
            throw new Error("City column not found");
        }

        const parsedCities: City[] = [];


        for (let i = 1; i < Math.min(lines.length, 50001); i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = parseCSVLine(line);

            if (values.length > Math.max(cityIndex, cityAsciiIndex, countryIndex, iso2Index)) {
                const city = (values[cityIndex] || "").replace(/^"|"$/g, "").trim();
                const cityAscii = (values[cityAsciiIndex] || "").replace(/^"|"$/g, "").trim();
                const country = (values[countryIndex] || "").replace(/^"|"$/g, "").trim();
                const iso2 = (values[iso2Index] || "").replace(/^"|"$/g, "").trim();

                if (city || cityAscii) {
                    parsedCities.push({
                        city: city || cityAscii,
                        city_ascii: cityAscii || city,
                        country,
                        iso2,
                    });
                }
            }
        }


        parsedCities.sort((a, b) =>
            a.city.localeCompare(b.city, undefined, { sensitivity: "base" })
        );


        try {
            sessionStorage.setItem("worldcities_cache", JSON.stringify(parsedCities));
        } catch {

        }

        return parsedCities;
    } catch (error) {
        console.error("Error fetching cities:", error);
        throw error;
    }
}


/**
 * Fetch cities for a specific country from external API
 */
export async function fetchCitiesByCountry(countryCode: string): Promise<City[]> {
    if (!countryCode) return [];

    try {
        const cacheKey = `csc_cities_${countryCode}_cache_v1`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error("Error parsing cached cities:", e);
            }
        }

        const response = await fetch(`/api/external/cities?ciso=${countryCode}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch cities for ${countryCode}`);
        }
        const data = await response.json();

        const citiesList = Array.isArray(data) ? data : (data?.data || []);

        const mappedCities = citiesList.map((city: any) => ({
            city: city.name,
            city_ascii: city.name,
            country: countryCode,
            iso2: countryCode
        }));

        try {
            sessionStorage.setItem(cacheKey, JSON.stringify(mappedCities));
        } catch (e) {
            console.error("Error caching cities:", e);
        }

        return mappedCities.sort((a: City, b: City) => a.city.localeCompare(b.city));
    } catch (error) {
        console.error(`Error fetching cities for ${countryCode}:`, error);
        return [];
    }
}
