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
ALGOLIA_EVENT_ID=my-event-2026
ALGOLIA_EVENTS_INDEX=tcg_events
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

Place CSV files in `data-files/`. Files are exported from the master spreadsheet (`data-files/TCG Search Website - Raw List.xlsx`).

### Filename Convention

```
TCG Search Website - Raw List - {Set Name} ({Count}).csv
```

Examples:
- `TCG Search Website - Raw List - Scarlet & Violet_ Surging Sparks (191).csv`
- `TCG Search Website - Raw List - Mega Evolution (132).csv`

The set name is parsed from the filename — underscores are converted to `: ` (e.g., `Scarlet & Violet_` → `Scarlet & Violet:`).

### Required Columns

| Column | Type | Description | Example |
|---|---|---|---|
| `Pokemon Name` | string | Card name | `Charizard ex` |
| `Number` | string/int | Card number within the set | `6`, `182` |
| `Card Type` | string | Variant type | `Full Art`, `Holo`, `Alternative Full Art`, `Gold`, `Secret Art`, `Reverse Holo` |
| `# in Machine` | integer | Quantity available in vending machine | `3` |
| `Estimated Value` | string | USD value with `$` prefix (nullable) | `$20.60` |
| `Is Chase Card?` | boolean | Highly desirable card | `TRUE` / `FALSE` |
| `Is top 10 chase card?` | boolean | Top 10 most desirable | `TRUE` / `FALSE` |
| `Is classic Pokemon?` | boolean | Generation 1 Pokemon | `TRUE` / `FALSE` |
| `Is Full Art?` | boolean | Full art treatment | `TRUE` / `FALSE` |

## Output

Each card uploaded to Algolia contains:

**From CSV:**
| Field | Type | Source Column |
|---|---|---|
| `pokemon_name` | string | `Pokemon Name` |
| `number` | string | `Number` |
| `card_type` | string | `Card Type` |
| `machine_quantity` | integer | `# in Machine` |
| `estimated_value` | float \| null | `Estimated Value` |
| `is_chase_card` | boolean | `Is Chase Card?` |
| `is_top_10_chase_card` | boolean | `Is top 10 chase card?` |
| `is_classic_pokemon` | boolean | `Is classic Pokemon?` |
| `is_full_art` | boolean | `Is Full Art?` |
| `set_name` | string | Derived from filename |

**From TCGdex API:**
| Field | Type | Description |
|---|---|---|
| `set_id` | string | TCGdex set identifier (e.g., `sv08`) |
| `image_small` | string | Card image URL, low resolution webp (245×337) |
| `image_large` | string | Card image URL, high resolution webp (600×825) |
| `pokemon_types` | string[] | Type array (e.g., `["Fire"]`, `["Water", "Lightning"]`) |

**Generated:**
| Field | Type | Description |
|---|---|---|
| `objectID` | string | `{set_id}-{card_number}` (e.g., `sv08-102`) — matches Supabase `card_id` |

## Algolia Index Settings

Index configuration (searchable attributes, facets, ranking, etc.) is defined in [`data/algolia-config.json`](../algolia-config.json) and applied via `configure_index.py`. This is the authoritative source — it matches the live index.

## Utilities

| Script | Description |
|---|---|
| `ingest.py` | Main ingestion script — reads CSVs, enriches via TCGdex, uploads to Algolia |
| `configure_index.py` | Applies Algolia index settings (searchable attributes, facets, ranking) |
| `clear_index.py` | Wipes all records from the index before re-ingestion |
| `validate_csv.py` | Validates CSV files against expected column schema before ingestion |
| `enrich_chase_cards.py` | Standalone script to update chase card flags on existing records |
| `reset_and_ingest.sh` | Convenience wrapper: clears index then runs full ingestion |

## Features

- Automatic set matching with TCGdex API
- Card number normalization (handles leading zeros, float formats)
- Retry logic with exponential backoff
- Progress logging every 25 cards
- Skips empty rows and handles malformed data
- 100% enrichment rate for valid cards
