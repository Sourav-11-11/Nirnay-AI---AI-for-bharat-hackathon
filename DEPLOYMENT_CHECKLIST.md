# DEPLOYMENT CHECKLIST

## Pre-Deployment
- [ ] Run `npm run build` in frontend/ - must pass
- [ ] Run backend tests locally: `python -m pytest` (if tests exist)
- [ ] Verify all localhost URLs are removed from code
- [ ] Check .env.production files exist with correct URLs
- [ ] Verify no secrets/API keys in git (check .gitignore)

## Vercel Frontend Deployment
- [ ] Create Vercel account & connect GitHub repo
- [ ] Project settings: Framework = Vite, Build cmd = `npm run build`, Output = `dist`
- [ ] Environment: `VITE_API_BASE_URL=https://nirnay-ai-api.onrender.com`
- [ ] Check "Deploy on every push" enabled
- [ ] First deploy triggers - wait for completion
- [ ] Visit `https://nirnay-ai.vercel.app` and verify loads
- [ ] Test upload → extraction flow
- [ ] Verify console has no CORS errors

## Render Backend Deployment
- [ ] Create Render account & connect GitHub repo
- [ ] Service type: Web Service
- [ ] Environment: Python 3.11
- [ ] Build: `pip install -r requirements.txt`
- [ ] Start: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000`
- [ ] Environment: `FRONTEND_URL=https://nirnay-ai.vercel.app`
- [ ] First deploy triggers - wait for completion
- [ ] Test health endpoint: `curl https://nirnay-ai-api.onrender.com/health`
- [ ] Verify CORS by testing from Vercel domain

## Post-Deployment Verification
- [ ] Upload PDF to `https://nirnay-ai.vercel.app`
- [ ] Verify extraction completes
- [ ] Click an action card → PDF jumps to correct page
- [ ] Check Browser DevTools → Network tab shows no 404s
- [ ] Check Browser Console → no CORS/security errors
- [ ] Test on mobile (responsive design check)

## Production Monitoring
- [ ] Set up error tracking (Sentry, Vercel Analytics)
- [ ] Monitor Render API logs for crashes
- [ ] Set up uptime monitoring on `/health` endpoint
- [ ] Create backup strategy for uploaded PDFs
- [ ] Document support process

## Future Upgrades (Optional)
- [ ] Migrate SQLite to PostgreSQL
- [ ] Implement user authentication
- [ ] Move uploads to S3
- [ ] Add rate limiting
- [ ] Implement caching layer
