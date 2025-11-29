import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { env } from "../../env.ts";

// Initialize S3 client with validated env
const createS3Client = () => {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.");
  }

  return new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

let s3Client: S3Client;
try {
  s3Client = createS3Client();
} catch (error) {
  console.error("Failed to initialize S3 client:", error);
  // Re-throw to prevent app startup with misconfigured S3
  throw error;
}

// S3 configuration constants from validated env
const BUCKET_NAME = env.S3_BUCKET_NAME;
const MAX_IMAGE_SIZE = env.MAX_IMAGE_SIZE;

/**
 * Custom error types for S3 operations
 */
export class S3ServiceError extends Error {
  originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = "S3ServiceError";
    this.originalError = originalError;
  }
}

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export interface ImageUploadResult {
  url: string;
  key: string;
  size: number;
  width: number;
  height: number;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

/**
 * Upload an image to S3 with optional processing
 * @param buffer - Image buffer
 * @param mimeType - MIME type of the image
 * @param folder - Optional folder path in S3 (e.g., 'products', 'avatars')
 * @param options - Image processing options
 * @returns Upload result with URL and metadata
 */
export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  folder: string = "products",
  options: ImageProcessingOptions = {}
): Promise<ImageUploadResult> {
  try {
    // Default processing options
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 85,
      format = "webp",
    } = options;

    // Process image with sharp
    const processedImage = sharp(buffer);
    const metadata = await processedImage.metadata();

    // Resize if image is too large
    let finalImage = processedImage;
    if (
      metadata.width &&
      metadata.height &&
      (metadata.width > maxWidth || metadata.height > maxHeight)
    ) {
      finalImage = processedImage.resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to specified format
    let finalBuffer: Buffer;
    let contentType: string;
    let extension: string;

    switch (format) {
      case "jpeg":
        finalBuffer = await finalImage.jpeg({ quality }).toBuffer();
        contentType = "image/jpeg";
        extension = "jpg";
        break;
      case "png":
        finalBuffer = await finalImage.png({ quality }).toBuffer();
        contentType = "image/png";
        extension = "png";
        break;
      case "webp":
      default:
        finalBuffer = await finalImage.webp({ quality }).toBuffer();
        contentType = "image/webp";
        extension = "webp";
        break;
    }

    // Check processed image size
    if (finalBuffer.length > MAX_IMAGE_SIZE) {
      throw new ImageValidationError(
        `Image size (${(finalBuffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(MAX_IMAGE_SIZE / 1024 / 1024).toFixed(2)}MB)`
      );
    }

    // Get final dimensions
    const finalMetadata = await sharp(finalBuffer).metadata();

    // Generate unique filename
    const filename = `${uuidv4()}.${extension}`;
    const key = folder ? `${folder}/${filename}` : filename;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: finalBuffer,
      ContentType: contentType,
      CacheControl: "max-age=31536000", // Cache for 1 year
      Metadata: {
        originalMimeType: mimeType,
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    // Generate presigned URL for private bucket access
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Generate presigned URL that expires in 7 days (604800 seconds)
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 });

    return {
      url,
      key,
      size: finalBuffer.length,
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
    };
  } catch (error) {
    // Re-throw validation errors as-is
    if (error instanceof ImageValidationError) {
      throw error;
    }

    // Wrap other errors in S3ServiceError
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error uploading image to S3:", error);
    throw new S3ServiceError(`Failed to upload image: ${errorMessage}`, error);
  }
}

/**
 * Upload multiple images to S3
 * @param files - Array of file buffers with metadata
 * @param folder - Optional folder path in S3
 * @param options - Image processing options
 * @returns Array of upload results
 */
export async function uploadMultipleImages(
  files: Array<{ buffer: Buffer; mimeType: string }>,
  folder: string = "products",
  options: ImageProcessingOptions = {}
): Promise<ImageUploadResult[]> {
  const uploadPromises = files.map((file) =>
    uploadImage(file.buffer, file.mimeType, folder, options)
  );

  return Promise.all(uploadPromises);
}

/**
 * Delete an image from S3 by key
 * @param key - S3 object key
 */
export async function deleteImage(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`Successfully deleted image: ${key}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error deleting image from S3:", error);
    throw new S3ServiceError(`Failed to delete image: ${errorMessage}`, error);
  }
}

/**
 * Delete multiple images from S3
 * @param keys - Array of S3 object keys
 */
export async function deleteMultipleImages(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  try {
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: true,
      },
    });

    await s3Client.send(command);
    console.log(`Successfully deleted ${keys.length} images`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error deleting multiple images from S3:", error);
    throw new S3ServiceError(`Failed to delete images: ${errorMessage}`, error);
  }
}

/**
 * Extract S3 key from URL
 * @param url - Full S3 URL
 * @returns S3 key or null if invalid
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Handle both path-style and virtual-hosted-style URLs
    // Path-style: https://s3.region.amazonaws.com/bucket/key
    // Virtual-hosted-style: https://bucket.s3.region.amazonaws.com/key
    const pathname = urlObj.pathname;

    if (pathname.startsWith(`/${BUCKET_NAME}/`)) {
      // Path-style URL
      return pathname.substring(`/${BUCKET_NAME}/`.length);
    } else if (pathname.startsWith("/")) {
      // Virtual-hosted-style URL
      return pathname.substring(1);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Delete images by URLs (extracts keys and deletes)
 * @param urls - Array of S3 URLs
 */
export async function deleteImagesByUrls(urls: string[]): Promise<void> {
  const keys = urls
    .map(extractKeyFromUrl)
    .filter((key): key is string => key !== null);

  if (keys.length > 0) {
    await deleteMultipleImages(keys);
  }
}

/**
 * Generate a presigned URL for temporary access to a private object
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 7 days)
 * @returns Presigned URL
 */
export async function generatePresignedUrl(
  key: string,
  expiresIn: number = 604800 // 7 days default
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating presigned URL:", error);
    throw new S3ServiceError(`Failed to generate presigned URL: ${errorMessage}`, error);
  }
}

/**
 * Generate presigned URLs for multiple S3 keys
 * @param keys - Array of S3 object keys
 * @param expiresIn - URL expiration time in seconds (default: 7 days)
 * @returns Array of presigned URLs
 */
export async function generatePresignedUrls(
  keys: string[],
  expiresIn: number = 604800
): Promise<string[]> {
  const urlPromises = keys.map((key) => generatePresignedUrl(key, expiresIn));
  return Promise.all(urlPromises);
}

/**
 * Check if a string is an S3 key (not a full URL)
 * @param str - String to check
 * @returns True if it's a key, false if it's a URL
 */
export function isS3Key(str: string): boolean {
  return !str.startsWith("http://") && !str.startsWith("https://");
}

/**
 * Check if an image exists in S3
 * @param key - S3 object key
 * @returns True if image exists, false otherwise
 */
export async function imageExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate image file
 * @param buffer - File buffer
 * @param mimeType - MIME type
 * @param maxSize - Maximum file size in bytes
 * @throws Error if validation fails
 */
export function validateImage(
  buffer: Buffer,
  mimeType: string,
  maxSize: number = MAX_IMAGE_SIZE
): void {
  // Check MIME type using validated env
  const allowedTypes = env.ALLOWED_IMAGE_TYPES;

  if (!allowedTypes.includes(mimeType)) {
    throw new ImageValidationError(
      `Invalid image type. Allowed types: ${allowedTypes.join(", ")}`
    );
  }

  // Check file size
  if (buffer.length > maxSize) {
    throw new ImageValidationError(
      `Image size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`
    );
  }
}
