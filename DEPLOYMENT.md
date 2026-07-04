# Vercel Deployment Guide

This guide covers deploying the KYURT booking app to Vercel (both frontend and backend).

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub, GitLab, or Bitbucket account (repo hosting)
- MySQL database (Managed DB service or self-hosted)
- Vercel CLI installed: `npm install -g vercel`

## Deployment Strategy

This is a monorepo with separate frontend (React) and backend (Node.js) apps. They can be deployed as:

1. **Frontend**: Deployed as a static site (recommended)
2. **Backend**: Deployed as a serverless function or standalone Node.js app

---

## Option A: Deploy Both on Vercel (Recommended)

### Step 1: Prepare Your Repository

```bash
# Push your code to GitHub/GitLab/Bitbucket
git add .
git commit -m "Add Vercel deployment config"
git push origin main
```

### Step 2: Deploy Backend

1. Go to https://vercel.com and sign in
2. Click **Add New...** → **Project**
3. Import your repository
4. Select the **server** folder as the root directory
5. Set Environment Variables:
   - `CLIENT_URL`: Your frontend Vercel URL (e.g., `https://kyurt-frontend.vercel.app`)
   - `DB_HOST`: Your MySQL host
   - `DB_PORT`: 3306
   - `DB_USER`: Your database user
   - `DB_PASSWORD`: Your database password
   - `DB_NAME`: `alberca_booking`
   - `JWT_SECRET`: A strong random secret
   - `JWT_EXPIRES_IN`: `7d`
6. Click **Deploy**
7. Copy your backend URL (e.g., `https://kyurt-backend.vercel.app`)

### Step 3: Deploy Frontend

1. Go to https://vercel.com and click **Add New...** → **Project**
2. Import the same repository
3. Select the **client** folder as the root directory
4. Set Environment Variables:
   - `VITE_API_URL`: Your backend Vercel URL from Step 2 (e.g., `https://kyurt-backend.vercel.app/api`)
5. Click **Deploy**

---

## Option B: Deploy Backend Separately (Advanced)

If you prefer to host your backend on a different platform (AWS, Heroku, etc.):

1. Deploy the **server** folder to your chosen platform
2. Update the frontend `VITE_API_URL` environment variable to point to your backend URL
3. Make sure CORS is configured correctly in your backend for the frontend domain

---

## Environment Variables Setup

### Backend (server/.env on Vercel)

```env
PORT=5001
HOST=0.0.0.0
CLIENT_URL=https://kyurt-frontend.vercel.app
DB_HOST=your-mysql-host.com
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=alberca_booking
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
```

### Frontend (client/.env on Vercel)

```env
VITE_API_URL=https://kyurt-backend.vercel.app/api
```

---

## Database Setup

Your MySQL database **must be accessible** from Vercel:

1. **Option 1: Cloud-Hosted MySQL**
   - Use PlanetScale, AWS RDS, or similar
   - Ensure your Vercel IP is whitelisted

2. **Option 2: Self-Hosted MySQL**
   - Make sure port 3306 is open and accessible from the internet
   - Use a strong password

3. **Initialize the Database**:
   - Import the schema from `database/schema.sql` into your MySQL database:
   ```bash
   mysql -h your-host -u your-user -p your-database < database/schema.sql
   ```

---

## Manual Deployment with Vercel CLI

If you prefer CLI deployment:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy backend
cd server
vercel --env-file=.env

# Deploy frontend
cd ../client
vercel --env-file=.env
```

---

## Post-Deployment Verification

1. Test the frontend at your Vercel URL
2. Test the backend health endpoint:
   ```bash
   curl https://your-backend.vercel.app/api/health
   ```
3. Test a login endpoint:
   ```bash
   curl -X POST https://your-backend.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"customer@kyurt.test","password":"password"}'
   ```

---

## Troubleshooting

### CORS Errors
- Ensure `CLIENT_URL` in your backend matches your frontend Vercel URL exactly
- Check that the frontend is sending requests to the correct `VITE_API_URL`

### Database Connection Issues
- Verify MySQL credentials in your backend environment variables
- Check that your MySQL host is accessible from Vercel (whitelist Vercel IPs if needed)
- Test the connection locally before deploying

### Build Failures
- Check the Vercel build logs for errors
- Ensure all environment variables are set correctly
- Verify your Node.js version is compatible (18+ recommended)

### 404 on Frontend Routes
- Vercel should automatically handle SPA routing via `vercel.json`
- If not working, ensure the `rewrites` are correctly configured in `vercel.json`

---

## Updating Your Deployment

Changes are automatically deployed when you push to your main branch (if auto-deploy is enabled).

To redeploy manually:
```bash
git push origin main
```

---

## Security Checklist

- [ ] Change `JWT_SECRET` to a strong, random value
- [ ] Use strong database passwords
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Set appropriate CORS origins (not `*`)
- [ ] Regularly update dependencies for security patches
- [ ] Use environment variables for all secrets (never commit `.env`)

---

## Support

For issues:
- Check Vercel documentation: https://vercel.com/docs
- Review Vercel logs in the project dashboard
- Check your backend logs with: `vercel logs`
