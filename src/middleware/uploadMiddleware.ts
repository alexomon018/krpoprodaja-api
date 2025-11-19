import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE || "5242880"); // 5MB default
const MAX_IMAGES_PER_PRODUCT = parseInt(
  process.env.MAX_IMAGES_PER_PRODUCT || "10"
);

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter to validate image types
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedTypes =
    process.env.ALLOWED_IMAGE_TYPES?.split(",") || [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Only ${allowedTypes.join(", ")} are allowed.`
      )
    );
  }
};

// Single image upload middleware
export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
}).single("image");

// Multiple images upload middleware (for product images)
export const uploadMultipleImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: MAX_IMAGES_PER_PRODUCT,
  },
}).array("images", MAX_IMAGES_PER_PRODUCT);

// Error handler for multer errors
export const handleMulterError = (
  error: any,
  req: Request,
  res: any,
  next: any
): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: `File size exceeds the maximum limit of ${(MAX_IMAGE_SIZE / 1024 / 1024).toFixed(2)}MB`,
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: `Cannot upload more than ${MAX_IMAGES_PER_PRODUCT} images`,
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Unexpected field in file upload",
      });
    }
    return res.status(400).json({
      error: `Upload error: ${error.message}`,
    });
  }

  if (error) {
    return res.status(400).json({
      error: error.message || "File upload failed",
    });
  }

  next();
};
