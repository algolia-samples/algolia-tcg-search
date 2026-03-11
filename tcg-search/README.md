# tcg-search

React frontend for the Pokemon TCG vending machine search. Deployed on Vercel.

## Tech Stack

- **React 18** with Vite
- **Algolia InstantSearch v7** for search
- **Supabase JS** for real-time claim subscriptions
- **Vercel Serverless Functions** (`api/`) for the claims API
- **Vitest** + Testing Library for tests
- **ESLint** for linting

## Project Structure

```
tcg-search/
├── src/
│   ├── components/       # UI components
│   ├── context/          # EventContext — active event config
│   ├── utilities/        # Algolia & Supabase client setup
│   └── assets/           # Icons and logos
├── api/
│   └── claims/create.js  # POST /api/claims/create (serverless)
└── public/               # Static assets
```

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in credentials:

```bash
# Algolia
VITE_ALGOLIA_APP_ID=
VITE_ALGOLIA_API_KEY=
VITE_ALGOLIA_INDEX_NAME=
VITE_USER_TOKEN=
VITE_ALGOLIA_CHAT_AGENT_ID=   # optional

# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=           # server-side only

# Algolia write key (server-side only, used by claims API)
ALGOLIA_WRITE_API_KEY=
```

## Development

From inside `tcg-search/`:

```bash
# Frontend only (Vite, no API routes)
npm start          # http://localhost:5173
```

API routes are not available locally. To test the claims API, use a Vercel preview deployment.

## Testing

```bash
# Interactive watch mode
npm test

# One-time run with coverage report
npm run test:ci
```

Tests live alongside components (`*.test.jsx`) and the API handler (`api/claims/create.test.js`).

## Linting

```bash
npm run lint
```

## Deployment

Deployed automatically via Vercel on merge to `main`. See the [root README](../README.md) for deployment details.
