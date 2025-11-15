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
        description: 'Enter your JWT token obtained from /api/auth/login or /api/auth/register',
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
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          name: { type: 'string' },
          phone: { type: 'string' },
          avatar: { type: 'string', format: 'uri' },
          bio: { type: 'string' },
          location: { type: 'string' },
          verified: { type: 'boolean' },
          verifiedSeller: { type: 'boolean' },
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
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Create a new user account with email, username, and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'username', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  username: { type: 'string', minLength: 3, maxLength: 50, example: 'johndoe' },
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
            description: 'User successfully registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string', description: 'JWT authentication token' },
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
        description: 'Authenticate user and receive JWT token',
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
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string', description: 'JWT authentication token' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/verify': {
      get: {
        tags: ['Authentication'],
        summary: 'Verify JWT token',
        description: 'Verify that the provided JWT token is valid and not expired. Used by the Next.js middleware to validate user sessions.',
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
                        username: { type: 'string' },
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
                  username: { type: 'string', minLength: 3, maxLength: 50 },
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
