# KrpoProdaja API

Serbian Fashion Resale Marketplace API - A RESTful API for buying and selling pre-owned fashion items in Serbia.

## Overview

KrpoProdaja is a modern marketplace API built for Serbian fashion resale. The API powers a Next.js frontend with comprehensive features for product listings, user management, messaging, reviews, and transactions.

### Key Features

- **Product Management**: Create, update, and browse fashion product listings
- **User Authentication**: JWT-based authentication with email verification
- **Search & Discovery**: Full-text search with autocomplete suggestions
- **Favorites**: Save and manage favorite products
- **Categories**: Organized product categorization
- **Reviews & Ratings**: User feedback system (schema ready)
- **Messaging**: Direct messaging between buyers and sellers (schema ready)
- **Offers**: Make and manage purchase offers (schema ready)
- **Transactions**: Purchase and sales tracking (schema ready)

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT (jose library)
- **Password Hashing**: bcrypt
- **Validation**: Zod schemas
- **Testing**: Vitest + Supertest
- **Security**: Helmet & CORS

## Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm or yarn

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd krpoprodaja-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory (or copy from `.env.example`):

```env
# Node Environment
NODE_ENV=development
APP_STAGE=dev

# Server
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/krpoprodaja
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# JWT & Auth
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-at-least-32-characters
REFRESH_TOKEN_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=debug
```

**Important**: Replace `JWT_SECRET` and `REFRESH_TOKEN_SECRET` with secure random strings in production!

### 4. Database Setup

Create a PostgreSQL database:

```bash
createdb krpoprodaja
```

Run migrations:

```bash
npm run db:push
```

Or use migration files:

```bash
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations
```

### 5. Start the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The API will be available at `http://localhost:3000`.

Check the health endpoint: `http://localhost:3000/health`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/me` | Get current user profile | Yes |
| PUT | `/api/me` | Update current user profile | Yes |
| GET | `/api/users/:userId` | Get public user profile | No |
| GET | `/api/users/:userId/products` | Get user's products | No |

### Products

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/products` | List all products (with filters) | No |
| GET | `/api/products/:id` | Get product details | No |
| POST | `/api/products` | Create new product | Yes |
| PUT | `/api/products/:id` | Update product | Yes (Owner) |
| DELETE | `/api/products/:id` | Delete product | Yes (Owner) |
| PATCH | `/api/products/:id/status` | Update product status | Yes (Owner) |
| GET | `/api/products/:id/similar` | Get similar products | No |

### Favorites

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/favorites` | Get user's favorites | Yes |
| POST | `/api/favorites/:productId` | Add to favorites | Yes |
| DELETE | `/api/favorites/:productId` | Remove from favorites | Yes |
| GET | `/api/favorites/check/:productId` | Check if favorited | Yes |

### Categories

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/categories` | List all categories | No |

### Search

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/search` | Search products | No |
| GET | `/api/search/suggestions` | Get autocomplete suggestions | No |

## Query Parameters

### Product Listing (`GET /api/products`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `search` | string | Search query |
| `category` | string | Category ID filter |
| `priceMin` | number | Minimum price (RSD) |
| `priceMax` | number | Maximum price (RSD) |
| `size` | string[] | Size filter (XS, S, M, L, XL, XXL, XXXL) |
| `condition` | string[] | Condition filter (new, very-good, good, satisfactory) |
| `brand` | string | Brand name filter |
| `color` | string | Color filter |
| `location` | string | Location filter |
| `status` | string | Status filter (active, sold, all) |
| `sort` | string | Sort by (newest, oldest, price-low, price-high, popular) |

### Search (`GET /api/search`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (required) |
| `page` | number | Page number |
| `limit` | number | Items per page |

## Data Models

### Product

```typescript
{
  id: string
  title: string
  description?: string
  price: number  // In RSD (Serbian Dinar)
  originalPrice?: number
  images: string[]  // URLs
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'
  condition: 'new' | 'very-good' | 'good' | 'satisfactory'
  brand?: string
  color?: string
  material?: string
  categoryId?: string
  location: string
  status: 'active' | 'reserved' | 'sold' | 'deleted'
  viewCount: number
  favoriteCount: number
  sellerId: string
  createdAt: string
  updatedAt: string
}
```

### User (Public Profile)

```typescript
{
  id: string
  username: string
  name: string
  avatar?: string
  bio?: string
  location?: string
  verified: boolean
  verifiedSeller: boolean
  memberSince: string
  responseTime?: string
}
```

## Database Schema

The API uses the following main tables:

- **users**: User accounts and profiles
- **products**: Product listings
- **categories**: Product categories
- **favorites**: User favorites
- **reviews**: Product reviews (schema ready)
- **conversations**: User conversations (schema ready)
- **messages**: Chat messages (schema ready)
- **offers**: Purchase offers (schema ready)
- **purchases**: Transaction records (schema ready)

## Development

### Database Commands

```bash
npm run db:generate   # Generate migration files from schema changes
npm run db:push       # Push schema changes directly (development)
npm run db:migrate    # Run pending migrations
npm run db:studio     # Open Drizzle Studio (database GUI)
```

### Testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Code Structure

```
src/
├── controllers/      # Request handlers
│   ├── authController.ts
│   ├── userController.ts
│   ├── productController.ts
│   ├── favoriteController.ts
│   ├── categoryController.ts
│   └── searchController.ts
├── routes/          # Route definitions
│   ├── authRoutes.ts
│   ├── userRoutes.ts
│   ├── productRoutes.ts
│   ├── favoriteRoutes.ts
│   ├── categoryRoutes.ts
│   └── searchRoutes.ts
├── middleware/      # Custom middleware
│   ├── auth.ts
│   ├── validation.ts
│   └── errorHandler.ts
├── db/             # Database configuration
│   ├── connection.ts
│   └── schema.ts
├── utils/          # Utility functions
│   ├── jwt.ts
│   └── password.ts
├── server.ts       # Express app setup
└── index.ts        # Entry point
```

## Roadmap

### Phase 1 (Completed)
- [x] User authentication and authorization
- [x] Product CRUD operations
- [x] Search and filtering
- [x] Favorites system
- [x] Category management
- [x] Database schema for all features

### Phase 2 (Next Steps)
- [ ] Reviews and ratings controllers
- [ ] Messaging controllers
- [ ] Offer/negotiation controllers
- [ ] Purchase transaction controllers
- [ ] File upload for product images
- [ ] Email notifications
- [ ] Rate limiting middleware

### Phase 3 (Future)
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Payment integration (Stripe/PayPal)
- [ ] Shipping integration
- [ ] Mobile API optimizations
- [ ] WebSocket for real-time messaging
- [ ] Push notifications

## Security

- Passwords are hashed using bcrypt (12 rounds)
- JWT tokens for stateless authentication
- Input validation using Zod schemas
- SQL injection protection via Drizzle ORM
- CORS configuration
- Helmet for security headers
- Environment variable validation

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "details": {...}  // Optional validation errors
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Example Requests

### Create Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Crna kožna jakna",
    "description": "Kao nova, nošena nekoliko puta",
    "price": 5000,
    "originalPrice": 8000,
    "images": ["https://example.com/image1.jpg"],
    "size": "M",
    "condition": "very-good",
    "brand": "Zara",
    "location": "Beograd"
  }'
```

### Search Products

```bash
curl "http://localhost:3000/api/search?q=jakna&priceMax=6000&size=M"
```

### Add to Favorites

```bash
curl -X POST http://localhost:3000/api/favorites/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Support

For questions or issues, please open a GitHub issue.

---

**Made with ❤️ for the Serbian fashion community**
