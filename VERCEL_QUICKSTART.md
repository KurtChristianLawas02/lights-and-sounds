# KYURT Vercel Deployment Quick Start

## 1. Prerequisites
- Push code to GitHub/GitLab/Bitbucket
- Have a MySQL database ready (PlanetScale, AWS RDS, or self-hosted)
- Vercel account (free tier works)

## 2. Deploy Backend First

```bash
# Go to vercel.com → Add Project → Select "server" folder
```

**Environment Variables to set:**
| Variable | Example | Notes |
|----------|---------|-------|
| `PORT` | `5001` | Keep as is |
| `HOST` | `0.0.0.0` | Keep as is |
| `CLIENT_URL` | `https://kyurt-frontend.vercel.app` | Your frontend URL |
| `DB_HOST` | `db.planetscale.com` | Your MySQL host |
| `DB_USER` | `root` | Your DB username |
| `DB_PASSWORD` | `****` | Your DB password |
| `DB_NAME` | `alberca_booking` | Database name |
| `JWT_SECRET` | `generate-random-string` | At least 32 chars |

**After deploy**, copy your Backend URL (e.g., `https://kyurt-backend.vercel.app`)

## 3. Deploy Frontend

```bash
# Go to vercel.com → Add Project → Select "client" folder
```

**Environment Variables to set:**
| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://kyurt-backend.vercel.app/api` |

## 4. Verify Deployment

```bash
# Test backend
curl https://kyurt-backend.vercel.app/api/health

# Test frontend
# Visit: https://kyurt-frontend.vercel.app
```

## 5. Initialize Database

```bash
# Import the schema to your MySQL database
mysql -h your-host -u your-user -p your-db < database/schema.sql
```

---

## Key Files Created

- `vercel.json` - Frontend routing config
- `server/vercel.json` - Backend serverless config
- `DEPLOYMENT.md` - Full deployment guide
- `client/.env.example` - Frontend env template
- `server/.env.example` - Backend env template

---

## Troubleshooting

**CORS errors?**
- Check `CLIENT_URL` in backend matches frontend URL exactly

**Database connection failed?**
- Verify DB credentials in environment variables
- Whitelist Vercel's IP ranges if needed

**Frontend showing 404 on routes?**
- Vercel rewrites in `vercel.json` handle SPA routing

**Build failed?**
- Check Vercel logs for specific errors
- Ensure Node.js 18+ compatible dependencies

---

See `DEPLOYMENT.md` for full documentation.
