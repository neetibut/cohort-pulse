# Deploy — Render (backend) + Vercel (frontend)

The only difference between localhost and production is environment-variable
*values*. The code is identical.

## 1. Push to GitHub

```bash
gh repo create cohort-pulse --public --source=. --push
# or create on github.com, then: git remote add origin <url> && git push -u origin main
```

## 2. Backend → Render

1. **New → Key Value** (Redis). Create it (free). Copy the **Internal** connection
   URL. Do this first — the web service needs it.
2. **New → Web Service →** connect the repo.
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
3. **Environment variables:**

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | Atlas connection string |
   | `REDIS_URL` | Render Key Value **internal** URL |
   | `CLIENT_ORIGIN` | placeholder for now — fill after Vercel |
   | `PORT` | leave unset (Render injects it) |

4. Create the service. When live, open `https://<service>.onrender.com/health`
   → expect `{"ok":true}`.

> Or use the included `render.yaml` blueprint (New → Blueprint) to create both
> services at once, then set `MONGODB_URI` and `CLIENT_ORIGIN` in the dashboard.

## 3. Frontend → Vercel

1. **Add New → Project →** import the repo.
   - **Root Directory:** `client`
   - Framework auto-detects **Vite** (build `npm run build`, output `dist`).
2. **Environment Variable:** `VITE_API_URL = https://<service>.onrender.com`
   (no trailing slash).
3. Deploy. Copy the `https://cohort-pulse-xxxx.vercel.app` URL.

## 4. Close the CORS loop (the step everyone forgets)

Back in **Render → Environment → `CLIENT_ORIGIN`**, set it to the exact Vercel URL
and save (Render redeploys). Without this, the browser blocks the WebSocket.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Mongo connect timeout | Atlas Network Access must allow `0.0.0.0/0`; URL-encode special chars in the password |
| Backend boots then crashes | Missing/typo'd `MONGODB_URI` or `REDIS_URL` — read Render logs, they name the failing connection |
| Blank frontend / API calls fail | `VITE_API_URL` typo or trailing slash; Vite reads it at build time — **redeploy** after changing |
| CORS / socket won't connect | `CLIENT_ORIGIN` on Render must match the Vercel origin character-for-character; redeploy |
| First request very slow | Free tier cold start — warm it by hitting `/health` before the demo |
