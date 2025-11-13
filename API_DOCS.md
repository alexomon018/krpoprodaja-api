# Habit Tracker API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### Register New User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "token": "jwt-token-here"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

### Habits

#### Get All User Habits
```http
GET /habits
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "habits": [
    {
      "id": "uuid-here",
      "userId": "user-uuid",
      "name": "Exercise",
      "description": "Daily workout routine",
      "frequency": "daily",
      "targetCount": 1,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create New Habit
```http
POST /habits
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Read for 30 minutes",
  "description": "Daily reading habit",
  "frequency": "daily",
  "targetCount": 1
}
```

**Response (201 Created):**
```json
{
  "message": "Habit created successfully",
  "habit": {
    "id": "uuid-here",
    "userId": "user-uuid",
    "name": "Read for 30 minutes",
    "description": "Daily reading habit",
    "frequency": "daily",
    "targetCount": 1,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Update Habit
```http
PUT /habits/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Read for 45 minutes",
  "description": "Extended reading time"
}
```

**Response (200 OK):**
```json
{
  "message": "Habit updated successfully",
  "habit": {
    "id": "uuid-here",
    "name": "Read for 45 minutes",
    "description": "Extended reading time",
    "frequency": "daily",
    "targetCount": 1,
    "isActive": true,
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

#### Delete Habit
```http
DELETE /habits/:id
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Habit deleted successfully"
}
```

### Habit Completion

#### Complete Habit (Action Endpoint)
```http
POST /habits/:id/complete
Authorization: Bearer <token>
```

**Response (201 Created):**
```json
{
  "message": "Habit completed successfully",
  "entry": {
    "id": "uuid-here",
    "habitId": "habit-uuid",
    "completion_date": "2024-01-01T12:00:00Z",
    "note": null,
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

**Error Response (409 Conflict) - Already completed today:**
```json
{
  "error": "Habit already completed today",
  "message": "You can only complete a habit once per day"
}
```

### Habit Statistics

#### Get Habit Stats (Data Aggregation Endpoint)
```http
GET /habits/:id/stats
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "name": "Exercise",
  "current_streak": 7,
  "longest_streak": 21,
  "total_completions": 45,
  "completion_percentage": 75.5
}
```

### User Management

#### Get User Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Update User Profile
```http
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "Jane",
    "lastName": "Smith"
  }
}
```

#### Change Password
```http
PUT /users/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "Please provide a valid token"
}
```

### 404 Not Found
```json
{
  "error": "Habit not found"
}
```

### 409 Conflict
```json
{
  "error": "Email already registered"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

## Testing with cURL

### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### Create a habit (replace TOKEN with actual token)
```bash
curl -X POST http://localhost:3000/api/habits \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Drink Water",
    "description": "Stay hydrated",
    "frequency": "daily",
    "targetCount": 8
  }'
```

### Complete a habit
```bash
curl -X POST http://localhost:3000/api/habits/HABIT_ID/complete \
  -H "Authorization: Bearer TOKEN"
```

### Get habit statistics
```bash
curl -X GET http://localhost:3000/api/habits/HABIT_ID/stats \
  -H "Authorization: Bearer TOKEN"
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- Authentication endpoints: 5 requests per minute
- Other endpoints: 100 requests per minute per user

## Pagination

List endpoints support pagination via query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Example:
```http
GET /habits?page=2&limit=20
```

## Webhook Events (Future Enhancement)

The API can be extended to support webhooks for the following events:
- `habit.created` - When a new habit is created
- `habit.completed` - When a habit is marked as complete
- `streak.milestone` - When a user reaches a streak milestone (7, 30, 100 days)
- `habit.deleted` - When a habit is deleted

## SDK Examples

### JavaScript/TypeScript
```typescript
class HabitTrackerAPI {
  private baseURL = 'http://localhost:3000/api';
  private token: string | null = null;

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    this.token = data.token;
    return data;
  }

  async getHabits() {
    const response = await fetch(`${this.baseURL}/habits`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  async completeHabit(habitId: string) {
    const response = await fetch(`${this.baseURL}/habits/${habitId}/complete`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  async getHabitStats(habitId: string) {
    const response = await fetch(`${this.baseURL}/habits/${habitId}/stats`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }
}

// Usage
const api = new HabitTrackerAPI();
await api.login('user@example.com', 'password');
const habits = await api.getHabits();
const stats = await api.getHabitStats(habits.habits[0].id);
```