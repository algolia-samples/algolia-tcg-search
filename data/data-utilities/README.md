# Pokemon TCG Data Utilities

Scripts for managing Algolia indices and card data across multiple TCG events.

For end-to-end event setup, re-ingestion, and switching the active event, see the [Event Management](../../README.md#event-management) section in the root README.

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

## Scripts

| Script | Description |
|---|---|
| `reset_and_ingest.sh` | Re-ingest card data for an existing event (clear + ingest + enrich) |
| `create_event.py` | Creates Algolia indices and inserts a record into `tcg_events`; supports `--landing-sections` and `--patch` |
| `set_active_event.py` | Sets `current: true` for an event in `tcg_events` |
| `ingest.py` | Reads XLSX (or CSVs as fallback), enriches via TCGdex API, uploads records to Algolia |
| `enrich_chase_cards.py` | Updates chase card flags from the master XLSX |
| `clear_index.py` | Wipes all records from the index (preserves settings) |
| `configure_index.py` | Manually reapplies `algolia-config.json` settings to an index |
| `validate_csv.py` | Validates CSV files against the expected column schema |

### Running Scripts Directly

All scripts read `ALGOLIA_EVENT_ID` from `data/.env` to determine which index to target. Set it before running scripts directly:

```bash
# In data/.env:
ALGOLIA_EVENT_ID=etail-palm-springs-2026
```

---

## Data Format

Place card data in `data-files/{event_id}/` — each event has its own subdirectory. `ingest.py` prefers a single XLSX file and falls back to individual CSVs if no XLSX is present.

### XLSX (preferred)

One sheet per card set. Sheet names may include a count suffix and/or a prefix separated by ` - ` — both are stripped to derive the set name:

```
"Ascended Heroes (217)"          → set: Ascended Heroes
"NEW - Surging Sparks (191)"     → set: Surging Sparks
"Mega Evolution_ Phantasmal Fla" → set: Mega Evolution: Phantasmal Flames  (truncated at Excel's 31-char limit — suffix fallback used)
```

Sheets whose names start with `(OLD)` are skipped.

A **chase/summary tab** is detected automatically by content (any sheet containing a "Top 10" section header). Cards listed in the "Top 10" section get both `is_top_10_chase_card` and `is_chase_card` set to `true`. Cards in any other section (e.g. Gold Cards, Special Illustration Rare) get `is_chase_card: true` only. Detection is tab-name agnostic — works regardless of sheet name or position.

### CSV (fallback)

Used only when no XLSX is present. Files follow this naming convention:

```
TCG Search Website - Raw List - {Set Name} ({Count}).csv
```

The set name is parsed from the filename — underscores are converted to `: `.

### Required Columns (both formats)

| Column | Type | XLSX value format | CSV value format |
|---|---|---|---|
| `Pokemon Name` | string | text | text |
| `Number` | string/int | `182` or `289/217` (denominator stripped) | `6`, `182` |
| `Card Type` | string | `Full Art`, `Holo`, `Double Rare`, etc. | same |
| `# in Machine` | integer | integer | integer |
| `Estimated Value` | float/string | `0.97` (native float) | `$20.60` (with `$`) |
| `Is Chase Card?` | boolean | `0` / `1` | `TRUE` / `FALSE` |
| `Is top 10 chase card?` | boolean | `0` / `1` | `TRUE` / `FALSE` |
| `Is classic Pokemon?` | boolean | `0` / `1` | `TRUE` / `FALSE` |

> `is_full_art` is derived from `Card Type`: any type other than `Double Rare` is treated as full art. The `Is Full Art?` column is not used for XLSX ingestion.

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
| `is_chase_card` | boolean | `Is Chase Card?` (may be overlaid by chase tab) |
| `is_top_10_chase_card` | boolean | `Is top 10 chase card?` (may be overlaid by chase tab) |
| `is_classic_pokemon` | boolean | `Is classic Pokemon?` |
| `is_full_art` | boolean | Derived: `Card Type != "Double Rare"` (XLSX) or `Is Full Art?` column (CSV) |
| `set_name` | string | Derived from sheet name (XLSX) or filename (CSV) |

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

## Landing Page Sections

Events can define additional carousels on the landing page via a `landing_sections` attribute on the event record in `tcg_events`. The frontend always shows a "Top 10 Chase Cards" carousel; `landing_sections` adds extra carousels below it.

Each section is a `{title, filter}` object using standard Algolia filter syntax:

```json
[
  { "title": "Gold Cards",                     "filter": "is_chase_card:true AND card_type:\"Gold\"" },
  { "title": "Top Special Illustration Cards", "filter": "is_chase_card:true AND card_type:\"Special Illustration Rare\"" },
  { "title": "Top Illustration Rare Cards",    "filter": "is_chase_card:true AND card_type:\"Illustration Rare\"" }
]
```

**At event creation:**
```bash
python create_event.py my-event-2026 "My Event 2026" 314 \
  --landing-sections '[{"title": "Gold Cards", "filter": "is_chase_card:true AND card_type:\"Gold\""}]'
```

**Patching an existing event:**
```bash
python create_event.py my-event-2026 --patch \
  --landing-sections '[{"title": "Gold Cards", "filter": "is_chase_card:true AND card_type:\"Gold\""}]'
```

Events without `landing_sections` show only the Top 10 carousel (all legacy events are unaffected).

---

## Algolia Index Settings

Index configuration (searchable attributes, facets, ranking, etc.) is defined in [`data/algolia-config.json`](../algolia-config.json). `create_event.py` applies this to the primary index when scaffolding a new event; virtual replicas inherit it automatically. To reapply settings to an existing index manually, use `configure_index.py`.

---

## Features

- Automatic set matching with TCGdex API
- Card number normalization (handles leading zeros, float formats)
- Retry logic with exponential backoff
- Progress logging every 25 cards
- Skips empty rows and handles malformed data
- 100% enrichment rate for valid cards
