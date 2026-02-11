# Pokemon TCG Vending Machine Search

Search and claim cards from the TCG vending machine inventory.

## Features

- 🔍 Real-time search powered by Algolia
- 🎴 Card claiming system with Supabase backend
- ⚡ Serverless API routes on Vercel
- ✅ Comprehensive test coverage

## Project Structure

```
/
├── tcg-search/          # React frontend application
├── api/                 # Vercel serverless API routes
├── data/                # Algolia index creation scripts
├── vercel.json          # Vercel deployment configuration
└── .vercelignore        # Files excluded from deployment
```

## Development

### Prerequisites

- Node.js 18+
- Vercel CLI: `npm i -g vercel`
- Supabase account (for claims backend)

### Local Development

**Run full stack locally (frontend + API):**

```bash
npm run dev
# or
vercel dev
```

This starts:
- React dev server at `http://localhost:3000`
- API routes at `http://localhost:3000/api/*`

**Run frontend only (no API):**

```bash
cd tcg-search
npm start
```

### Environment Variables

Required for local development (`.env` in `tcg-search/`):

```bash
# Algolia
REACT_APP_ALGOLIA_APP_ID=your_app_id
REACT_APP_ALGOLIA_API_KEY=your_search_key
REACT_APP_ALGOLIA_INDEX_NAME=your_index_name
REACT_APP_USER_TOKEN=your_user_token

# Supabase
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_key
```

## Testing

```bash
cd tcg-search

# Interactive watch mode
npm test

# One-time run with coverage
npm run test:ci
```

See [tcg-search/TESTING.md](tcg-search/TESTING.md) for detailed testing documentation.

## Deployment

### First Time Setup

1. **Link to Vercel project:**
   ```bash
   vercel link
   ```

2. **Add environment variables in Vercel dashboard:**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env` (see above)
   - Make sure to add them for all environments (Production, Preview, Development)

### Deploy

**Deploy from repository root** (not `tcg-search/`):

```bash
# Preview deployment
npm run deploy
# or
vercel

# Production deployment
npm run deploy:prod
# or
vercel --prod
```

The `vercel.json` configuration handles the mono-repo structure automatically.

### What Gets Deployed

- ✅ React frontend (built from `tcg-search/`)
- ✅ API routes (from `api/`)
- ✅ Serverless functions configuration
- ❌ Data scripts (excluded via `.vercelignore`)
- ❌ Tests and coverage (excluded)

## Architecture

### Frontend (`/tcg-search`)
- **Framework:** React 18 with Create React App
- **Search:** Algolia InstantSearch v7
- **Styling:** Custom CSS

### Backend (`/api`)
- **Platform:** Vercel Serverless Functions
- **Database:** Supabase (Postgres)
- **API Routes:**
  - `POST /api/claims/create` - Submit card claim

### Security
- Row Level Security (RLS) enabled on Supabase
- Rate limiting: 5 claims per hour per email
- Server-side validation for all inputs

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make changes and test locally with `vercel dev`
3. Run tests: `cd tcg-search && npm run test:ci`
4. Commit with semantic prefixes: `feat:`, `fix:`, `chore:`, etc.
5. Push and create a PR

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for detailed contribution guidelines.

## License

Private repository - see LICENSE file for details.
