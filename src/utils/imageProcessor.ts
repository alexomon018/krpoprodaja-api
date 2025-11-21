import { generatePresignedUrls, isS3Key } from '../services/s3Service.ts'

/**
 * Process product images - convert S3 keys to presigned URLs
 * This function handles both single products and arrays of products
 *
 * @param data - A single product object, array of products, or any object containing images
 * @returns The same structure with S3 keys replaced by presigned URLs
 */
export async function processProductImages<T extends { images?: string[] | null }>(
  data: T
): Promise<T>
export async function processProductImages<T extends { images?: string[] | null }>(
  data: T[]
): Promise<T[]>
export async function processProductImages<T extends { images?: string[] | null }>(
  data: T | T[]
): Promise<T | T[]> {
  // Handle arrays
  if (Array.isArray(data)) {
    return Promise.all(data.map((item) => processSingleProduct(item)))
  }

  // Handle single object
  return processSingleProduct(data)
}

/**
 * Process a single product's images
 */
async function processSingleProduct<T extends { images?: string[] | null }>(
  product: T
): Promise<T> {
  if (!product.images || product.images.length === 0) {
    return product
  }

  // Check if images are S3 keys (not full URLs)
  const needsPresigning = product.images.some((img: string) => isS3Key(img))

  if (needsPresigning) {
    // Generate presigned URLs for all keys
    const keysOnly = product.images.filter((img: string) => isS3Key(img))
    const presignedUrls = await generatePresignedUrls(keysOnly)

    // Create a mapping for easy replacement
    const urlMap = new Map<string, string>()
    keysOnly.forEach((key, index) => {
      urlMap.set(key, presignedUrls[index])
    })

    // Replace keys with presigned URLs
    product.images = product.images.map((img: string) =>
      isS3Key(img) ? urlMap.get(img) || img : img
    )
  }

  return product
}

/**
 * Process nested product images (for favorites, seller listings, etc.)
 * @param data - Object or array containing a 'product' field with images
 */
export async function processNestedProductImages<T extends { product?: { images?: string[] | null } }>(
  data: T
): Promise<T>
export async function processNestedProductImages<T extends { product?: { images?: string[] | null } }>(
  data: T[]
): Promise<T[]>
export async function processNestedProductImages<T extends { product?: { images?: string[] | null } }>(
  data: T | T[]
): Promise<T | T[]> {
  if (Array.isArray(data)) {
    return Promise.all(
      data.map(async (item) => {
        if (item.product) {
          item.product = await processSingleProduct(item.product)
        }
        return item
      })
    )
  }

  if (data.product) {
    data.product = await processSingleProduct(data.product)
  }
  return data
}
