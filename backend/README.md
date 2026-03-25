# Annotation & File Management API

A REST API for storing and managing image annotations with file upload capabilities (images and videos), RTSP camera streaming, and JWT token-based authentication.

## Features

### � Auto-Generated Documentation
- ✅ **Interactive Swagger UI** at `/api-docs`
- ✅ Automatically updates when routes change
- ✅ Test endpoints directly from browser
- ✅ Try API with authentication
- ✅ Download OpenAPI specification

### �🔐 Authentication
- ✅ JWT token-based authentication
- ✅ User registration and login
- ✅ Profile management
- ✅ Secure password hashing
- ✅ Protected API endpoints

### Annotation Features
- ✅ Token-protected CRUD operations
- ✅ Store image URL as string
- ✅ Store complex annotation data (Polygons, Rectangles, Lines)
- ✅ Automatic database creation

### File Management Features  
- ✅ Upload images and videos (max 50MB)
- ✅ Store files in assets folder
- ✅ Save file metadata in database
- ✅ Access files via URL
- ✅ List files with filtering (by type)
- ✅ Get file by ID or custom slug
- ✅ Update file name and slug
- ✅ Delete files (database + filesystem)
- ✅ Support for multiple formats:
  - Images: JPEG, PNG, GIF, WebP, SVG
  - Videos: MP4, MPEG, MOV, AVI, WebM

### 📹 RTSP Camera Streaming
- ✅ Add/manage multiple RTSP camera streams
- ✅ Capture snapshots from live streams
- ✅ Record video clips (configurable duration)
- ✅ Grid view configuration (NxN layout)
- ✅ Latest snapshots per stream
- ✅ Ready for Python AI model integration

### ⚙️ Configuration Management
- ✅ Dynamic system configuration
- ✅ Configurable file upload limits
- ✅ Configurable camera grid layout
- ✅ Batch configuration updates

## Installation

1. Install dependencies:
```bash
yarn install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update database credentials and JWT secret in `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=konva-db
PORT=3000

# IMPORTANT: Change this in production!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

3. Make sure MySQL is running on your system

## Usage

Start the server:
```bash
yarn start
```

For development with auto-reload:
```bash
yarn dev
```

The server will automatically:
- Create the database if it doesn't exist
- Create all required tables (users, annotations, files, rtsp_streams, rtsp_clips, system_config)
- Start listening on the configured port (default: 3000)
- Generate interactive API documentation at `/api-docs`

## 📚 API Documentation

### Interactive Swagger UI

Access the **auto-generated, interactive API documentation**:

```
http://localhost:3000/api-docs
```

**Features:**
- ✨ Test all endpoints directly from your browser
- ✨ See request/response examples
- ✨ Try authentication with your JWT token
- ✨ Documentation updates automatically when routes change
- ✨ Download OpenAPI specification

### How to Use Swagger UI

1. Open `http://localhost:3000/api-docs`
2. Click **"Authorize"** button (🔒 icon)
3. Enter: `Bearer YOUR_JWT_TOKEN` (get token from login)
4. Click **"Authorize"**
5. Now test any endpoint by clicking **"Try it out"**!

### Add Documentation to New Routes

When you create new routes, add JSDoc comments above them for automatic documentation:

```javascript
/**
 * @swagger
 * /api/my-endpoint:
 *   get:
 *     summary: Description of endpoint
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/my-endpoint', authenticateToken, myController);
```

See [docs/AUTO_DOCUMENTATION.md](docs/AUTO_DOCUMENTATION.md) for complete guide on adding routes with auto-documentation.

## 🔐 Authentication

**All API endpoints require JWT token authentication** (except `/auth/register` and `/auth/login`).

### Quick Start

1. **Register a new user:**
```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone_number": "1234567890"
}
```

2. **Login to get token:**
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

3. **Use token in all API requests:**
```bash
GET http://localhost:3000/api/annotations
Authorization: Bearer <your-token-here>
```

For complete authentication documentation, see [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)

## API Endpoints

### Authentication Endpoints

### 1. Health Check
```
GET http://localhost:3000/
```

### 2. Register User (Public)
```
POST http://localhost:3000/api/auth/register
```

### 3. Login (Public)
```
POST http://localhost:3000/api/auth/login
```

### 4. Get Profile (Protected)
```
GET http://localhost:3000/api/auth/profile
Authorization: Bearer <token>
```

### 5. Update Profile (Protected)
```
PUT http://localhost:3000/api/auth/profile
Authorization: Bearer <token>
```

### Annotation Endpoints

### 1. Create Annotation (Protected)
```
POST http://localhost:3000/api/annotations
Authorization: Bearer <token>
Content-Type: application/json

{
  "location": "Draw Detection",
  "imageUrl": "https://example.com/image.jpg",
  "annotations": {
    "shapes": {
      "Polygon": [...],
      "Rectangle": [...],
      "Line": [...]
    },
    "timestamp": "2026-01-16T07:35:45.071Z"
  },
  "timestamp": "2026-01-16T07:35:45.333Z"
}
```

### 3. Get All Annotations (Protected)
```
GET http://localhost:3000/api/annotations
Authorization: Bearer <token>
```

### 4. Get Annotation by ID (Protected)
```
GET http://localhost:3000/api/annotations/:id
Authorization: Bearer <token>
```

### 5. Delete Annotation (Protected)
```
DELETE http://localhost:3000/api/annotations/:id
Authorization: Bearer <token>
```

### File Management Endpoints

### 6. Upload File (Protected)
```
POST http://localhost:3000/api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: (binary file)
- slug: "optional-custom-slug" (optional)
```

### 7. Get All Files (Protected)
```
GET http://localhost:3000/api/files
Authorization: Bearer <token>

# Filter by type:
GET http://localhost:3000/api/files?type=image
GET http://localhost:3000/api/files?type=video
```

### 8. Get File by ID (Protected)
```
GET http://localhost:3000/api/files/id/:id
Authorization: Bearer <token>
```

### 9. Get File by Slug (Protected)
```
GET http://localhost:3000/api/files/slug/:slug
Authorization: Bearer <token>
```

### 10. Update File Name (Protected)
```
PUT http://localhost:3000/api/files/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "originalName": "new-name.jpg",
  "slug": "new-slug"
}
```

### 11. Delete File (Protected)
```
DELETE http://localhost:3000/api/files/:id
Authorization: Bearer <token>
```

### 12. Access Uploaded Files
```
GET http://localhost:3000/assets/filename.jpg
```

## Example Request with Authentication

```bash
curl -X POST http://localhost:3000/api/annotations \
  -H "Content-Type: application/json" \
## Example Request with Authentication

```bash
# First, login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Response will include token
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {...}
# }

# Then use the token for protected endpoints
curl -X POST http://localhost:3000/api/annotations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "location": "Draw Detection",
    "imageUrl": "https://media.istockphoto.com/id/1212010350/photo/busy-modern-open-plan-office-with-staff.jpg",
    "annotations": {
      "shapes": {
        "Polygon": [{
          "id": "9",
          "points": [[0.007, 0.610], [0.380, 0.604], [0.388, 0.976], [0.013, 0.976]],
          "color": "green",
          "strokeWidth": 2
        }]
      },
      "timestamp": "2026-01-16T07:35:45.071Z"
    },
    "timestamp": "2026-01-16T07:35:45.333Z"
  }'
```

## Database Schema

### Users Table

The `users` table stores user authentication information:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);
```

### Annotations Table

The `annotations` table is created with the following structure:

```sql
CREATE TABLE annotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  annotations JSON NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Files Table

The `files` table is created with the following structure:

```sql
CREATE TABLE files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type ENUM('image', 'video', 'other') NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  slug VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Project Structure

```
api-konva/
├── assets/                  # Uploaded files storage
├── config/
│   ├── database.js          # Database configuration and initialization
│   └── rtsp.config.js       # RTSP settings and defaults
├── controllers/
│   ├── auth.controller.js        # Authentication logic (register, login, profile)
│   ├── annotation.controller.js  # Business logic for annotations
│   ├── file.controller.js        # Business logic for file uploads
│   ├── rtsp.controller.js        # RTSP stream management
│   └── config.controller.js      # System configuration
├── middleware/
│   └── auth.middleware.js        # JWT authentication middleware
├── config/
│   ├── database.js          # Database configuration and initialization
│   ├── rtsp.config.js       # RTSP settings and defaults
│   └── swagger.js           # Swagger/OpenAPI configuration
├── controllers/
│   ├── auth.controller.js        # Authentication logic (register, login, profile)
│   ├── annotation.controller.js  # Business logic for annotations
│   ├── file.controller.js        # Business logic for file uploads
│   ├── rtsp.controller.js        # RTSP stream management
│   └── config.controller.js      # System configuration
├── middleware/
│   └── auth.middleware.js        # JWT authentication middleware
├── routes/
│   ├── auth.routes.js            # Authentication API routes
│   ├── annotation.routes.js      # Annotation API routes
│   ├── file.routes.js            # File upload API routes
│   ├── rtsp.routes.js            # RTSP API routes
│   └── config.routes.js          # Configuration API routes
├── docs/                    # Documentation folder
│   ├── AUTO_DOCUMENTATION.md     # Guide for adding auto-documented routes
│   ├── AUTHENTICATION.md         # Authentication API documentation
│   ├── MIGRATION_GUIDE.md        # Authentication migration guide
│   ├── FILE_API_DOCS.md          # File API documentation
│   ├── RTSP_API_DOCS.md          # RTSP API documentation
│   ├── PYTHON_AI_INTEGRATION.md  # Python AI integration guide
│   ├── QUICK_START.md            # Quick start guide
│   ├── RTSP_IMPLEMENTATION.md    # RTSP implementation details
│   └── IMPLEMENTATION_SUMMARY.md # Implementation summary
├── .env                     # Environment variables (not in git)
├── .env.example            # Example environment file
├── package.json            # Dependencies and scripts
├── server.js               # Main application entry point
├── test-upload.html        # Test page for file uploads
└── README.md              # This file
```

## Technologies

- Node.js
- Express.js
- Swagger UI / OpenAPI 3.0 - Auto-generated API documentation
- MySQL (mysql2)
- Multer (file uploads)
- JWT (jsonwebtoken) - Token-based authentication
- bcryptjs - Password hashing
- CORS
- dotenv

## Quick Testing

1. **🎯 Interactive Swagger UI**: Open `http://localhost:3000/api-docs` - Test all endpoints with authentication!
2. **Register & Login**: Create a user account and get your JWT token
3. **Test in Browser**: Use Swagger UI's "Try it out" feature
4. **Read Docs**: See `docs/` folder for detailed guides:
   - `docs/AUTO_DOCUMENTATION.md` - **How to add auto-documented routes**
   - `docs/AUTHENTICATION.md` - Authentication guide
   - `docs/FILE_API_DOCS.md` - File management
   - `docs/RTSP_API_DOCS.md` - RTSP camera system
   - `docs/PYTHON_AI_INTEGRATION.md` - AI integration
   - `docs/QUICK_START.md` - Quick start guide

## Security Notes

- All API endpoints require JWT token authentication (except register/login)
- Passwords are hashed using bcryptjs before storage
- JWT tokens expire after 7 days
- Never commit your `.env` file with real secrets
- Change `JWT_SECRET` in production to a strong, random value
- Use HTTPS in production environments

## Notes

- The image URLs in annotations are stored as strings (not uploaded files)
- For actual file uploads, use the `/api/files/upload` endpoint with authentication
- The database and tables are created automatically on first run
- Uploaded files are stored in the `assets/` directory
- Files are accessible via `/assets/filename` URL
- Maximum file size: 50MB (configurable)
- All annotation data is stored as JSON in MySQL
