#!/usr/bin/env python3
"""
Copy all records from one Algolia index to another.
Settings, synonyms, and rules are NOT copied — only records.

Usage:
  poetry run python copy_index_records.py <source_index> <dest_index>

Example:
  poetry run python copy_index_records.py etail-west-tcg_cards tcg_cards_etail-palm-springs-2026
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from algoliasearch.search.client import SearchClientSync

load_dotenv(Path(__file__).parent.parent / ".env")

ALGOLIA_APP_ID = os.getenv("ALGOLIA_APP_ID")
ALGOLIA_API_KEY = os.getenv("ALGOLIA_API_KEY")

if not ALGOLIA_APP_ID or not ALGOLIA_API_KEY:
    print("ERROR: ALGOLIA_APP_ID and ALGOLIA_API_KEY must be set in data/.env")
    sys.exit(1)

if len(sys.argv) != 3:
    print(f"Usage: {sys.argv[0]} <source_index> <dest_index>")
    sys.exit(1)

source = sys.argv[1]
dest = sys.argv[2]

client = SearchClientSync(ALGOLIA_APP_ID, ALGOLIA_API_KEY)

print(f"Browsing records from '{source}'...")
records = []
client.browse_objects(
    index_name=source,
    aggregator=lambda response: records.extend(response.hits),
)
print(f"  Found {len(records)} records")

if not records:
    print("Nothing to copy.")
    sys.exit(0)

print(f"Saving to '{dest}'...")
client.save_objects(index_name=dest, objects=records)
print(f"  ✓ Copied {len(records)} records")
