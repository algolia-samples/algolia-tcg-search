#!/usr/bin/env python3
"""
Toggle the active event in the tcg_events index:
1. Sets all records to current: false
2. Sets target event to current: true

Usage:
    python set_active_event.py <event_id>

Example:
    python set_active_event.py shoptalk-2026
"""

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv
from algoliasearch.search.client import SearchClientSync

load_dotenv(Path(__file__).parent.parent / ".env")

ALGOLIA_APP_ID = os.getenv("ALGOLIA_APP_ID")
ALGOLIA_API_KEY = os.getenv("ALGOLIA_API_KEY")
EVENTS_INDEX = os.getenv("ALGOLIA_EVENTS_INDEX", "tcg_events")


def main():
    parser = argparse.ArgumentParser(description="Set the active TCG event")
    parser.add_argument("event_id", help="Event slug to activate, e.g. shoptalk-2026")
    args = parser.parse_args()

    if not ALGOLIA_APP_ID or not ALGOLIA_API_KEY:
        print("ERROR: Missing Algolia credentials in .env file")
        sys.exit(1)

    client = SearchClientSync(ALGOLIA_APP_ID, ALGOLIA_API_KEY)

    # Browse all events to get full records
    print(f"Fetching all events from {EVENTS_INDEX}...")
    events = list(client.browse_objects(index_name=EVENTS_INDEX))

    if not events:
        print(f"ERROR: No events found in {EVENTS_INDEX}")
        sys.exit(1)

    event_ids = [e["objectID"] for e in events]
    if args.event_id not in event_ids:
        print(f"ERROR: Event '{args.event_id}' not found in {EVENTS_INDEX}")
        print(f"Existing events: {event_ids}")
        sys.exit(1)

    # Set all to current=false, target to current=true
    for event in events:
        event["current"] = event["objectID"] == args.event_id

    print(f"Updating {len(events)} event(s)...")
    client.save_objects(index_name=EVENTS_INDEX, objects=events)
    print(f"✓ '{args.event_id}' is now the active event.")


if __name__ == "__main__":
    main()
