# Nirnay AI - Production Deployment Guide

## Quick Summary
- **Frontend**: React/Vite → Vercel  
- **Backend**: FastAPI → Render  
- **Database**: SQLite (demo) → Can upgrade to PostgreSQL  
- **PDF Storage**: Local upload dir  

---

## Folder Structure (Production-Ready)

```
nirnay-ai/
├── frontend/                    # React + Vite (→ Vercel)
│   ├── src/
│   │   ├── pages/              # Upload, Extraction, Dashboard screens
│   │   ├── components/         # Reusable UI (PdfViewer, ActionItemCard, etc)
│   │   ├── api/                # client.js with VITE_API_BASE_URL
│   │   └── mock/               # Fallback demo data
│   ├── vite.config.js
│   ├── vercel.json             # Routing config for SPA
│   ├── package.json
│   ├── .env.example            # Template: VITE_API_BASE_URL
│   └── .env.production         # Prod: VITE_API_BASE_URL=https://nirnay-ai-api.onrender.com
│
├── app/                         # FastAPI backend (→ Render)
│   ├── main.py                 # API: /upload, /extract, /verify, /pdf/{id}
│   ├── database.py             # SQLite ops
│   ├── schemas.py              # Pydantic models
│   ├── services/
│   │   └── extractor.py        # PDF extraction logic
│   ├── requirements.txt
│   └── uploads/                # PDF storage (Render: ephemeral storage)
│
├── requirements.txt            # Backend deps
├── .env.production             # Env vars for Render
└── DEPLOYMENT.md               # This file
```

---

## Required Build Commands

### Frontend (Vercel)
```bash
# Development
npm run dev          # http://localhost:5174

# Production Build
npm run build        # → dist/

# Preview production build
npm run preview
```

### Backend (Render)
```bash
# Development
uvicorn app.main:app --reload

# Production
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```

---

## Environment Variables

### Frontend (.env.production)
```env
VITE_API_BASE_URL=https://nirnay-ai-api.onrender.com
```

### Backend (Render Environment)
```env
FRONTEND_URL=https://nirnay-ai.vercel.app
```

---

## Exact Vercel Settings

### Project Settings
1. **Framework Preset**: Vite
2. **Build Command**: `npm run build`
3. **Output Directory**: `dist`
4. **Install Command**: `npm install`
5. **Node Version**: 18.x (or latest)

### Environment Variables (Vercel Dashboard)
```
VITE_API_BASE_URL: https://nirnay-ai-api.onrender.com
```

### Routing (vercel.json)
- Auto-configured: SPA rewrites all `/` → `/index.html`
- Static assets cached long-term
- API calls proxied to Render backend

### Domains
- `nirnay-ai.vercel.app` (default)
- Custom domain supported

---

## Exact Render Settings

### Backend Service
1. **Environment**: Python 3.11
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000`

### Environment Variables (Render Dashboard)
```
FRONTEND_URL=https://nirnay-ai.vercel.app
```

### Networking
- Auto-generated URL: `https://nirnay-ai-api.onrender.com`
- CORS: Whitelisted `https://nirnay-ai.vercel.app`

### Storage
- **Uploads Directory**: `/tmp/uploads/` (ephemeral)
  - ⚠️ Resets on redeploy
  - For production: Use S3/Cloud Storage

### Keep-Alive (Optional)
- **Cron Job** (free tier workaround): Use external cron service to ping `/health`
- **Pro Tier**: Use Render's native keep-alive

---

## Production Checklist

### Frontend (Vercel)
- [x] Build passes: `npm run build` succeeds
- [x] No localhost URLs: All API calls use `VITE_API_BASE_URL`
- [x] Routing configured: vercel.json has SPA rewrites
- [x] Environment variables set in Vercel Dashboard
- [x] HTTPS enforced (automatic)
- [x] PDF viewer uses `react-pdf` with external worker

### Backend (Render)
- [x] CORS: Allows `https://nirnay-ai.vercel.app`
- [x] PDF endpoint: `GET /api/pdf/{document_id}` for serving stored PDFs
- [x] Health check: `GET /health` returns `{"status": "ok"}`
- [x] Upload validation: Max 10 MB, PDF format required
- [x] Error handling: Falls back to demo data on extraction failure
- [x] HTTPS enforced (automatic)

### Database
- [ ] **TODO**: Migrate SQLite to PostgreSQL (for production persistence)
  - Use: `psycopg2` + SQLAlchemy
  - Connection string from Render environment

### File Storage
- [ ] **TODO**: Migrate local uploads to S3 or similar
  - Use: `boto3` or `python-multipart` with cloud storage
  - Render's `/tmp/` is ephemeral (reset on redeploy)

### Monitoring
- [ ] Set up error tracking: Sentry or similar
- [ ] Monitor Render API for slow extractions
- [ ] Monitor Vercel for build/runtime errors

---

## Deployment Steps

### 1. Deploy Frontend (Vercel)
```bash
# In frontend/ directory
vercel --prod

# Or connect GitHub repo in Vercel Dashboard
# → Auto-deploys on git push to main
```

### 2. Deploy Backend (Render)
```bash
# Connect GitHub repo in Render Dashboard
# → Select project root or `/app` subdirectory
# → Set Build/Start commands as above
# → Set environment variables
# → Deploy
```

### 3. Verify Connectivity
```bash
# Test backend health
curl https://nirnay-ai-api.onrender.com/health

# Test CORS (from frontend domain)
curl -H "Origin: https://nirnay-ai.vercel.app" \
     https://nirnay-ai-api.onrender.com/health
```

---

## Troubleshooting

### Issue: 404 on Page Refresh (Vercel)
**Solution**: vercel.json is configured with SPA rewrite. Ensure it's in project root.

### Issue: PDF Upload Fails
**Possible Causes**:
- File > 10 MB: Increase `MAX_DEMO_FILE_SIZE_BYTES`
- Invalid PDF: Ensure valid PDF file
- Network timeout: Render cold start slow first request

### Issue: CORS Error
**Check**:
1. Backend CORS includes Vercel domain
2. Frontend uses correct `VITE_API_BASE_URL`
3. API is returning `Access-Control-Allow-Origin` header

### Issue: Slow Backend Responses
**Solutions**:
- Upgrade Render plan (cold start delay)
- Implement request caching
- Optimize PDF extraction service

---

## Security Notes

### Current (Demo)
- Public CORS
- SQLite (no auth required)
- No rate limiting
- Local file storage (unsafe)

### For Production
- [ ] Add authentication (JWT, OAuth)
- [ ] Add rate limiting (FastAPI middleware)
- [ ] Use HTTPS only (automatic)
- [ ] Migrate to PostgreSQL with user context
- [ ] Move uploads to S3 + signed URLs
- [ ] Add API key validation
- [ ] Sanitize file uploads

---

## Performance Optimization

### Frontend
```javascript
// Already configured in vite.config.js
- React Fast Refresh
- Automatic code splitting (Vite)
- Tailwind CSS minification
- PDF.js external worker
```

### Backend
```python
# Recommendations:
- Add async extraction for large files
- Cache extraction results
- Add request/response compression
- Use connection pooling for database
```

---

## Contact & Support

For issues or updates:
- GitHub: [nirnay-ai](github.com/your-org/nirnay-ai)
- Issues: [GitHub Issues](github.com/your-org/nirnay-ai/issues)
