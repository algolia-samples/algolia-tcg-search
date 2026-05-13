#!/bin/bash
# Tear down a TCG event:
#   1. Delete Agent Studio agent
#   2. Delete Algolia card indices + tcg_events record
#   3. Remove local data files (optional — requires --delete-data)
#
# Usage:
#   ./teardown_event.sh <event_id> [--delete-data] [--yes]
#
# Example:
#   ./teardown_event.sh lindas-booze-cruise
#   ./teardown_event.sh lindas-booze-cruise --delete-data --yes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_UTILS="$SCRIPT_DIR/data/data-utilities"
AGENT_DIR="$SCRIPT_DIR/agent"
DATA_PYTHON="$DATA_UTILS/.venv/bin/python"
AGENT_PYTHON="$AGENT_DIR/.venv/bin/python"

# ── Argument parsing ───────────────────────────────────────────────────────────

if [ $# -lt 1 ]; then
  echo "Usage: $0 <event_id> [--delete-data] [--yes]"
  echo ""
  echo "  event_id       Event slug to tear down, e.g. lindas-booze-cruise"
  echo "  --delete-data  Also remove data/data-files/<event_id>/"
  echo "  --yes          Skip confirmation prompt"
  exit 1
fi

EVENT_ID="$1"
DELETE_DATA=false
YES=false

for arg in "${@:2}"; do
  case "$arg" in
    --delete-data) DELETE_DATA=true ;;
    --yes)         YES=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Env var check ──────────────────────────────────────────────────────────────

DATA_ENV_FILE="$SCRIPT_DIR/data/.env"
if [ ! -f "$DATA_ENV_FILE" ]; then
  echo "ERROR: data/.env not found"
  exit 1
fi

# ── Confirmation ───────────────────────────────────────────────────────────────

DATA_DIR="$SCRIPT_DIR/data/data-files/$EVENT_ID"

echo "========================================"
echo "  TCG Event Teardown"
echo "========================================"
echo "  Event ID    : $EVENT_ID"
echo "  Delete data : $DELETE_DATA"
echo "========================================"
echo ""
echo "This will permanently delete:"
echo "  Agent Studio agent for $EVENT_ID"
echo "  tcg_cards_${EVENT_ID} (+ price_asc, price_desc)"
echo "  tcg_events/$EVENT_ID"
[ "$DELETE_DATA" = true ] && echo "  data/data-files/$EVENT_ID/"
echo ""

if [ "$YES" != true ]; then
  read -rp "Type the event ID to confirm: " CONFIRM
  if [ "$CONFIRM" != "$EVENT_ID" ]; then
    echo "Aborted."
    exit 0
  fi
fi

# ── Step 1: Delete Agent Studio agent ─────────────────────────────────────────

echo ""
echo "========================================"
echo "Step 1/3: Deleting Agent Studio agent"
echo "========================================"
(cd "$AGENT_DIR" && "$AGENT_PYTHON" agent.py delete "$EVENT_ID")

# ── Step 2: Delete Algolia indices + event record ──────────────────────────────

echo ""
echo "========================================"
echo "Step 2/3: Deleting Algolia indices and event record"
echo "========================================"
(cd "$DATA_UTILS" && "$DATA_PYTHON" delete_event.py "$EVENT_ID" --yes)

# ── Step 3: Remove data files (optional) ──────────────────────────────────────

echo ""
echo "========================================"
echo "Step 3/3: Data files"
echo "========================================"
if [ "$DELETE_DATA" = true ]; then
  if [ -d "$DATA_DIR" ]; then
    rm -rf "$DATA_DIR"
    echo "  ✓ Removed data/data-files/$EVENT_ID/"
  else
    echo "  Nothing to remove — data/data-files/$EVENT_ID/ not found."
  fi
else
  echo "  Skipped. To remove: rm -rf data/data-files/$EVENT_ID/"
fi

# ── Done ───────────────────────────────────────────────────────────────────────

echo ""
echo "========================================"
echo "  Teardown complete: $EVENT_ID"
echo "========================================"
