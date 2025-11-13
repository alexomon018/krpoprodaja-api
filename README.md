# Habit Tracker API - Course Material

## Overview
A comprehensive habit tracking API built with Node.js, Express, PostgreSQL, and Drizzle ORM. This project serves as teaching material for "API Design with Node.js v5" course.

## Tech Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Testing**: Jest & Supertest
- **Security**: Helmet & CORS

## Features

### Day 1 - Foundation
- RESTful API design principles
- Express routing and middleware
- PostgreSQL setup with Drizzle ORM
- CRUD operations for habits
- Error handling middleware
- Request validation with Zod

### Day 2 - Advanced Features
- User authentication (register/login)
- JWT-based authorization
- Protected routes
- Advanced endpoints:
  - **POST /habits/:id/complete** - Mark habit as completed (with duplicate prevention)
  - **GET /habits/:id/stats** - Get habit statistics (streaks, completion percentage)
- Comprehensive testing suite
- Deployment preparation

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login and receive JWT token

### User Management
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password

### Habits (Protected Routes)
- `GET /api/habits` - Get all user habits
- `POST /api/habits` - Create new habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `POST /api/habits/:id/complete` - Mark habit as completed today
- `GET /api/habits/:id/stats` - Get habit statistics

## Data Models

### Users
```typescript
{
  id: uuid (PK)
  email: string (unique)
  username: string (unique)
  password: string (hashed)
  firstName?: string
  lastName?: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Habits
```typescript
{
  id: uuid (PK)
  userId: uuid (FK -> users.id)
  name: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly'
  targetCount: number (default: 1)
  isActive: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Entries (Habit Completions)
```typescript
{
  id: uuid (PK)
  habitId: uuid (FK -> habits.id)
  completion_date: timestamp
  note?: string
  createdAt: timestamp
}
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate database migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/habit_tracker
JWT_SECRET=your-secret-key-here
NODE_ENV=development
PORT=3000
```

## Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test habits.test.ts
```

## Key Features Explained

### Habit Completion Logic
- Users can only complete a habit once per day
- Attempting duplicate completion returns 409 Conflict
- Completions are tracked with timestamps for accurate streak calculation

### Statistics Calculation
- **Current Streak**: Consecutive days completed (must include today or yesterday)
- **Longest Streak**: Maximum consecutive days ever achieved
- **Total Completions**: Count of all completion entries
- **Completion Percentage**: (Days completed / Days since creation) × 100

### Security Features
- Password hashing with bcrypt (10 rounds)
- JWT tokens with expiration
- Request validation with Zod schemas
- SQL injection prevention via parameterized queries
- XSS protection with Helmet
- CORS configuration for cross-origin requests

## Course Structure

### Day 1 Schedule
- 9:30 AM - Welcome, Intro to APIs & REST Principles
- 10:00 AM - Setting Up Node.js Project with Express
- 10:45 AM - Express Basics: Routing & Request/Response
- 11:30 AM - Middleware in Express
- 1:00 PM - Setting up Postgres & Schema Design
- 1:45 PM - Connecting Node.js to Postgres with Drizzle
- 2:30 PM - Implementing CRUD Operations (Part 1)
- 3:30 PM - Implementing CRUD Operations (Part 2)
- 4:15 PM - Error Handling Basics & Q&A

### Day 2 Schedule
- 9:30 AM - Day 1 Recap & Day 2 Overview
- 9:45 AM - Authentication Concepts: JWT Introduction
- 10:30 AM - Implementing User Registration & Password Hashing
- 11:30 AM - Implementing User Login & JWT Issuance
- 1:00 PM - Protecting Routes with JWT Middleware
- 2:00 PM - Introduction to API Testing with Jest & Supertest
- 3:00 PM - Writing Integration Tests
- 3:45 PM - Deployment Strategies & Considerations
- 4:15 PM - Deploying the API & Final Q&A

## Deployment Considerations
- Use environment variables for sensitive data
- Enable HTTPS in production
- Set up database connection pooling
- Configure rate limiting for public endpoints
- Implement logging and monitoring
- Use PM2 or similar for process management
- Consider containerization with Docker

## Common Issues & Solutions

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database exists and user has permissions

### Migration Errors
- Run `npm run db:generate` before `npm run db:migrate`
- Check for pending migrations with Drizzle Studio
- Ensure database schema matches TypeScript types

### Test Failures
- Use separate test database
- Clear test data between runs
- Check for port conflicts (default: 3000)

## Additional Resources
- [Express.js Documentation](https://expressjs.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [JWT.io](https://jwt.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## License
This project is created for educational purposes as part of the API Design with Node.js v5 course.