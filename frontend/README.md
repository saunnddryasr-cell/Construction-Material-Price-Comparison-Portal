# Buildwise frontend

A React + Vite interface for the Construction Material Price Comparison Portal.

## Run locally

Start the API in one terminal from the project root:

```bash
cd backend
npm install
cp .env.example .env
# Set MONGODB_URI and both JWT secrets in backend/.env.
npm run dev
```

Then start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite app runs on port 5174. Set `VITE_API_URL` in `.env` to the backend API base URL, including `/api`. The development default is `http://localhost:5000/api`. Demo materials are shown only in development; API failures are surfaced in the material directory.

## Deploy to Vercel

Deploy `frontend/` and `backend/` as separate Vercel projects. Set each project's Root Directory to its folder.

1. Deploy the backend first. Configure `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`, and `CORS_ORIGIN` in the backend project's Vercel environment. Use separate random JWT secrets of at least 32 characters. `CORS_ORIGIN` must be the exact frontend origin, for example `https://construction-material-price-compari-six.vercel.app`.
2. Set `VITE_API_URL` in the frontend project's Vercel environment to the deployed backend origin followed by `/api` (for example `https://<backend-project>.vercel.app/api`). Redeploy the frontend after setting it; Vite embeds this value at build time.
3. If using a different frontend domain or Vercel preview domain, add that exact origin to the comma-separated `CORS_ORIGIN` value and redeploy the backend.
4. Confirm the backend responds at `/health`, `/api/test`, and `/api/materials`, then open a nested frontend route directly to verify Vercel's SPA rewrite.

Do not commit `.env` files or use a placeholder MongoDB URI in Vercel. See [the Postman collection](../backend/postman/Buildwise%20API.postman_collection.json) for read-only smoke tests; set its `baseUrl` variable to the backend origin without `/api`.

The backend `.env` file was previously tracked in Git. Removing it from the current index does not erase prior commits; rotate the MongoDB credential and both JWT secrets if that history was pushed or shared.
