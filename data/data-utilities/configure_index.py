#!/usr/bin/env python3
"""
Configure Algolia index settings from algolia-config.json
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from algoliasearch.search.client import SearchClientSync

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Configuration
CONFIG_FILE = Path(__file__).parent.parent / "algolia-config.json"
ALGOLIA_APP_ID = os.getenv("ALGOLIA_APP_ID")
ALGOLIA_API_KEY = os.getenv("ALGOLIA_API_KEY")
ALGOLIA_INDEX_NAME = os.getenv("ALGOLIA_INDEX_NAME", "pokemon_tcg_cards")


def main():
    """Apply configuration to Algolia index."""

    # Validate environment
    if not ALGOLIA_APP_ID or not ALGOLIA_API_KEY:
        print("ERROR: Missing Algolia credentials in .env file")
        return

    # Load configuration
    if not CONFIG_FILE.exists():
        print(f"ERROR: Configuration file not found: {CONFIG_FILE}")
        return

    print(f"Loading configuration from {CONFIG_FILE.name}...")
    with open(CONFIG_FILE, 'r') as f:
        config = json.load(f)

    print(f"Configuration loaded with {len(config)} settings")

    # Connect to Algolia
    print(f"\nConnecting to Algolia...")
    client = SearchClientSync(ALGOLIA_APP_ID, ALGOLIA_API_KEY)
    print(f"✓ Connected to Algolia")
    print(f"✓ Target index: {ALGOLIA_INDEX_NAME}")

    # Apply configuration
    print(f"\nApplying configuration...")
    try:
        client.set_settings(
            index_name=ALGOLIA_INDEX_NAME,
            index_settings=config
        )
        print(f"✓ Configuration applied successfully")

        # Display key settings
        print(f"\n{'=' * 60}")
        print(f"Applied Configuration Summary:")
        print(f"{'=' * 60}")
        print(f"Searchable attributes: {', '.join(config['searchableAttributes'])}")
        print(f"Faceting attributes: {len(config['attributesForFaceting'])} configured")
        print(f"Custom ranking: {len(config['customRanking'])} rules")
        print(f"Numeric filters: {', '.join(config['numericAttributesForFiltering'])}")
        print(f"{'=' * 60}")

    except Exception as e:
        print(f"✗ Error applying configuration: {e}")


if __name__ == "__main__":
    main()
