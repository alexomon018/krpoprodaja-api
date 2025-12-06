import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import { db } from "../db/connection.ts";
import { users, products } from "../db/schema.ts";
import { eq, and, sql, desc, asc, gte, lte, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import { processProductImages } from "../utils/imageProcessor.ts";
import {
  generateVerificationCode,
  sendPhoneVerificationSMS,
} from "../services/snsService.ts";
import { parseTokenExpiryToMs } from "../utils/jwt.ts";
import { env } from "../../env.ts";

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        name: users.name,
        phone: users.phone,
        avatar: users.avatar,
        bio: users.bio,
        location: users.location,
        verified: users.verified,
        phoneVerified: users.phoneVerified,
        verifiedSeller: users.verifiedSeller,
        responseTime: users.responseTime,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const getPublicProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        name: users.name,
        avatar: users.avatar,
        bio: users.bio,
        location: users.location,
        verified: users.verified,
        verifiedSeller: users.verifiedSeller,
        responseTime: users.responseTime,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get count of active listings
    const [activeListings] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.sellerId, userId), eq(products.status, "active")));

    // Get count of sold items
    const [soldItems] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.sellerId, userId), eq(products.status, "sold")));

    const userWithStats = {
      ...user,
      activeListings: activeListings?.count || 0,
      soldItems: soldItems?.count || 0,
    };

    console.log("user", userWithStats);
    res.json({ user: userWithStats });
  } catch (error) {
    console.error("Get public profile error:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    const { email, firstName, lastName } = req.body;

    const [updatedUser] = await db
      .update(users)
      .set({
        email,
        firstName,
        lastName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        updatedAt: users.updatedAt,
      });

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    // Get current user with password
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isValidPassword) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db
      .update(users)
      .set({
        password: hashedNewPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
};

export const sendPhoneVerification = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        error:
          "Invalid phone number format. Please use E.164 format (e.g., +381601234567)",
      });
    }

    // Get user to check current state
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent changing phone number if already verified
    if (user.phoneVerified) {
      return res.status(400).json({
        error:
          "Phone number is already verified and cannot be changed. Please contact support if you need to update your phone number.",
      });
    }

    // Check if this phone number is already verified for another user
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, phone));

    if (existingUser && existingUser.id !== userId) {
      // Check if the existing user has verified this phone
      const [existingVerified] = await db
        .select({ phoneVerified: users.phoneVerified })
        .from(users)
        .where(eq(users.id, existingUser.id));

      if (existingVerified?.phoneVerified) {
        return res.status(400).json({
          error: "This phone number is already registered to another account",
        });
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Calculate expiry time
    const expiryMs = parseTokenExpiryToMs(
      env.PHONE_VERIFICATION_CODE_EXPIRES_IN
    );
    const expiresAt = new Date(Date.now() + expiryMs);

    // Update user with phone number and verification code
    await db
      .update(users)
      .set({
        phone,
        phoneVerificationCode: verificationCode,
        phoneVerificationExpiresAt: expiresAt,
        phoneVerified: false, // Reset verification status when phone changes
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Send SMS with verification code
    try {
      await sendPhoneVerificationSMS(phone, verificationCode);
      console.log(`Phone verification SMS sent to: ${phone}`);
    } catch (smsError) {
      console.error("Failed to send verification SMS:", smsError);
      // Clear the verification code if SMS fails
      await db
        .update(users)
        .set({
          phoneVerificationCode: null,
          phoneVerificationExpiresAt: null,
        })
        .where(eq(users.id, userId));

      return res.status(500).json({ error: "Failed to send verification SMS" });
    }

    res.json({
      message: "Verification code sent successfully. Please check your phone.",
    });
  } catch (error) {
    console.error("Send phone verification error:", error);
    res.status(500).json({ error: "Failed to send phone verification" });
  }
};

export const verifyPhone = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Verification code is required" });
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if there's a pending verification
    if (!user.phoneVerificationCode || !user.phoneVerificationExpiresAt) {
      return res.status(400).json({
        error: "No pending phone verification. Please request a new code.",
      });
    }

    // Check if code has expired
    if (user.phoneVerificationExpiresAt < new Date()) {
      // Clear expired code
      await db
        .update(users)
        .set({
          phoneVerificationCode: null,
          phoneVerificationExpiresAt: null,
        })
        .where(eq(users.id, userId));

      return res.status(400).json({
        error: "Verification code has expired. Please request a new code.",
      });
    }

    // Verify the code
    if (user.phoneVerificationCode !== code) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    // Mark phone as verified, update verifiedSeller status, and clear verification code
    const shouldBeVerifiedSeller = user.verified; // User becomes verified seller if email is also verified

    await db
      .update(users)
      .set({
        phoneVerified: true,
        verifiedSeller: shouldBeVerifiedSeller,
        phoneVerificationCode: null,
        phoneVerificationExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`Phone verified successfully for user: ${user.email}`);

    res.json({
      message: "Phone number verified successfully.",
      phoneVerified: true,
      verifiedSeller: shouldBeVerifiedSeller,
    });
  } catch (error) {
    console.error("Verify phone error:", error);
    res.status(500).json({ error: "Failed to verify phone" });
  }
};

export const resendPhoneVerification = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user!.id;

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has a phone number
    if (!user.phone) {
      return res.status(400).json({
        error: "No phone number on file. Please add a phone number first.",
      });
    }

    // Check if phone is already verified
    if (user.phoneVerified) {
      return res
        .status(400)
        .json({ error: "Phone number is already verified" });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();

    // Calculate expiry time
    const expiryMs = parseTokenExpiryToMs(
      env.PHONE_VERIFICATION_CODE_EXPIRES_IN
    );
    const expiresAt = new Date(Date.now() + expiryMs);

    // Update user with new verification code
    await db
      .update(users)
      .set({
        phoneVerificationCode: verificationCode,
        phoneVerificationExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Send SMS with verification code
    try {
      await sendPhoneVerificationSMS(user.phone, verificationCode);
      console.log(`Phone verification SMS resent to: ${user.phone}`);
    } catch (smsError) {
      console.error("Failed to resend verification SMS:", smsError);
      return res.status(500).json({ error: "Failed to send verification SMS" });
    }

    res.json({
      message:
        "Verification code resent successfully. Please check your phone.",
    });
  } catch (error) {
    console.error("Resend phone verification error:", error);
    res.status(500).json({ error: "Failed to resend phone verification" });
  }
};

/**
 * Get a user's products with filtering and pagination
 * GET /api/users/:userId/products
 */
export const getUserProducts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const {
      page = "1",
      limit = "20",
      status = "active",
      categoryId,
      minPrice,
      maxPrice,
      condition,
      sortBy = "newest",
    } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [eq(products.sellerId, userId)];

    console.log("Fetching products for userId:", userId);
    console.log("Status filter:", status);

    // Status filter (active|reserved|sold|deleted|all)
    if (status === "all") {
      conditions.push(inArray(products.status, ["active", "reserved", "sold"]));
    } else {
      conditions.push(eq(products.status, status as string));
    }

    // Category filter
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId as string));
    }

    // Price range filter
    if (minPrice) {
      conditions.push(gte(products.price, parseInt(minPrice as string, 10)));
    }
    if (maxPrice) {
      conditions.push(lte(products.price, parseInt(maxPrice as string, 10)));
    }

    // Condition filter (new|very-good|good|satisfactory - can be multiple)
    if (condition) {
      const conditionsArr = Array.isArray(condition) ? condition : [condition];
      conditions.push(inArray(products.condition, conditionsArr as string[]));
    }

    // Sorting
    let orderBy;
    switch (sortBy) {
      case "oldest":
        orderBy = asc(products.createdAt);
        break;
      case "price-asc":
        orderBy = asc(products.price);
        break;
      case "price-desc":
        orderBy = desc(products.price);
        break;
      case "newest":
      default:
        orderBy = desc(products.createdAt);
        break;
    }

    // Get products
    const productsData = await db
      .select({
        id: products.id,
        title: products.title,
        price: products.price,
        originalPrice: products.originalPrice,
        images: products.images,
        size: products.size,
        condition: products.condition,
        brand: products.brand,
        location: products.location,
        status: products.status,
        viewCount: products.viewCount,
        favoriteCount: products.favoriteCount,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limitNum)
      .offset(offset);

    console.log("Raw products from DB:", productsData.length, "items");

    // Get total count for pagination
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions));

    console.log("Total count:", totalCount);

    // Process product images (convert S3 keys to presigned URLs if needed)
    const processedProducts = await Promise.all(
      productsData.map((product) => processProductImages(product))
    );

    console.log("Processed products:", processedProducts.length, "items");

    return res.json({
      data: processedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: pageNum < Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error("Get user products error:", error);
    return res.status(500).json({ error: "Failed to fetch user products" });
  }
};
