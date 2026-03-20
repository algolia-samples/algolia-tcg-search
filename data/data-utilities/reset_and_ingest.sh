#!/bin/bash
# Re-ingest all card data for an existing event: clear index, ingest all card sets, enrich chase cards.
# The event must already exist (run setup_event.sh to create a new event).
#
# Usage:
#   ./reset_and_ingest.sh [event_id]
#
# Examples:
#   ./reset_and_ingest.sh etail-palm-springs-2026
#   ALGOLIA_EVENT_ID=etail-palm-springs-2026 ./reset_and_ingest.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Accept event_id as an argument, falling back to env var from .env
if [ -n "$1" ]; then
  export ALGOLIA_EVENT_ID="$1"
fi

if [ -z "$ALGOLIA_EVENT_ID" ]; then
  echo "ERROR: event_id required. Pass it as an argument or set ALGOLIA_EVENT_ID in data/.env"
  echo "Usage: $0 <event_id>"
  exit 1
fi

echo "Re-ingesting cards for event: $ALGOLIA_EVENT_ID"
echo ""

echo "========================================"
echo "Step 1/3: Clearing Algolia index"
echo "========================================"
poetry run python clear_index.py --yes

echo ""
echo "========================================"
echo "Step 2/3: Ingesting card data"
echo "========================================"
poetry run python ingest.py

echo ""
echo "========================================"
echo "Step 3/3: Enriching chase cards"
echo "========================================"
XLSX_FILE="$SCRIPT_DIR/../data-files/$ALGOLIA_EVENT_ID/TCG Search Website - Raw List.xlsx"
if [ -f "$XLSX_FILE" ]; then
  poetry run python enrich_chase_cards.py
else
  echo "  Skipped — TCG Search Website - Raw List.xlsx not found for this event"
fi

echo ""
echo "========================================"
echo "Reset complete!"
echo "========================================"
