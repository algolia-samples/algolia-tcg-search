#!/usr/bin/env python3
"""
Clear all records from an Algolia index.
Preserves index settings and configuration.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from algoliasearch.search.client import SearchClientSync

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Configuration
ALGOLIA_APP_ID = os.getenv("ALGOLIA_APP_ID")
ALGOLIA_API_KEY = os.getenv("ALGOLIA_API_KEY")
ALGOLIA_INDEX_NAME = os.getenv("ALGOLIA_INDEX_NAME", "pokemon_tcg_cards")


def main():
    """Clear all records from the Algolia index."""

    # Validate environment
    if not ALGOLIA_APP_ID or not ALGOLIA_API_KEY:
        print("ERROR: Missing Algolia credentials in .env file")
        return

    # Confirm before proceeding
    print(f"This will delete ALL records from index: {ALGOLIA_INDEX_NAME}")
    print("Index settings and configuration will be preserved.")
    confirm = input("Type 'yes' to confirm: ").strip().lower()
    if confirm != "yes":
        print("Aborted.")
        return

    # Connect and clear
    print(f"\nConnecting to Algolia...")
    client = SearchClientSync(ALGOLIA_APP_ID, ALGOLIA_API_KEY)
    print(f"✓ Connected")

    print(f"Clearing index '{ALGOLIA_INDEX_NAME}'...")
    try:
        client.clear_objects(index_name=ALGOLIA_INDEX_NAME)
        print(f"✓ Index cleared successfully")
    except Exception as e:
        print(f"✗ Error clearing index: {e}")


if __name__ == "__main__":
    main()
