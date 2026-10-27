# ITELECT4 Backend

This project provides the backend API for the ITELECT4 frontend. It uses Express, TypeScript, Mongoose, and JWT authentication.

## Tech stack

- Node.js + Express
- TypeScript (strict mode)
- MongoDB Atlas + Mongoose
- JWT authentication
- bcryptjs password hashing
- dotenv environment variables
- CORS for frontend communication

## Project structure

- `src/app.ts` - Express app configuration, CORS, and health routes
- `src/server.ts` - local server startup
- `src/config/db.ts` - MongoDB connection setup with reused connection logic for Vercel-style hosting
- `src/models/` - Mongoose models for User, Submission, and Course
- `src/controllers/` - auth and submission logic
- `src/routes/` - endpoint registration for auth, submissions, and courses
- `src/middleware/` - JWT protection and error handling
- `src/types/` - shared request/user types
- `src/seed.ts` - database seeding for the public course list

## Local setup

1. Create a `.env` file from `.env.example`.
2. Replace the empty values with your MongoDB URI and a strong JWT secret.
   For Atlas, the URI must include the intended database name, for example `/itelect4`.
3. Install dependencies:

```bash
npm install
```

4. Start the API in development mode:

```bash
npm run dev
```

5. The server listens on `http://localhost:4000` by default.

## Required environment variables

Create a `.env` file with values that match your machine or deployment:

```env
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
JWT_SECRET=your_very_strong_secret_here
JWT_EXPIRES_IN=2h
CORS_ORIGIN=http://localhost:5173
```

> For a local MongoDB installation, the URI usually looks like `mongodb://127.0.0.1:27017/itelect4`.
> For MongoDB Atlas, use its full connection string and include `/itelect4` (or your chosen database name) before the query string.
> Do not commit or share the real `.env` file. The repository ignores it.

## Authentication endpoints

### 1) Register

`POST /api/auth/register`

Request body:

```json
{
  "username": "student01",
  "email": "student01@example.com",
  "password": "Password123!"
}
```

Expected responses:

- `201 Created` for a successful registration
- `400 Bad Request` for invalid input
- `409 Conflict` if username or email is already in use

### 2) Login

`POST /api/auth/login`

Request body:

```json
{
  "email": "student01@example.com",
  "password": "Password123!"
}
```

Expected responses:

- `200 OK` with a JWT token and user data
- `400 Bad Request` for invalid payload
- `401 Unauthorized` for bad credentials

## Course resource endpoints

These routes are public and do not require authentication.

### Get all courses

`GET /api/courses`

### Get one course by code

`GET /api/courses/:code`

Example:

```http
GET http://localhost:4000/api/courses/ITELECT4
```

Expected response:

```json
{
  "code": "ITELECT4",
  "title": "IT Elective 4 - TypeScript Advanced Types",
  "units": 3,
  "semester": "1st Semester 2026-2027"
}
```

## Submission resource endpoints

All Submission routes require a valid JWT in the header:

```http
Authorization: Bearer <token>
```

### Get all submissions

`GET /api/submissions`

### Get one submission by ID

`GET /api/submissions/:id`

### Create a submission

`POST /api/submissions`

Request body:

```json
{
  "courseCode": "ITELECT4",
  "repoUrl": "https://github.com/yourname/project"
}
```

The authenticated user is recorded as the owner from the JWT. The API generates `submittedAt` and the default score; clients should not send `studentId` or a timestamp.

### Update a submission

`PATCH /api/submissions/:id`

Example:

```json
{
  "score": 95
}
```

### Delete a submission

`DELETE /api/submissions/:id`

Expected responses:

- `200 OK` or `204 No Content` depending on the route
- `400 Bad Request` for invalid MongoDB IDs or malformed payloads
- `401 Unauthorized` for missing or invalid JWT
- `404 Not Found` if the record does not exist
- `500 Internal Server Error` for unexpected failures

## Seed and local verification flow

Run these commands after your `.env` file has valid values:

```bash
npm install
npm run seed
npm run dev
```

Then verify the app:

1. `http://localhost:4000/api/health` should return `{"status":"ok","db":true}` when MongoDB connects. A connection failure returns HTTP 503 with `db: false`.
2. `http://localhost:4000/api/courses` should return the three courses without a token.
3. `http://localhost:4000/api/courses/ITELECT4` and `/api/courses/itelect4` should return the same course; an unknown code returns 404.
4. Registration and login remain at `/api/auth/register` and `/api/auth/login`.
5. All five submission routes require a JWT and only return or modify submissions created by that authenticated user.

## Example Postman test flow

The following sequence is the expected validation flow for the project after you add your actual MongoDB connection string and JWT secret.

1. Start the backend:

```bash
npm run dev
```

2. Confirm the app listens on `http://localhost:4000`.

3. Register a user:

```http
POST http://localhost:4000/api/auth/register
Content-Type: application/json
```

Body:

```json
{
  "username": "student01",
  "email": "student01@example.com",
  "password": "Password123!"
}
```

Expected: `201 Created`

4. Register the same user again to confirm duplicates are rejected.

Expected: `409 Conflict`

5. Log in:

```http
POST http://localhost:4000/api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "student01@example.com",
  "password": "Password123!"
}
```

Expected: `200 OK` and a JWT token.

6. Test JWT protection without a token:

```http
GET http://localhost:4000/api/submissions
```

Expected: `401 Unauthorized`

7. Repeat the route with a valid token:

```http
GET http://localhost:4000/api/submissions
Authorization: Bearer <token>
```

Expected: `200 OK`

8. Create a submission:

```http
POST http://localhost:4000/api/submissions
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "courseCode": "ITELECT4",
  "repoUrl": "https://github.com/yourname/project"
}
```

Expected: `201 Created`

9. Retrieve all submissions.

Expected: `200 OK`

10. Retrieve the created submission by ID.

Expected: `200 OK`

11. Update the submission.

```http
PATCH http://localhost:4000/api/submissions/<id>
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "score": 95
}
```

Expected: `200 OK`

12. Delete the submission.

```http
DELETE http://localhost:4000/api/submissions/<id>
Authorization: Bearer <token>
```

Expected: `200 OK` or `204 No Content`

13. Verify invalid cases:

- invalid MongoDB ID -> `400 Bad Request`
- missing item -> `404 Not Found`
- malformed request body -> `400 Bad Request`
- invalid credentials -> `401 Unauthorized`

## Frontend integration notes

The frontend should send requests to `http://localhost:4000` and include a JWT in the `Authorization` header:

```http
Authorization: Bearer <token>
```

The existing frontend project may currently use `json-server` on port `3001` for demo data, but the GT4 backend is designed to use the MongoDB-backed API instead. The backend and frontend remain independently runnable.

## Git and submission notes

This folder was not a valid Git repository when the backend project was initialized, so no Git branch or remote actions were created. The backend implementation is ready to be committed once the repository is initialized in the correct place.

## Deployment handoff notes

The Express app is exported from `src/app.ts`; `src/server.ts` is only the local `app.listen()` entry point. The current deployed Vercel project already routes requests to the app, so no additional Vercel configuration file is required here.

In Vercel, set these environment variables for the Production environment (and Preview if you use preview deployments):

```env
PORT=4000
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
JWT_EXPIRES_IN=2h
CORS_ORIGIN=http://localhost:5173
```

For the initial backend deployment before the frontend is public, `http://localhost:5173` is a temporary value. `CORS_ORIGIN` should be the exact frontend origin, such as `https://your-frontend.example`, without a path or trailing slash. When the frontend is deployed, replace the temporary value with its URL and redeploy the backend. `PORT` is only needed for local server startup; `JWT_EXPIRES_IN` defaults to `7d` if omitted.

For MongoDB Atlas, add a Network Access entry that permits Vercel connectivity. `0.0.0.0/0` allows connections from any IP; use it only with a strong database password and a least-privilege database user.

After deploying, check `https://YOUR-BACKEND-URL.vercel.app/api/health` for `{"status":"ok","db":true}` and `https://YOUR-BACKEND-URL.vercel.app/api/courses` for the course list. Replace the placeholder with the URL Vercel gives you.

## Verification status

- `npm run build` was run successfully and is part of the project verification workflow.
- Postman and live MongoDB testing still require a valid MongoDB connection string and a real JWT secret in a local `.env` file.
