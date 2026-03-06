#!/usr/bin/env python3
"""
Delete a TCG event from Algolia:
  1. Delete virtual replica indices (price_asc, price_desc)
  2. Delete primary card index
  3. Delete the tcg_events record

Usage:
    python delete_event.py <event_id> [--yes]

Example:
    python delete_event.py lindas-booze-cruise --yes
"""

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from algoliasearch.search.client import SearchClientSync

load_dotenv(Path(__file__).parent.parent / ".env")

ALGOLIA_APP_ID = os.getenv("ALGOLIA_APP_ID")
ALGOLIA_API_KEY = os.getenv("ALGOLIA_API_KEY")
EVENTS_INDEX = os.getenv("ALGOLIA_EVENTS_INDEX", "tcg_events")


def main():
    parser = argparse.ArgumentParser(description="Delete a TCG event from Algolia")
    parser.add_argument("event_id", help="Event slug to delete, e.g. lindas-booze-cruise")
    parser.add_argument("--yes", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()

    if not ALGOLIA_APP_ID or not ALGOLIA_API_KEY:
        print("ERROR: Missing Algolia credentials in .env file")
        sys.exit(1)

    client = SearchClientSync(ALGOLIA_APP_ID, ALGOLIA_API_KEY)

    # Verify event exists before doing anything
    try:
        client.get_object(index_name=EVENTS_INDEX, object_id=args.event_id)
    except Exception:
        print(f"ERROR: Event '{args.event_id}' not found in {EVENTS_INDEX}.")
        sys.exit(1)

    primary = f"tcg_cards_{args.event_id}"
    price_asc = f"{primary}_price_asc"
    price_desc = f"{primary}_price_desc"

    if not args.yes:
        print(f"This will permanently delete:")
        print(f"  {price_asc}")
        print(f"  {price_desc}")
        print(f"  {primary}")
        print(f"  {EVENTS_INDEX}/{args.event_id}")
        confirm = input(f"\nType the event ID to confirm: ").strip()
        if confirm != args.event_id:
            print("Aborted.")
            sys.exit(0)

    # Unlink virtual replicas before deleting them (Algolia requires this)
    # set_settings is async — wait for the task to complete before proceeding
    print(f"\nRemoving replica references from {primary}...")
    try:
        resp = client.set_settings(index_name=primary, index_settings={"replicas": []})
        client.wait_for_task(index_name=primary, task_id=resp.task_id)
        print(f"  ✓ Replicas unlinked")
    except Exception as e:
        print(f"  WARNING: Could not unlink replicas: {e}", file=sys.stderr)

    # Now safe to delete replicas, then primary
    for index_name in [price_asc, price_desc, primary]:
        try:
            client.delete_index(index_name=index_name)
            print(f"  ✓ Deleted index: {index_name}")
        except Exception as e:
            print(f"  WARNING: Could not delete {index_name}: {e}", file=sys.stderr)

    client.delete_object(index_name=EVENTS_INDEX, object_id=args.event_id)
    print(f"  ✓ Deleted event record: {args.event_id}")


if __name__ == "__main__":
    main()
