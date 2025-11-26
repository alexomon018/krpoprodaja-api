import type { Request, Response } from "express";
import citiesService from "../services/citiesService.ts";

/**
 * Get all cities for a country
 * GET /api/cities/:countryCode
 * Query params:
 * - minPopulation: Filter cities by minimum population
 * - search: Search cities by name
 */
export async function getCities(req: Request, res: Response) {
  try {
    const { countryCode } = req.params;
    const { minPopulation, search } = req.query;

    if (!countryCode || countryCode.length !== 2) {
      return res.status(400).json({
        error: "Invalid country code. Please provide a 2-letter ISO country code (e.g., RS for Serbia)",
      });
    }

    let cities;

    if (search && typeof search === "string") {
      // Search by name
      cities = await citiesService.searchCities(countryCode, search);
    } else if (minPopulation && typeof minPopulation === "string") {
      // Filter by population
      const minPop = parseInt(minPopulation);
      if (isNaN(minPop)) {
        return res.status(400).json({
          error: "Invalid minPopulation parameter. Must be a number.",
        });
      }
      cities = await citiesService.getCitiesByPopulation(countryCode, minPop);
    } else {
      // Get all cities
      cities = await citiesService.getCities(countryCode);
    }

    return res.status(200).json({
      country: countryCode.toUpperCase(),
      count: cities.length,
      cities,
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch cities",
    });
  }
}

/**
 * Get Serbian cities (convenience endpoint)
 * GET /api/cities/serbia
 * Query params:
 * - minPopulation: Filter cities by minimum population
 * - search: Search cities by name
 */
export async function getSerbianCities(req: Request, res: Response) {
  try {
    const { minPopulation, search } = req.query;

    let cities;

    if (search && typeof search === "string") {
      cities = await citiesService.searchCities("RS", search);
    } else if (minPopulation && typeof minPopulation === "string") {
      const minPop = parseInt(minPopulation);
      if (isNaN(minPop)) {
        return res.status(400).json({
          error: "Invalid minPopulation parameter. Must be a number.",
        });
      }
      cities = await citiesService.getCitiesByPopulation("RS", minPop);
    } else {
      cities = await citiesService.getCities("RS");
    }

    return res.status(200).json({
      country: "RS",
      countryName: "Serbia",
      count: cities.length,
      cities,
    });
  } catch (error) {
    console.error("Error fetching Serbian cities:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch cities",
    });
  }
}

/**
 * Clear cities cache
 * DELETE /api/cities/cache/:countryCode?
 */
export async function clearCache(req: Request, res: Response) {
  try {
    const { countryCode } = req.params;

    citiesService.clearCache(countryCode);

    return res.status(200).json({
      message: countryCode
        ? `Cache cleared for ${countryCode}`
        : "All cache cleared",
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return res.status(500).json({
      error: "Failed to clear cache",
    });
  }
}
