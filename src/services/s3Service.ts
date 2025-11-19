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

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "krpoprodaja-images";
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE || "5242880"); // 5MB default

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
      throw new Error(
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

    // Construct public URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "eu-central-1"}.amazonaws.com/${key}`;

    return {
      url,
      key,
      size: finalBuffer.length,
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
    };
  } catch (error) {
    console.error("Error uploading image to S3:", error);
    throw new Error(
      `Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
    console.error("Error deleting image from S3:", error);
    throw new Error(
      `Failed to delete image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
    console.error("Error deleting multiple images from S3:", error);
    throw new Error(
      `Failed to delete images: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned URL
 */
export async function generatePresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error(
      `Failed to generate presigned URL: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
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
  // Check MIME type
  const allowedTypes =
    process.env.ALLOWED_IMAGE_TYPES?.split(",") || [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

  if (!allowedTypes.includes(mimeType)) {
    throw new Error(
      `Invalid image type. Allowed types: ${allowedTypes.join(", ")}`
    );
  }

  // Check file size
  if (buffer.length > maxSize) {
    throw new Error(
      `Image size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`
    );
  }
}
