import type { Express, Request, Response } from 'express'
import swaggerUi from 'swagger-ui-express'

// OpenAPI Document
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'KrpoProdaja API',
    version: '1.0.0',
    description: 'Serbian marketplace API for buying and selling second-hand items',
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your ACCESS TOKEN (not ID token or refresh token) obtained from /api/auth/login, /api/auth/register, or /api/auth/refresh',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', description: 'Short-lived token for API access (30 minutes). Use in Authorization header.' },
          idToken: { type: 'string', description: 'Short-lived token containing user identity (30 minutes)' },
          refreshToken: { type: 'string', description: 'Long-lived token to obtain new access/ID tokens (30 days)' },
        },
        required: ['accessToken', 'idToken', 'refreshToken'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          name: { type: 'string' },
          phone: { type: 'string' },
          avatar: { type: 'string', format: 'uri' },
          bio: { type: 'string' },
          location: { type: 'string' },
          verified: { type: 'boolean', description: 'Email verification status' },
          phoneVerified: { type: 'boolean', description: 'Phone verification status' },
          verifiedSeller: { type: 'boolean', description: 'Verified seller badge (requires both email and phone verification)' },
          responseTime: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'integer' },
          originalPrice: { type: 'integer' },
          images: { type: 'array', items: { type: 'string', format: 'uri' } },
          size: { type: 'string' },
          condition: { type: 'string', enum: ['new', 'very-good', 'good', 'satisfactory'] },
          brand: { type: 'string' },
          color: { type: 'string' },
          material: { type: 'string' },
          location: { type: 'string' },
          status: { type: 'string', enum: ['active', 'reserved', 'sold', 'deleted'] },
          viewCount: { type: 'integer' },
          favoriteCount: { type: 'integer' },
          categoryId: { type: 'string', format: 'uuid' },
          sellerId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          icon: { type: 'string' },
          productCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Brand: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
        },
      },
      City: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'City name' },
          population: { type: 'integer', description: 'City population' },
          latitude: { type: 'number', format: 'float', description: 'Latitude coordinate' },
          longitude: { type: 'number', format: 'float', description: 'Longitude coordinate' },
          adminName: { type: 'string', description: 'Region/Province name' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      ImageUploadResult: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri', description: 'S3 URL of the uploaded image' },
          key: { type: 'string', description: 'S3 object key' },
          size: { type: 'integer', description: 'File size in bytes' },
          width: { type: 'integer', description: 'Image width in pixels' },
          height: { type: 'integer', description: 'Image height in pixels' },
        },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Create a new user account with email and password. A verification email will be sent. Users must verify their email before logging in.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 8, format: 'password', example: 'SecurePass123' },
                  firstName: { type: 'string', example: 'John' },
                  lastName: { type: 'string', example: 'Doe' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User successfully registered - verification email sent',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Registration successful. Please check your email to verify your account.' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input or user already exists',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Authenticate user and receive JWT tokens. Users must verify their email before logging in.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', format: 'password', example: 'SecurePass123' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successfully authenticated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Login successful' },
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string', description: 'Access token for API requests (30 min)' },
                    idToken: { type: 'string', description: 'ID token with user info (30 min)' },
                    refreshToken: { type: 'string', description: 'Refresh token for getting new tokens (30 days)' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '403': {
            description: 'Email not verified',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'Please verify your email address before logging in. Check your inbox for the verification link.' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access and ID tokens',
        description: 'Use a valid refresh token to obtain new access and ID tokens. This allows users to stay authenticated without re-entering credentials.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', description: 'Valid refresh token from login/register' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tokens refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Tokens refreshed successfully' },
                    accessToken: { type: 'string', description: 'New access token (30 min)' },
                    idToken: { type: 'string', description: 'New ID token (30 min)' },
                    refreshToken: { type: 'string', description: 'New refresh token (30 days)' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Refresh token required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '403': {
            description: 'Invalid or expired refresh token',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'User not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/revoke': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke all tokens (logout)',
        description: 'Revoke all tokens for the current user. After revocation, all existing access, ID, and refresh tokens will be invalid. The user must login again to get new tokens. Useful for logout functionality or security purposes.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Tokens revoked successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'All tokens have been revoked successfully. Please login again.' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Not authenticated or token already revoked',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/verify': {
      get: {
        tags: ['Authentication'],
        summary: 'Verify access token',
        description: 'Verify that the provided access token is valid and not expired. Used by the Next.js middleware to validate user sessions. Only accepts access tokens (not ID or refresh tokens).',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token is valid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    valid: { type: 'boolean', example: true },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Access token required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '403': {
            description: 'Invalid or expired token',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/google': {
      post: {
        tags: ['Authentication'],
        summary: 'Google OAuth sign-in',
        description: 'Authenticate or register a user using Google OAuth. If a user with the same email exists, the Google account will be linked. If not, a new user will be created.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: {
                    type: 'string',
                    description: 'Google ID token obtained from Google Sign-In',
                    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ...',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful - existing user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Login successful' },
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string', description: 'Access token for API requests (30 min)' },
                    idToken: { type: 'string', description: 'ID token with user info (30 min)' },
                    refreshToken: { type: 'string', description: 'Refresh token for getting new tokens (30 days)' },
                  },
                },
              },
            },
          },
          '201': {
            description: 'User created successfully - new user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'User created successfully' },
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string', description: 'Access token for API requests (30 min)' },
                    idToken: { type: 'string', description: 'ID token with user info (30 min)' },
                    refreshToken: { type: 'string', description: 'Refresh token for getting new tokens (30 days)' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Google token is required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Failed to authenticate with Google',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/facebook': {
      post: {
        tags: ['Authentication'],
        summary: 'Facebook OAuth sign-in',
        description: 'Authenticate or register a user using Facebook OAuth. If a user with the same email exists, the Facebook account will be linked. If not, a new user will be created.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['accessToken'],
                properties: {
                  accessToken: {
                    type: 'string',
                    description: 'Facebook access token obtained from Facebook Login',
                    example: 'EAABwzLixnjYBO...',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful - existing user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Login successful' },
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string', description: 'Access token for API requests (30 min)' },
                    idToken: { type: 'string', description: 'ID token with user info (30 min)' },
                    refreshToken: { type: 'string', description: 'Refresh token for getting new tokens (30 days)' },
                  },
                },
              },
            },
          },
          '201': {
            description: 'User created successfully - new user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'User created successfully' },
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string', description: 'Access token for API requests (30 min)' },
                    idToken: { type: 'string', description: 'ID token with user info (30 min)' },
                    refreshToken: { type: 'string', description: 'Refresh token for getting new tokens (30 days)' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Facebook access token is required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Failed to authenticate with Facebook',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/request-password-reset': {
      post: {
        tags: ['Authentication'],
        summary: 'Request password reset',
        description: 'Request a password reset email. An email with a reset link will be sent if the account exists. Always returns success to prevent email enumeration. OAuth-only users (without passwords) will not receive emails.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'Email address of the account',
                    example: 'user@example.com',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Request processed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'If an account with that email exists, a password reset link has been sent.',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Email is required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Failed to send password reset email',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset password with token',
        description: 'Reset user password using the token received via email. The token is valid for 1 hour (configurable). After successful reset, all existing tokens are revoked and the user must login again.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                  token: {
                    type: 'string',
                    description: 'Reset token from email link',
                    example: 'a1b2c3d4e5f6...',
                  },
                  newPassword: {
                    type: 'string',
                    format: 'password',
                    minLength: 8,
                    description: 'New password (minimum 8 characters)',
                    example: 'NewSecurePass123!',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'Password has been reset successfully. Please login with your new password.',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request - token/password missing, password too short, or token invalid/expired',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Failed to reset password',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/send-verification-email': {
      post: {
        tags: ['Authentication'],
        summary: 'Send or resend email verification',
        description: 'Send a verification email to the user. Use this to resend verification emails if the user did not receive the initial one. Always returns success to prevent email enumeration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'Email address to send verification to',
                    example: 'user@example.com',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification email sent (or user already verified)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'Verification email has been sent.',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Email is required or email is already verified',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Failed to send verification email',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/verify-email': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify email with token',
        description: 'Verify user email using the token received via email. After successful verification, the user is automatically logged in and receives authentication tokens. The token is valid for 24 hours (configurable).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: {
                    type: 'string',
                    description: 'Verification token from email link',
                    example: 'a1b2c3d4e5f6...',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email verified successfully - user logged in',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'Email verified successfully. You are now logged in.',
                    },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        verified: { type: 'boolean', example: true },
                      },
                    },
                    accessToken: { type: 'string', description: 'Access token for API requests (30 min)' },
                    idToken: { type: 'string', description: 'ID token with user info (30 min)' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request - token missing, invalid/expired, or email already verified',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Failed to verify email',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Get current user profile',
        description: 'Retrieve the authenticated user profile information',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Invalid or missing token',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'User not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  firstName: { type: 'string', maxLength: 50 },
                  lastName: { type: 'string', maxLength: 50 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          '400': {
            description: 'Invalid input',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/users/password': {
      put: {
        tags: ['Users'],
        summary: 'Change user password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', format: 'password' },
                  newPassword: { type: 'string', minLength: 8, format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password changed successfully',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string' } } },
              },
            },
          },
          '400': {
            description: 'Invalid input',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/users/phone/send-verification': {
      post: {
        tags: ['Users', 'Phone Verification'],
        summary: 'Send phone verification SMS',
        description: 'Add or update phone number and send a 6-digit verification code via SMS. The code expires in 10 minutes. Rate limited to 5 requests per hour.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone'],
                properties: {
                  phone: {
                    type: 'string',
                    pattern: '^\\+?[1-9]\\d{1,14}$',
                    description: 'Phone number in E.164 format',
                    example: '+381601234567',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification code sent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Verification code sent successfully. Please check your phone.' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid phone number format or phone already registered to another account',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Unauthorized - Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '429': {
            description: 'Too many requests - Rate limit exceeded',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Failed to send verification SMS',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/users/phone/verify': {
      post: {
        tags: ['Users', 'Phone Verification'],
        summary: 'Verify phone with code',
        description: 'Verify the phone number using the 6-digit code received via SMS. Upon successful verification, user becomes a verified seller if email is also verified.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: {
                    type: 'string',
                    minLength: 6,
                    maxLength: 6,
                    pattern: '^[0-9]{6}$',
                    description: '6-digit verification code',
                    example: '123456',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Phone verified successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Phone number verified successfully.' },
                    phoneVerified: { type: 'boolean', example: true },
                    verifiedSeller: { type: 'boolean', example: true, description: 'True if both email and phone are verified' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid or expired verification code',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Unauthorized - Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '429': {
            description: 'Too many requests - Rate limit exceeded',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/users/phone/resend-verification': {
      post: {
        tags: ['Users', 'Phone Verification'],
        summary: 'Resend phone verification SMS',
        description: 'Resend the verification code to the phone number already on file. Use this if the previous code expired or was not received.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Verification code resent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Verification code resent successfully. Please check your phone.' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'No phone number on file or phone already verified',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Unauthorized - Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '429': {
            description: 'Too many requests - Rate limit exceeded',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Failed to send verification SMS',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'List products with filters and pagination',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'priceMin', in: 'query', schema: { type: 'integer' } },
          { name: 'priceMax', in: 'query', schema: { type: 'integer' } },
          { name: 'size', in: 'query', schema: { type: 'string', enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] } },
          { name: 'condition', in: 'query', schema: { type: 'string', enum: ['new', 'very-good', 'good', 'satisfactory'] } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'color', in: 'query', schema: { type: 'string' } },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'reserved', 'sold', 'deleted'], default: 'active' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'price-low', 'price-high', 'popular'], default: 'newest' } },
        ],
        responses: {
          '200': {
            description: 'Products retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a new product listing',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'price', 'categoryId', 'images'],
                properties: {
                  title: { type: 'string', minLength: 10, maxLength: 100, example: 'Nike Air Max 90 - Barely Used' },
                  description: { type: 'string' },
                  price: { type: 'integer', minimum: 0, example: 5000 },
                  originalPrice: { type: 'integer', minimum: 0 },
                  images: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'string', format: 'uri' } },
                  size: { type: 'string', enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
                  condition: { type: 'string', enum: ['new', 'very-good', 'good', 'satisfactory'] },
                  brand: { type: 'string' },
                  color: { type: 'string' },
                  material: { type: 'string' },
                  location: { type: 'string' },
                  categoryId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Product created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          '400': {
            description: 'Invalid input',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Product retrieved successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          '404': {
            description: 'Product not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Update product listing',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', minLength: 10, maxLength: 100 },
                  description: { type: 'string' },
                  price: { type: 'integer', minimum: 0 },
                  images: { type: 'array', items: { type: 'string', format: 'uri' } },
                  condition: { type: 'string', enum: ['new', 'very-good', 'good', 'satisfactory'] },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Product updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          '403': {
            description: 'Forbidden - Not the product owner',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product listing',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Product deleted successfully',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Get all categories',
        responses: {
          '200': {
            description: 'Categories retrieved successfully',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
              },
            },
          },
        },
      },
    },
    '/api/brands': {
      get: {
        tags: ['Brands'],
        summary: 'Get all brands',
        description: 'Retrieve all available brands sorted alphabetically. This endpoint is used to populate brand dropdowns in the frontend.',
        responses: {
          '200': {
            description: 'Brands retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    brands: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Brand' },
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/favorites': {
      get: {
        tags: ['Favorites'],
        summary: 'Get user favorites',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Favorites retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { type: 'object' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/favorites/{productId}': {
      post: {
        tags: ['Favorites'],
        summary: 'Add product to favorites',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '201': {
            description: 'Product added to favorites',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
      delete: {
        tags: ['Favorites'],
        summary: 'Remove product from favorites',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Product removed from favorites',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
    '/api/search': {
      get: {
        tags: ['Search'],
        summary: 'Search products',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/upload/image': {
      post: {
        tags: ['Image Upload'],
        summary: 'Upload a single image to S3',
        description: 'Upload a single image file to AWS S3 with automatic optimization (resize, compress, format conversion). Requires authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'folder', in: 'query', schema: { type: 'string', default: 'products' }, description: 'S3 folder path' },
          { name: 'maxWidth', in: 'query', schema: { type: 'integer', default: 1920 }, description: 'Maximum width in pixels' },
          { name: 'maxHeight', in: 'query', schema: { type: 'integer', default: 1920 }, description: 'Maximum height in pixels' },
          { name: 'quality', in: 'query', schema: { type: 'integer', default: 85, minimum: 1, maximum: 100 }, description: 'Image quality (1-100)' },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['jpeg', 'png', 'webp'], default: 'webp' }, description: 'Output format' },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file (JPEG, PNG, or WebP, max 5MB)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Image uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ImageUploadResult' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid file or file too large',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Unauthorized - Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Server error during upload',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/upload/images': {
      post: {
        tags: ['Image Upload'],
        summary: 'Upload multiple images to S3',
        description: 'Upload multiple image files to AWS S3 with automatic optimization. Maximum 10 images per request. Requires authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'folder', in: 'query', schema: { type: 'string', default: 'products' }, description: 'S3 folder path' },
          { name: 'maxWidth', in: 'query', schema: { type: 'integer', default: 1920 }, description: 'Maximum width in pixels' },
          { name: 'maxHeight', in: 'query', schema: { type: 'integer', default: 1920 }, description: 'Maximum height in pixels' },
          { name: 'quality', in: 'query', schema: { type: 'integer', default: 85, minimum: 1, maximum: 100 }, description: 'Image quality (1-100)' },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['jpeg', 'png', 'webp'], default: 'webp' }, description: 'Output format' },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['images'],
                properties: {
                  images: {
                    type: 'array',
                    items: {
                      type: 'string',
                      format: 'binary',
                    },
                    description: 'Image files (JPEG, PNG, or WebP, max 5MB each, max 10 files)',
                    maxItems: 10,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Images uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ImageUploadResult' },
                    },
                    count: { type: 'integer', description: 'Number of images uploaded' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid files, too large, or too many files',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Unauthorized - Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Server error during upload',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/upload/image/{key}': {
      delete: {
        tags: ['Image Upload'],
        summary: 'Delete a single image from S3',
        description: 'Delete an image from S3 by its key. The key should be URL encoded. Requires authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'S3 object key (URL encoded), e.g., products/image.webp',
            example: 'products%2Fimage.webp',
          },
        ],
        responses: {
          '200': {
            description: 'Image deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Image deleted successfully' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid key',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Unauthorized - Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Server error during deletion',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/upload/images': {
      delete: {
        tags: ['Image Upload'],
        summary: 'Delete multiple images from S3',
        description: 'Delete multiple images from S3 by their keys or URLs. Requires authentication.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  keys: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of S3 object keys',
                    example: ['products/image1.webp', 'products/image2.webp'],
                  },
                  urls: {
                    type: 'array',
                    items: { type: 'string', format: 'uri' },
                    description: 'Array of S3 URLs',
                    example: [
                      'https://krpoprodaja-images.s3.eu-central-1.amazonaws.com/products/image1.webp',
                      'https://krpoprodaja-images.s3.eu-central-1.amazonaws.com/products/image2.webp',
                    ],
                  },
                },
                description: 'Provide either keys or urls array (not both)',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Images deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: '2 images deleted successfully' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid or missing keys/urls',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Unauthorized - Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Server error during deletion',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/upload/extract-key': {
      get: {
        tags: ['Image Upload'],
        summary: 'Extract S3 key from URL',
        description: 'Extract the S3 object key from a full S3 URL. Useful for getting the key to delete an image. Public endpoint.',
        parameters: [
          {
            name: 'url',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uri' },
            description: 'S3 URL to extract key from',
            example: 'https://krpoprodaja-images.s3.eu-central-1.amazonaws.com/products/image.webp',
          },
        ],
        responses: {
          '200': {
            description: 'Key extracted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    key: { type: 'string', example: 'products/image.webp' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid URL or URL parameter missing',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/cities/serbia': {
      get: {
        tags: ['Cities'],
        summary: 'Get Serbian cities',
        description: 'Retrieve cities from Serbia with optional filtering by population or search term. Results are cached for 24 hours for better performance.',
        parameters: [
          {
            name: 'minPopulation',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Filter cities by minimum population',
            example: 100000
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search cities by name (case-insensitive)',
            example: 'Beograd'
          },
        ],
        responses: {
          '200': {
            description: 'Cities retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    country: { type: 'string', example: 'RS' },
                    countryName: { type: 'string', example: 'Serbia' },
                    count: { type: 'integer', example: 7 },
                    cities: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/City' },
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Failed to fetch cities',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/cities/{countryCode}': {
      get: {
        tags: ['Cities'],
        summary: 'Get cities by country code',
        description: 'Retrieve cities from any country using ISO 3166-1 alpha-2 country code (e.g., RS for Serbia, US for United States). Results are cached for 24 hours.',
        parameters: [
          {
            name: 'countryCode',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[A-Z]{2}$' },
            description: '2-letter ISO country code (e.g., RS, US, GB)',
            example: 'RS'
          },
          {
            name: 'minPopulation',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Filter cities by minimum population',
            example: 50000
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search cities by name (case-insensitive)',
            example: 'New'
          },
        ],
        responses: {
          '200': {
            description: 'Cities retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    country: { type: 'string', example: 'RS' },
                    count: { type: 'integer', example: 250 },
                    cities: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/City' },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid country code format',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: 'Failed to fetch cities',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/cities/cache/{countryCode}': {
      delete: {
        tags: ['Cities'],
        summary: 'Clear cities cache for specific country',
        description: 'Clear the cached cities data for a specific country. Useful for forcing a refresh of city data.',
        parameters: [
          {
            name: 'countryCode',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[A-Z]{2}$' },
            description: '2-letter ISO country code',
            example: 'RS'
          },
        ],
        responses: {
          '200': {
            description: 'Cache cleared successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Cache cleared for RS' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Failed to clear cache',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/cities/cache': {
      delete: {
        tags: ['Cities'],
        summary: 'Clear all cities cache',
        description: 'Clear the cached cities data for all countries. Useful for forcing a complete refresh.',
        responses: {
          '200': {
            description: 'Cache cleared successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'All cache cleared' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Failed to clear cache',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
}

export function setupSwagger(app: Express) {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'KrpoProdaja API Docs',
  }))

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerDocument)
  })
}
