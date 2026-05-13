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

PYTHON="$SCRIPT_DIR/.venv/bin/python"
if [ ! -f "$PYTHON" ]; then
  echo "ERROR: .venv not found — run: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

# Accept event_id as an argument, falling back to env var, then interactive selection
if [ -n "$1" ]; then
  export ALGOLIA_EVENT_ID="$1"
fi

if [ -z "$ALGOLIA_EVENT_ID" ]; then
  DATA_FILES_DIR="$SCRIPT_DIR/../data-files"

  if [ ! -d "$DATA_FILES_DIR" ]; then
    echo "ERROR: data-files directory not found: $DATA_FILES_DIR"
    exit 1
  fi

  events=()
  while IFS= read -r dir; do
    events+=("$(basename "$dir")")
  done < <(find "$DATA_FILES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

  if [ ${#events[@]} -eq 0 ]; then
    echo "ERROR: No events found in $DATA_FILES_DIR"
    exit 1
  fi

  echo "Select an event:"
  select event in "${events[@]}"; do
    if [ -n "$event" ]; then
      export ALGOLIA_EVENT_ID="$event"
      break
    fi
    echo "Invalid selection. Try again."
  done
fi

echo "Re-ingesting cards for event: $ALGOLIA_EVENT_ID"
echo ""

echo "========================================"
echo "Step 1/3: Clearing Algolia index"
echo "========================================"
"$PYTHON" clear_index.py --yes

echo ""
echo "========================================"
echo "Step 2/3: Ingesting card data"
echo "========================================"
"$PYTHON" ingest.py

echo ""
echo "========================================"
echo "Step 3/3: Enriching chase cards"
echo "========================================"
XLSX_FILE="$SCRIPT_DIR/../data-files/$ALGOLIA_EVENT_ID/TCG Search Website - Raw List.xlsx"
if [ -f "$XLSX_FILE" ]; then
  "$PYTHON" enrich_chase_cards.py
else
  echo "  Skipped — TCG Search Website - Raw List.xlsx not found for this event"
fi

echo ""
echo "========================================"
echo "Reset complete!"
echo "========================================"
