import { Router } from "express";
import {
  getCities,
  getSerbianCities,
  clearCache,
} from "../controllers/citiesController.ts";

const router = Router();

// Public routes
router.get("/serbia", getSerbianCities); // Convenience endpoint for Serbian cities
router.delete("/cache/:countryCode", clearCache); // Clear cache for specific country
router.delete("/cache", clearCache); // Clear all cache
router.get("/:countryCode", getCities); // Get cities by country code

export default router;
