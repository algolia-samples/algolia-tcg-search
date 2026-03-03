#!/bin/bash
# Set up a new TCG event end-to-end:
#   1. Create Algolia indices and tcg_events record
#   2. Mark event as active (current:true)
#   3. Clear any existing card data in the new index
#   4. Ingest all card CSVs
#   5. Enrich chase cards
#
# Usage:
#   ./setup_event.sh <event_id> <event_name> <booth> [venue]
#
# Example:
#   ./setup_event.sh etail-west-2026 "Etail West 2026" 701 "Long Beach Convention Center"
#   ./setup_event.sh shoptalk-2026 "Shoptalk 2026" 314

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Argument validation ────────────────────────────────────────────────────────

if [ $# -lt 3 ]; then
  echo "Usage: $0 <event_id> <event_name> <booth> [venue]"
  echo ""
  echo "  event_id    Slug used for index names and URLs, e.g. etail-west-2026"
  echo "  event_name  Human-readable name (quote it), e.g. \"Etail West 2026\""
  echo "  booth       Booth number, e.g. 701"
  echo "  venue       (optional) Venue name, e.g. \"Long Beach Convention Center\""
  exit 1
fi

EVENT_ID="$1"
EVENT_NAME="$2"
BOOTH="$3"
VENUE="${4:-}"

# ── Env var check ──────────────────────────────────────────────────────────────

ENV_FILE="$SCRIPT_DIR/../.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: data/.env not found — copy data/.env.example and fill in credentials"
  exit 1
fi

# Let python-dotenv handle loading (it handles CRLF correctly).
# Just do a quick grep to catch obviously missing credentials before running.
if ! grep -qE "^ALGOLIA_APP_ID=.+" "$ENV_FILE" || ! grep -qE "^ALGOLIA_API_KEY=.+" "$ENV_FILE"; then
  echo "ERROR: ALGOLIA_APP_ID and ALGOLIA_API_KEY must be set in data/.env"
  exit 1
fi

# Export event ID so ingest/configure/clear scripts pick it up
export ALGOLIA_EVENT_ID="$EVENT_ID"

# ── Summary ────────────────────────────────────────────────────────────────────

echo "========================================"
echo "  TCG Event Setup"
echo "========================================"
echo "  Event ID   : $EVENT_ID"
echo "  Event Name : $EVENT_NAME"
echo "  Booth      : $BOOTH"
[ -n "$VENUE" ] && echo "  Venue      : $VENUE"
echo "  Index      : tcg_cards_${EVENT_ID}"
echo "========================================"
echo ""

# ── Step 1: Create event record + Algolia indices ──────────────────────────────

echo "========================================"
echo "Step 1/5: Creating event record and Algolia indices"
echo "========================================"
if [ -n "$VENUE" ]; then
  poetry run python create_event.py "$EVENT_ID" "$EVENT_NAME" "$BOOTH" --venue "$VENUE"
else
  poetry run python create_event.py "$EVENT_ID" "$EVENT_NAME" "$BOOTH"
fi

# ── Step 2: Set event as active ────────────────────────────────────────────────

echo ""
echo "========================================"
echo "Step 2/5: Setting '$EVENT_ID' as the active event"
echo "========================================"
poetry run python set_active_event.py "$EVENT_ID"

# ── Step 3: Clear index ────────────────────────────────────────────────────────

echo ""
echo "========================================"
echo "Step 3/5: Clearing index tcg_cards_${EVENT_ID}"
echo "========================================"
poetry run python clear_index.py --yes

# ── Step 4: Ingest card data ───────────────────────────────────────────────────

echo ""
echo "========================================"
echo "Step 4/5: Ingesting card data"
echo "========================================"
poetry run python ingest.py

# ── Step 5: Enrich chase cards ─────────────────────────────────────────────────

echo ""
echo "========================================"
echo "Step 5/5: Enriching chase cards"
echo "========================================"
poetry run python enrich_chase_cards.py

# ── Done ───────────────────────────────────────────────────────────────────────

echo ""
echo "========================================"
echo "  Event setup complete!"
echo "========================================"
echo ""
echo "Algolia indices created:"
echo "  tcg_cards_${EVENT_ID}"
echo "  tcg_cards_${EVENT_ID}_price_asc"
echo "  tcg_cards_${EVENT_ID}_price_desc"
echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  ACTION REQUIRED — Supabase migration                       │"
echo "│                                                             │"
echo "│  If you haven't already, run this SQL in the Supabase       │"
echo "│  dashboard (SQL editor) to add event scoping to claims:     │"
echo "│                                                             │"
echo "│  ALTER TABLE claims                                         │"
echo "│    ADD COLUMN IF NOT EXISTS event_id TEXT                   │"
echo "│    NOT NULL DEFAULT 'etail-west-2026';                      │"
echo "│                                                             │"
echo "│  CREATE INDEX IF NOT EXISTS claims_event_id_idx             │"
echo "│    ON claims (event_id);                                    │"
echo "│                                                             │"
echo "│  This is a one-time migration — skip if already applied.    │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""
echo "The app at / will now redirect to /$EVENT_ID"
