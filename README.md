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
│   ├── src/
│   │   ├── components/  # React components (search, carousels, modals, chat)
│   │   ├── utilities/   # Algolia & Supabase client setup
│   │   └── assets/      # Logos and icons
│   ├── api/             # Vercel serverless API routes
│   └── public/          # Static assets
├── data/                # Algolia index management
│   ├── data-files/      # CSV inventory data
│   └── data-utilities/  # Python scripts for indexing
├── vercel.json          # Vercel deployment configuration
└── .vercelignore        # Files excluded from deployment
```

## Prerequisites

### Required Accounts
- **[Algolia](https://www.algolia.com/)** - Search service (free tier available)
- **[Supabase](https://supabase.com/)** - Database backend (free tier available)
- **[Vercel](https://vercel.com/)** - Hosting platform (free tier available)

### Local Development Tools
- **Node.js 20+** (required by @supabase/supabase-js)
  ```bash
  node --version  # Should be v20.0.0 or higher
  ```
- **Vercel CLI**: `npm i -g vercel`
- **Python 3.x + Poetry** (only needed for updating Algolia index)

### Tech Stack
- React 18 with Algolia InstantSearch v7
- Supabase JS Client for real-time subscriptions
- Vercel Serverless Functions

## Development

### Local Development

**Run frontend only (fast, no API):**

```bash
npm run dev
```

Starts Vite dev server at `http://localhost:5173`.

**Run full stack locally (frontend + API routes):**

```bash
npm run serve
```

Starts Vercel dev server at `http://localhost:3000` with API routes available at `http://localhost:3000/api/*`.

### Environment Variables

Required for local development (`.env` in `tcg-search/`):

```bash
# Algolia
VITE_ALGOLIA_APP_ID=your_app_id
VITE_ALGOLIA_API_KEY=your_search_key
VITE_ALGOLIA_INDEX_NAME=your_index_name
VITE_USER_TOKEN=your_user_token
VITE_ALGOLIA_CHAT_AGENT_ID=your_chat_agent_id  # optional

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_key  # server-side only, not exposed to browser

# Algolia (server-side only)
ALGOLIA_WRITE_API_KEY=your_write_key  # server-side only, used by claims API
```

## Event Management

Card inventory is managed via CSV exports from the master spreadsheet, ingested into Algolia via Python scripts in `data/data-utilities/`. See [`data/data-utilities/README.md`](data/data-utilities/README.md) for details on individual scripts, CSV format, and output schema.

### Prerequisites

Install Python dependencies and configure credentials:

```bash
cd data/data-utilities
poetry install
```

Create `data/.env` from `data/.env.example`:

```
ALGOLIA_APP_ID=your-app-id
ALGOLIA_API_KEY=your-admin-api-key
ALGOLIA_EVENTS_INDEX=tcg_events
ALGOLIA_EVENT_ID=my-event-2026  # only needed when running scripts directly
```

### Setting Up a New Event

Run `setup_event.sh` from the repo root to bootstrap a new event end-to-end:

```bash
./setup_event.sh <event_id> <event_name> <booth> [venue] [--no-activate]

# Example:
./setup_event.sh etail-palm-springs-2026 "eTail Palm Springs 2026" 701 "JW Marriott Desert Springs Resort"
```

The script runs six steps:

**Step 1 — Create indices and event record** (`create_event.py`)

Creates the primary card index `tcg_cards_{event_id}` and two virtual replica indices (`_price_asc`, `_price_desc`) in Algolia, applies settings from `algolia-config.json` to the primary (replicas inherit automatically), and inserts a record into `tcg_events` with `current: false`.

**Step 2 — Clear the index** (`clear_index.py`)

Wipes any existing card records from `tcg_cards_{event_id}`. Preserves index settings. (Useful when re-running setup after a partial failure.)

**Step 3 — Ingest card data** (`ingest.py`)

Reads all CSV files from `data/data-files/{event_id}/`, enriches each card with image URLs and type data from the TCGdex API, and uploads records to `tcg_cards_{event_id}`.

> If no CSVs are found, setup exits cleanly with instructions to add files and run `reset_and_ingest.sh` when ready.

**Step 4 — Enrich chase cards** (`enrich_chase_cards.py`)

Reads the master XLSX spreadsheet to identify chase cards, then applies partial updates to the correct records already in Algolia. Skipped if no XLSX is present.

**Step 5 — Create Agent Studio agent** (`agent/agent.py`)

Creates an Algolia Agent Studio agent configured for the new event.

**Step 6 — Activate the event** (`set_active_event.py`)

Sets the new event to `current: true` in `tcg_events`, clearing `current` from any previously active event. The frontend reads this to determine which event to display. Pass `--no-activate` to skip this step and activate manually later.

### Re-ingesting an Existing Event

When card CSVs change but the event already exists, use `reset_and_ingest.sh` to re-run Steps 2–4 without recreating indices or touching the events record:

```bash
data/data-utilities/reset_and_ingest.sh <event_id>

# Example:
data/data-utilities/reset_and_ingest.sh etail-palm-springs-2026
```

### Switching the Active Event

To make a different (already set-up) event the active one:

```bash
cd data/data-utilities
poetry run python set_active_event.py list          # see all events
poetry run python set_active_event.py set <event_id>
```

This is a safe, non-destructive operation — it only updates the `current` field in `tcg_events`. The frontend will redirect to the new event on next load.

## Testing

```bash
cd tcg-search

# Interactive watch mode
npm test

# One-time run with coverage
npm run test:ci
```

See [tcg-search/README.md](tcg-search/README.md) for more details on the frontend.

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

Build and root directory settings are configured in the Vercel dashboard (Root Directory: `tcg-search`).

### What Gets Deployed

- ✅ React frontend (built from `tcg-search/`)
- ✅ API routes (from `api/`)
- ✅ Serverless functions configuration
- ❌ Data scripts (excluded via `.vercelignore`)
- ❌ Tests and coverage (excluded)

## Architecture

### Frontend (`/tcg-search`)
- **Framework:** React 18 with Vite
- **Search:** Algolia InstantSearch v7
- **Styling:** Custom CSS

### Backend (`/api`)
- **Platform:** Vercel Serverless Functions
- **Database:** Supabase (Postgres)
- **API Routes:**
  - `POST /api/claims/create` - Submit card claim

### Supabase: `claims` Table

Required table in your Supabase project. Run [`data/supabase_claims_table.sql`](data/supabase_claims_table.sql) in the Supabase SQL editor to create the table and policies:

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` | Primary key, auto-increment |
| `card_id` | `text` | Algolia `objectID` (e.g., `sv08-102`) |
| `pokemon_name` | `text` | |
| `card_number` | `text` | |
| `set_name` | `text` | |
| `card_value` | `numeric` | Nullable |
| `image_url` | `text` | Nullable |
| `claimer_first_name` | `text` | |
| `claimer_last_name` | `text` | |
| `claimer_name` | `text` | Legacy field, nullable |
| `claimed_at` | `timestamptz` | Default: `now()` |

Enable Row Level Security (RLS). The anon role is granted SELECT on all rows — the table contains no sensitive PII (no email). Inserts go through the server-side API using the service_role key.

### Security
- Row Level Security (RLS) enabled on Supabase
- Server-side validation for all inputs
- `SUPABASE_SECRET_KEY` and `ALGOLIA_WRITE_API_KEY` are server-side only, never exposed to the browser

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make changes and test locally with `npm run serve`
3. Run tests: `cd tcg-search && npm run test:ci`
4. Commit with semantic prefixes: `feat:`, `fix:`, `chore:`, etc.
5. Push and create a PR

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for detailed contribution guidelines.

## License

Private repository - see LICENSE file for details.
