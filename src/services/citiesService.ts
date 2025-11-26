import axios from "axios";

export interface City {
  name: string;
  population?: number;
  latitude?: number;
  longitude?: number;
  adminName?: string; // Region/Province name
}

export interface CitiesProvider {
  getCities(country: string): Promise<City[]>;
}

/**
 * Geonames API Provider
 * Free tier: 20,000 credits per day
 * Documentation: http://www.geonames.org/export/web-services.html
 */
class GeonamesProvider implements CitiesProvider {
  private username: string;
  private baseUrl = "http://api.geonames.org";

  constructor(username: string) {
    if (!username) {
      throw new Error("Geonames username is required");
    }
    this.username = username;
  }

  async getCities(countryCode: string): Promise<City[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/searchJSON`, {
        params: {
          country: countryCode,
          featureClass: "P", // P = city, village, etc.
          maxRows: 1000,
          username: this.username,
          orderby: "population",
        },
        timeout: 10000,
      });

      if (response.data.status) {
        throw new Error(
          `Geonames API error: ${response.data.status.message}`
        );
      }

      const geonames = response.data.geonames || [];

      return geonames.map((place: any) => ({
        name: place.name,
        population: place.population,
        latitude: place.lat ? parseFloat(place.lat) : undefined,
        longitude: place.lng ? parseFloat(place.lng) : undefined,
        adminName: place.adminName1, // Province/Region
      }));
    } catch (error) {
      console.error("Error fetching cities from Geonames:", error);
      throw new Error(
        `Failed to fetch cities: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

/**
 * Cities Service
 * Manages city data retrieval from various providers
 */
class CitiesService {
  private provider: CitiesProvider;
  private cache: Map<string, { data: City[]; timestamp: number }> = new Map();
  private cacheDuration = 24 * 60 * 60 * 1000; // 24 hours

  constructor(provider: CitiesProvider) {
    this.provider = provider;
  }

  /**
   * Get cities for a country (with caching)
   * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "RS" for Serbia)
   * @returns Array of cities
   */
  async getCities(countryCode: string): Promise<City[]> {
    const upperCountryCode = countryCode.toUpperCase();

    // Check cache
    const cached = this.cache.get(upperCountryCode);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      console.log(`Returning cached cities for ${upperCountryCode}`);
      return cached.data;
    }

    // Fetch fresh data
    console.log(`Fetching cities for ${upperCountryCode} from provider`);
    const cities = await this.provider.getCities(upperCountryCode);

    // Update cache
    this.cache.set(upperCountryCode, {
      data: cities,
      timestamp: Date.now(),
    });

    return cities;
  }

  /**
   * Get cities filtered by minimum population
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @param minPopulation - Minimum population threshold
   * @returns Filtered array of cities
   */
  async getCitiesByPopulation(
    countryCode: string,
    minPopulation: number
  ): Promise<City[]> {
    const cities = await this.getCities(countryCode);
    return cities.filter(
      (city) => city.population && city.population >= minPopulation
    );
  }

  /**
   * Search cities by name
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @param searchTerm - Search term (case-insensitive)
   * @returns Filtered array of cities
   */
  async searchCities(
    countryCode: string,
    searchTerm: string
  ): Promise<City[]> {
    const cities = await this.getCities(countryCode);
    const lowerSearchTerm = searchTerm.toLowerCase();
    return cities.filter((city) =>
      city.name.toLowerCase().includes(lowerSearchTerm)
    );
  }

  /**
   * Clear cache for a specific country or all countries
   * @param countryCode - Optional country code to clear specific cache
   */
  clearCache(countryCode?: string): void {
    if (countryCode) {
      this.cache.delete(countryCode.toUpperCase());
      console.log(`Cache cleared for ${countryCode}`);
    } else {
      this.cache.clear();
      console.log("All cache cleared");
    }
  }
}

// Initialize service with Geonames provider
const geonamesUsername = process.env.GEONAMES_USERNAME || "";
let citiesService: CitiesService;

try {
  const geonamesProvider = new GeonamesProvider(geonamesUsername);
  citiesService = new CitiesService(geonamesProvider);
} catch (error) {
  console.warn(
    "Cities service not initialized: Missing GEONAMES_USERNAME environment variable"
  );
  // Create a dummy service that throws errors when used
  citiesService = new CitiesService({
    getCities: async () => {
      throw new Error(
        "Cities service not configured. Please set GEONAMES_USERNAME environment variable."
      );
    },
  });
}

export default citiesService;
export { CitiesService, GeonamesProvider };
