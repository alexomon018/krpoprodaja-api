import { sql } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { products } from "../db/schema.ts";

/**
 * User statistics returned from getUserProductStats
 */
export interface UserProductStats {
  activeListings: number;
  soldItems: number;
}

/**
 * Get product statistics for a user (active listings and sold items count)
 * Uses a single optimized query with conditional aggregation instead of two separate queries
 *
 * @param userId - The user ID to get stats for
 * @returns Object containing activeListings and soldItems counts
 */
export async function getUserProductStats(
  userId: string
): Promise<UserProductStats> {
  const [stats] = await db
    .select({
      activeListings: sql<number>`count(*) filter (where ${products.status} = 'active')::int`,
      soldItems: sql<number>`count(*) filter (where ${products.status} = 'sold')::int`,
    })
    .from(products)
    .where(sql`${products.sellerId} = ${userId}`);

  return {
    activeListings: stats?.activeListings || 0,
    soldItems: stats?.soldItems || 0,
  };
}
