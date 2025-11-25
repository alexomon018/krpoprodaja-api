import type { Request, Response } from 'express'
import { db } from '../db/connection.ts'
import { brands } from '../db/schema.ts'
import { asc } from 'drizzle-orm'

/**
 * Get all brands
 * GET /api/brands
 */
export async function getBrands(req: Request, res: Response) {
  try {
    const brandsData = await db
      .select({
        id: brands.id,
        name: brands.name,
      })
      .from(brands)
      .orderBy(asc(brands.name))

    return res.status(200).json({
      brands: brandsData,
    })
  } catch (error) {
    console.error('Error fetching brands:', error)
    return res.status(500).json({ error: 'Failed to fetch brands' })
  }
}
