# WattCount Backend API

Express.js backend for the WattCount electricity billing and consumption management system.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wattcount
DB_PORT=3306

# JWT Secret (use a strong random string in production)
JWT_SECRET=your-secret-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Setup MySQL Database

**Option 1: Using SQL Script (Recommended)**
1. Make sure MySQL is installed and running
2. Run the SQL script to create the database and all tables:
   ```bash
   mysql -u root -p < setup_database.sql
   ```
   Or manually:
   ```bash
   mysql -u root -p
   source setup_database.sql
   ```

**Option 2: Auto-create (Alternative)**
1. The application will automatically create the database and tables on first run if they don't exist
2. Make sure your MySQL user has CREATE DATABASE privileges

### 4. Seed Mock Users (Optional - for Development)

To create test users with auto-login capability:

```bash
npm run seed
```

This will create:
- **Main User**: `admin` / `admin123`
- **Shared Users**: `user1`, `user2`, `user3` / `user123` (all)

### 5. Run the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`)

## Vercel Deployment

For Vercel deployment, the `backend/index.js` file exports the Express app directly.
Vercel will detect this and deploy it as a serverless function.

**Environment Variables for Vercel:**
Ensure all necessary environment variables (e.g., `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`) are configured in your Vercel project settings.

**Local Vercel Emulation:**
You can test the Vercel deployment locally using the Vercel CLI:
```bash
npm install -g vercel
vercel dev
```
This will start a local server emulating the Vercel environment.

## Development Features

### Auto-Login (Development Only)

In development mode, you can use quick login:

1. **Via API**: `POST /api/dev/auto-login` with `{ "username": "admin" }`
2. **Via Frontend**: Navigate to `/dev-login` for a quick login interface

**Note**: These endpoints are automatically disabled in production mode.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new main user
- `POST /api/auth/login` - Login
- `POST /api/auth/connect` - Connect as shared user with code
- `POST /api/auth/generate-code` - Generate shared code (Main User only)
- `GET /api/auth/shared-codes` - Get all shared codes (Main User only)
- `DELETE /api/auth/shared-codes/:code` - Delete shared code (Main User only)
- `GET /api/auth/profile` - Get current user profile

### Development (Dev Mode Only)
- `POST /api/dev/auto-login` - Auto-login with username (no password required)
- `GET /api/dev/test-users` - Get list of available test users

### Users
- `GET /api/users/shared` - Get all shared users (Main User only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user (Main User only)

### Consumption
- `POST /api/consumption` - Create consumption record
- `GET /api/consumption/my` - Get my consumption records
- `GET /api/consumption/all` - Get all consumption records (Main User only)
- `GET /api/consumption/:id` - Get consumption record by ID
- `PUT /api/consumption/:id` - Update consumption record (Main User only)
- `DELETE /api/consumption/:id` - Delete consumption record (Main User only)
- `GET /api/consumption/summary` - Get consumption summary

### Bills
- `POST /api/bills` - Create bill (Main User only)
- `GET /api/bills/my` - Get my bills
- `GET /api/bills/all` - Get all bills (Main User only)
- `GET /api/bills/:id` - Get bill by ID
- `PUT /api/bills/:id` - Update bill (Main User only)
- `GET /api/bills/cycle` - Get bills by billing cycle

### Payments
- `POST /api/payments` - Record payment
- `GET /api/payments/my` - Get my payments
- `GET /api/payments/bill/:bill_id` - Get payments for a bill
- `GET /api/payments/:id` - Get payment by ID

### Rates
- `POST /api/rates` - Set electricity rate (Main User only)
- `GET /api/rates/current` - Get current rate
- `GET /api/rates/all` - Get all rates (Main User only)

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Database Schema

The system automatically creates the following tables:
- `users` - User accounts (main_user and shared_user)
- `shared_codes` - Codes for connecting shared users
- `consumption_records` - Electricity consumption readings
- `electricity_rates` - Electricity rates per kWh
- `bills` - Generated bills
- `payments` - Payment records
- `audit_logs` - System audit trail
