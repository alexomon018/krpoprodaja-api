import { Router } from "express";
import {
  uploadSingleImage as uploadSingleImageController,
  uploadImages as uploadImagesController,
  deleteSingleImage,
  deleteImages,
  extractKey,
} from "../controllers/uploadController";
import {
  uploadSingleImage,
  uploadMultipleImages,
  handleMulterError,
} from "../middleware/uploadMiddleware";
import { authenticateToken } from "../middleware/auth";

const router = Router();

/**
 * @route POST /api/upload/image
 * @desc Upload a single image to S3
 * @access Private (requires authentication)
 * @query folder - Optional folder path in S3 (default: 'products')
 * @query maxWidth - Optional max width for resizing (default: 1920)
 * @query maxHeight - Optional max height for resizing (default: 1920)
 * @query quality - Optional image quality 1-100 (default: 85)
 * @query format - Optional output format: jpeg, png, webp (default: webp)
 */
router.post(
  "/image",
  authenticateToken,
  (req, res, next) => {
    uploadSingleImage(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadSingleImageController
);

/**
 * @route POST /api/upload/images
 * @desc Upload multiple images to S3
 * @access Private (requires authentication)
 * @query folder - Optional folder path in S3 (default: 'products')
 * @query maxWidth - Optional max width for resizing (default: 1920)
 * @query maxHeight - Optional max height for resizing (default: 1920)
 * @query quality - Optional image quality 1-100 (default: 85)
 * @query format - Optional output format: jpeg, png, webp (default: webp)
 */
router.post(
  "/images",
  authenticateToken,
  (req, res, next) => {
    uploadMultipleImages(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadImagesController
);

/**
 * @route DELETE /api/upload/image/:key
 * @desc Delete a single image from S3 by key
 * @access Private (requires authentication)
 * @param key - S3 object key (URL encoded)
 */
router.delete("/image/:key(*)", authenticateToken, deleteSingleImage);

/**
 * @route DELETE /api/upload/images
 * @desc Delete multiple images from S3
 * @access Private (requires authentication)
 * @body { keys: string[] } or { urls: string[] }
 */
router.delete("/images", authenticateToken, deleteImages);

/**
 * @route GET /api/upload/extract-key
 * @desc Extract S3 key from URL
 * @access Public
 * @query url - S3 URL to extract key from
 */
router.get("/extract-key", extractKey);

export default router;
