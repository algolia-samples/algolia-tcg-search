#!/bin/bash
# Full reset: clear index, ingest all card sets, enrich chase cards.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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
poetry run python enrich_chase_cards.py

echo ""
echo "========================================"
echo "Reset complete!"
echo "========================================"
