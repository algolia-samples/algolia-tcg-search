# Pokemon TCG Data Ingestion

Ingests Pokemon TCG card data from CSV files into Algolia, enriched with images and metadata from TCGdex API.

## Quick Start

1. **Install dependencies:**
```bash
poetry install
```

2. **Configure Algolia credentials** in `data/.env`:
```bash
ALGOLIA_APP_ID=your-app-id
ALGOLIA_API_KEY=your-admin-api-key
ALGOLIA_INDEX_NAME=etail-west-tcg_cards
```

3. **Run ingestion:**
```bash
# Process all CSV files
poetry run python ingest.py

# Process single file
poetry run python ingest.py --file "filename.csv"

# Skip TCGdex enrichment
poetry run python ingest.py --no-enrich
```

## CSV Format

Place CSV files in `data-files/` with this structure:

- Filename: `TCG Search Website - Raw List - {Set Name} ({Count}).csv`
- Columns: `Pokemon Name`, `Number`, `Card Type`, `# in Machine`, `Estimated Value`, `Is Chase Card?`, `Is top 10 chase card?`, `Is classic Pokemon?`, `Is Full Art?`

## Output

Each card in Algolia gets:

**From CSV:**
- `pokemon_name`, `number`, `card_type`, `machine_quantity`, `estimated_value`
- `is_chase_card`, `is_top_10_chase_card`, `is_classic_pokemon`, `is_full_art`
- `set_name`

**From TCGdex:**
- `set_id` (e.g., `sv08`)
- `image_small` and `image_large` (webp URLs)

**Generated:**
- `objectID` format: `{set_id}-{card_number}` (e.g., `sv08-102`)

## Features

- Automatic set matching with TCGdex API
- Card number normalization (handles leading zeros, float formats)
- Retry logic with exponential backoff
- Progress logging every 25 cards
- Skips empty rows and handles malformed data
- 100% enrichment rate for valid cards
