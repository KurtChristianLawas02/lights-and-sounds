# KYURT

Powering Events with Premium Sound & Visual Experience.

KYURT is a full-stack booking platform for renting sound systems, LED walls, lights, microphones, projectors, speakers, and other event electronics.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: MySQL
- Auth: JWT, bcrypt password hashing, customer/admin roles

## Project Structure

```text
client/      React + Tailwind app
server/      Express API
database/    MySQL schema and seed data
```

## Setup

1. Create a MySQL database and import the schema:

```bash
mysql -u root -p < database/schema.sql
```

2. Configure the backend:

```bash
cd server
cp .env.example .env
```

Update `.env` with your MySQL credentials and JWT secret.

3. Install dependencies:

```bash
npm install
npm run install:all
```

4. Start both apps from the repo root:

```bash
npm run dev
```

Frontend: http://localhost:5173

Backend API: http://localhost:5000/api

For ngrok demos, set the server to listen on all interfaces and allow your tunnel origins:

```env
# server/.env
PORT=5001
HOST=0.0.0.0
CLIENT_URL=https://your-frontend.ngrok-free.app
```

Then point the frontend at the backend tunnel:

```env
# client/.env
VITE_API_URL=https://your-backend.ngrok-free.app/api
```

## Demo Accounts

The schema seeds these accounts:

- Admin: `admin@kyurt.test` / `password`
- Customer: `customer@kyurt.test` / `password`

## Core API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` admin
- `PUT /api/products/:id` admin
- `DELETE /api/products/:id` admin
- `POST /api/bookings`
- `GET /api/bookings/my`
- `GET /api/bookings` admin
- `PATCH /api/bookings/:id/status` admin
- `POST /api/bookings/availability`
- `POST /api/payments` admin
- `GET /api/reports/summary` admin
- `GET /api/reports/sales` admin

## Booking Rules

- Bookings reserve product quantities between `start_datetime` and `end_datetime`.
- Pending, Approved, and Paid bookings count against availability.
- Totals include item rental charges plus optional setup and technician fees.
- Admins approve, reject, mark paid, complete, or cancel bookings.
