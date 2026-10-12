#!/bin/bash
# Re-ingest all card data for an existing event: clear index, ingest all card sets, enrich chase cards.
# The event must already exist (run setup_event.sh to create a new event).
#
# Usage:
#   ./reset_and_ingest.sh [event_id] [ingest.py flags, e.g. --merge]
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
if [ -n "$1" ] && [ "${1#-}" = "$1" ]; then
  export ALGOLIA_EVENT_ID="$1"
  shift
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

# This script clears the index before ingest.py sees its flags, so the flags that only
# make sense without a clear are refused, and --merge is checked before anything is cleared.
MERGE=0
for arg in "$@"; do
  case "$arg" in
    --dump-json|--dump-json=*)
      echo "ERROR: --dump-json would clear the index and upload nothing. Run ingest.py directly to preview."
      exit 1
      ;;
    --merge) MERGE=1 ;;
  esac
done

echo "Re-ingesting cards for event: $ALGOLIA_EVENT_ID"
echo ""

if [ "$MERGE" = 1 ]; then
  echo "========================================"
  echo "Preflight: checking the merge (index is not touched)"
  echo "========================================"
  PREFLIGHT="$(mktemp)"
  if ! "$PYTHON" ingest.py "$@" --dump-json "$PREFLIGHT"; then
    rm -f "$PREFLIGHT"
    echo ""
    echo "Preflight failed. The index was NOT cleared."
    exit 1
  fi
  rm -f "$PREFLIGHT"
  echo ""
fi

echo "========================================"
echo "Step 1/3: Clearing Algolia index"
echo "========================================"
"$PYTHON" clear_index.py --yes

echo ""
echo "========================================"
echo "Step 2/3: Ingesting card data"
echo "========================================"
"$PYTHON" ingest.py "$@"

echo ""
echo "========================================"
echo "Step 3/3: Enriching chase cards"
echo "========================================"
XLSX_FILE="$SCRIPT_DIR/../data-files/$ALGOLIA_EVENT_ID/TCG Search Website - Raw List.xlsx"
if [ "$MERGE" = 1 ]; then
  echo "  Skipped — it reads one fixed workbook and would override the merged inventory"
elif [ -f "$XLSX_FILE" ]; then
  "$PYTHON" enrich_chase_cards.py
else
  echo "  Skipped — TCG Search Website - Raw List.xlsx not found for this event"
fi

echo ""
echo "========================================"
echo "Reset complete!"
echo "========================================"
