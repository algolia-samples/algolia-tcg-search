#!/usr/bin/env python3
"""
Scaffold a new TCG event:
1. Creates {event_id}_tcg_cards + replica indices in Algolia
2. Applies algolia-config.json settings to new indices
3. Inserts record into tcg_events index

Usage:
    python create_event.py <event_id> <event_name> <booth> [--venue <venue>]

Example:
    python create_event.py shoptalk-2026 "Shoptalk 2026" 314 --venue "Mandalay Bay"
"""

import os
import sys
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv
from algoliasearch.search.client import SearchClientSync

load_dotenv(Path(__file__).parent.parent / ".env")

ALGOLIA_APP_ID = os.getenv("ALGOLIA_APP_ID")
ALGOLIA_API_KEY = os.getenv("ALGOLIA_API_KEY")
EVENTS_INDEX = os.getenv("ALGOLIA_EVENTS_INDEX", "tcg_events")
CARD_CONFIG_FILE = Path(__file__).parent.parent / "algolia-config.json"


def main():
    parser = argparse.ArgumentParser(description="Scaffold a new TCG event")
    parser.add_argument("event_id", help="Event slug, e.g. shoptalk-2026")
    parser.add_argument("event_name", help='Human-readable name, e.g. "Shoptalk 2026"')
    parser.add_argument("booth", help="Booth number, e.g. 314")
    parser.add_argument("--venue", default="", help="Venue name (optional)")
    args = parser.parse_args()

    if not ALGOLIA_APP_ID or not ALGOLIA_API_KEY:
        print("ERROR: Missing Algolia credentials in .env file")
        sys.exit(1)

    if not CARD_CONFIG_FILE.exists():
        print(f"ERROR: Config file not found: {CARD_CONFIG_FILE}")
        sys.exit(1)

    client = SearchClientSync(ALGOLIA_APP_ID, ALGOLIA_API_KEY)

    primary = f"tcg_cards_{args.event_id}"
    price_asc = f"{primary}_price_asc"
    price_desc = f"{primary}_price_desc"

    with open(CARD_CONFIG_FILE) as f:
        card_config = json.load(f)

    # Create primary index with replica references
    print(f"Creating and configuring {primary}...")
    primary_config = {**card_config, "replicas": [price_asc, price_desc]}
    client.set_settings(index_name=primary, index_settings=primary_config)
    print(f"  ✓ {primary}")

    # Configure replica indices: inherit full card config, override ranking
    for replica_name, sort_direction in [(price_asc, "asc"), (price_desc, "desc")]:
        print(f"Configuring {replica_name}...")
        replica_config = {
            **card_config,
            "ranking": [f"{sort_direction}(estimated_value)"],
        }
        client.set_settings(index_name=replica_name, index_settings=replica_config)
        print(f"  ✓ {replica_name}")

    # Insert event record into tcg_events
    event_record = {
        "objectID": args.event_id,
        "event_id": args.event_id,
        "name": args.event_name,
        "booth": args.booth,
        "venue": args.venue,
        "current": False,
    }

    print(f"\nAdding event record to {EVENTS_INDEX}...")
    client.save_objects(index_name=EVENTS_INDEX, objects=[event_record])
    print(f"  ✓ Event '{args.event_id}' created (current=false)")
    print(f"\nRun: python set_active_event.py {args.event_id}  — to make this the active event.")


if __name__ == "__main__":
    main()
