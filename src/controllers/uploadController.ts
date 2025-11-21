import type { Request, Response } from "express";
import {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  deleteImagesByUrls,
  extractKeyFromUrl,
  validateImage,
  type ImageProcessingOptions,
} from "../services/s3Service.ts";

/**
 * Upload a single image
 * POST /api/upload/image
 */
export const uploadSingleImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    // Validate image
    validateImage(req.file.buffer, req.file.mimetype);

    // Get folder from query params (default: 'products')
    const folder = (req.query.folder as string) || "products";

    // Get image processing options from query params
    const options: ImageProcessingOptions = {
      maxWidth: req.query.maxWidth
        ? parseInt(req.query.maxWidth as string)
        : undefined,
      maxHeight: req.query.maxHeight
        ? parseInt(req.query.maxHeight as string)
        : undefined,
      quality: req.query.quality
        ? parseInt(req.query.quality as string)
        : undefined,
      format: (req.query.format as "jpeg" | "png" | "webp") || "webp",
    };

    // Upload image
    const result = await uploadImage(
      req.file.buffer,
      req.file.mimetype,
      folder,
      options
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to upload image",
    });
  }
};

/**
 * Upload multiple images
 * POST /api/upload/images
 */
export const uploadImages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({ error: "No image files provided" });
      return;
    }

    // Validate all images
    for (const file of req.files) {
      validateImage(file.buffer, file.mimetype);
    }

    // Get folder from query params (default: 'products')
    const folder = (req.query.folder as string) || "products";

    // Get image processing options from query params
    const options: ImageProcessingOptions = {
      maxWidth: req.query.maxWidth
        ? parseInt(req.query.maxWidth as string)
        : undefined,
      maxHeight: req.query.maxHeight
        ? parseInt(req.query.maxHeight as string)
        : undefined,
      quality: req.query.quality
        ? parseInt(req.query.quality as string)
        : undefined,
      format: (req.query.format as "jpeg" | "png" | "webp") || "webp",
    };

    // Upload images
    const files = req.files.map((file) => ({
      buffer: file.buffer,
      mimeType: file.mimetype,
    }));

    const results = await uploadMultipleImages(files, folder, options);

    res.status(201).json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error uploading images:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to upload images",
    });
  }
};

/**
 * Delete a single image by key
 * DELETE /api/upload/image/:key
 */
export const deleteSingleImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { key } = req.params;

    if (!key) {
      res.status(400).json({ error: "Image key is required" });
      return;
    }

    // Decode the key (it might be URL encoded, including slashes as %2F)
    const decodedKey = decodeURIComponent(key);

    await deleteImage(decodedKey);

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to delete image",
    });
  }
};

/**
 * Delete multiple images by keys or URLs
 * DELETE /api/upload/images
 * Body: { keys: string[] } or { urls: string[] }
 */
export const deleteImages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { keys, urls } = req.body;

    if (!keys && !urls) {
      res.status(400).json({
        error: "Either 'keys' or 'urls' array must be provided",
      });
      return;
    }

    if (keys && Array.isArray(keys) && keys.length > 0) {
      // Delete by keys
      await deleteMultipleImages(keys);
      res.status(200).json({
        success: true,
        message: `${keys.length} images deleted successfully`,
      });
    } else if (urls && Array.isArray(urls) && urls.length > 0) {
      // Delete by URLs
      await deleteImagesByUrls(urls);
      res.status(200).json({
        success: true,
        message: `${urls.length} images deleted successfully`,
      });
    } else {
      res.status(400).json({
        error: "Invalid or empty keys/urls array",
      });
    }
  } catch (error) {
    console.error("Error deleting images:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to delete images",
    });
  }
};

/**
 * Extract S3 key from URL
 * GET /api/upload/extract-key?url=...
 */
export const extractKey = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "URL parameter is required" });
      return;
    }

    const key = extractKeyFromUrl(url);

    if (!key) {
      res.status(400).json({ error: "Invalid S3 URL" });
      return;
    }

    res.status(200).json({
      success: true,
      key,
    });
  } catch (error) {
    console.error("Error extracting key:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to extract key",
    });
  }
};
