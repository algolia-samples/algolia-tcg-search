# Pokemon TCG Data Utilities

Scripts for managing Algolia indices and card data across multiple TCG events.

## Prerequisites

Install dependencies and configure credentials:

```bash
poetry install
```

Create `data/.env` from `data/.env.example`:

```bash
ALGOLIA_APP_ID=your-app-id
ALGOLIA_API_KEY=your-admin-api-key
ALGOLIA_EVENTS_INDEX=tcg_events     # index that drives event routing
ALGOLIA_EVENT_ID=my-event-2026      # only needed when running scripts directly
```

---

## Event Management

### Setting Up a New Event

Use `setup_event.sh` to bootstrap a new event end-to-end:

```bash
./setup_event.sh <event_id> <event_name> <booth> [venue]

# Example:
./setup_event.sh etail-palm-springs-2026 "eTail Palm Springs 2026" 701 "JW Marriott Desert Springs Resort"
```

The script runs five steps:

**Step 1 — Create indices and event record** (`create_event.py`)

Creates the primary card index `tcg_cards_{event_id}` and two virtual replica indices
(`_price_asc`, `_price_desc`) in Algolia, applies settings from `algolia-config.json`
to the primary (replicas inherit automatically), and inserts a record into `tcg_events`
with `current: false`.

**Step 2 — Activate the event** (`set_active_event.py`)

Sets the new event to `current: true` in `tcg_events`, clearing `current` from any
previously active event. The frontend reads this to determine which event to display.

**Step 3 — Clear the index** (`clear_index.py`)

Wipes any existing card records from `tcg_cards_{event_id}`. Preserves index settings.
(Useful when re-running setup after a partial failure.)

**Step 4 — Ingest card data** (`ingest.py`)

Reads all CSV files from `data-files/{event_id}/`, enriches each card with image URLs and type data
from the TCGdex API, and uploads records to `tcg_cards_{event_id}`.

> If no CSVs are found, setup exits cleanly with instructions to add files and run
> `reset_and_ingest.sh` when ready.

**Step 5 — Enrich chase cards** (`enrich_chase_cards.py`)

Reads the master XLSX spreadsheet to identify chase cards, then applies partial updates
to the correct records already in Algolia.

---

### Re-ingesting an Existing Event

When card CSVs change but the event already exists, use `reset_and_ingest.sh` to
re-run Steps 3–5 without recreating indices or touching the events record:

```bash
./reset_and_ingest.sh <event_id>

# Example:
./reset_and_ingest.sh etail-palm-springs-2026
```

---

### Switching the Active Event

To make a different (already set-up) event the active one:

```bash
poetry run python set_active_event.py list          # see all events
poetry run python set_active_event.py set <event_id>
```

This is a safe, non-destructive operation — it only updates the `current` field in
`tcg_events`. The frontend will redirect to the new event on next load.

---

### Running Individual Scripts

All scripts read `ALGOLIA_EVENT_ID` from `data/.env` to determine which index to target.
Set it before running scripts directly:

```bash
# In data/.env:
ALGOLIA_EVENT_ID=etail-palm-springs-2026
```

---

## CSV Format

Place CSV files in `data-files/{event_id}/` — each event has its own subdirectory.
Files are exported from the master spreadsheet
(`data-files/{event_id}/TCG Search Website - Raw List.xlsx`).

### Filename Convention

```
TCG Search Website - Raw List - {Set Name} ({Count}).csv
```

Examples:
- `TCG Search Website - Raw List - Scarlet & Violet_ Surging Sparks (191).csv`
- `TCG Search Website - Raw List - Mega Evolution (132).csv`

The set name is parsed from the filename — underscores are converted to `: `
(e.g., `Scarlet & Violet_` → `Scarlet & Violet:`).

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

---

## Output

Each card record uploaded to Algolia contains:

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

---

## Algolia Index Settings

Index configuration (searchable attributes, facets, ranking, etc.) is defined in
[`data/algolia-config.json`](../algolia-config.json). `create_event.py` applies this
to the primary index when scaffolding a new event; virtual replicas inherit it
automatically. To reapply settings to an existing index manually, use `configure_index.py`.

---

## Utilities

| Script | Description |
|---|---|
| `setup_event.sh` | **End-to-end new event setup** — creates indices, activates event, ingests data |
| `reset_and_ingest.sh` | Re-ingest card data for an existing event (Steps 3–5 of setup) |
| `create_event.py` | Creates Algolia indices and inserts a record into `tcg_events` |
| `set_active_event.py` | Sets `current: true` for an event in `tcg_events` |
| `ingest.py` | Reads CSVs, enriches via TCGdex API, uploads records to Algolia |
| `enrich_chase_cards.py` | Updates chase card flags from the master XLSX |
| `clear_index.py` | Wipes all records from the index (preserves settings) |
| `configure_index.py` | Manually reapplies `algolia-config.json` settings to an index |
| `validate_csv.py` | Validates CSV files against the expected column schema |

---

## Features

- Automatic set matching with TCGdex API
- Card number normalization (handles leading zeros, float formats)
- Retry logic with exponential backoff
- Progress logging every 25 cards
- Skips empty rows and handles malformed data
- 100% enrichment rate for valid cards
