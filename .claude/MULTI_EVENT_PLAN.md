# Plan: Multi-Event TCG Search (algolia-tcg-search)

## Context
`etail-west-tcg-search` was built for a single conference. We're evolving it into a
multi-event platform following the swagsearch architecture pattern:
- **Single Vercel deployment** — no per-conference repos or forks
- **Algolia `tcg_events` index** drives everything dynamically (which event is active,
  what the index prefix is, booth/event metadata)
- **Per-event card indices** prefixed by event slug
- **Claims scoped to events** via an `event_id` column in Supabase
- Switching events = flip `current: true` in Algolia, no redeploy needed

---

## Architecture

### New Algolia Events Index: `tcg_events`
```json
{
  "objectID": "etail-west-2026",
  "event_id": "etail-west-2026",
  "name": "Etail West 2026",
  "booth": "701",
  "venue": "Long Beach Convention Center",
  "current": true
}
```

### Index Naming Pattern
`tcg_cards_{event_id}` (primary), `tcg_cards_{event_id}_price_asc`, `tcg_cards_{event_id}_price_desc` (replicas)
- e.g. `tcg_cards_etail-west-2026`, `tcg_cards_shoptalk-2026`
- `tcg_cards_*` prefix groups all card indices together in the Algolia dashboard

### URL Routing
- `/` — fetches `current:true` event, redirects to `/{event_id}`
- `/:eventId` — fetches that event's config by objectID, renders the full search UI

### App Initialization Flow
1. At `/`: query `tcg_events` for `current:true`, redirect to `/{event_id}`
2. At `/:eventId`: fetch event config by objectID from `tcg_events`
3. Store event config in React `EventContext`
4. Derive Algolia index names from `index_prefix`
5. Initialize InstantSearch with dynamic index names

---

## Implementation Steps

### Note: Existing Index Migration
The existing `etail-west-tcg_cards` indices will **not** be renamed — they'll be
retired and replaced via re-ingestion in Step 7 under the new naming convention
(`etail-west-2026_tcg_cards`). The CSVs are the source of truth.

---

### Step 1: Rename & Rebrand ✅
**Files:**
- `/package.json` — `name`: `etail-west-tcg-search` → `algolia-tcg-search`
- `/tcg-search/.env.example` — update index name examples to new pattern
- `/data/.env.example` — update `ALGOLIA_INDEX_NAME` example to `{event_id}_tcg_cards`
- `/data/data-utilities/README.md` — update index name references

**Manual steps (outside code):**
- Rename GitHub repo `algolia-samples/etail-west-tcg-search` → `algolia-samples/algolia-tcg-search` via GitHub Settings
- Optionally rename local directory

---

### Step 2: Events Index Infrastructure
**New files:**
- `/data/algolia-events-config.json` — Algolia index settings for `tcg_events`
  (searchable: `name`, `event_id`; facets: `current`)
- `/data/data-utilities/create_event.py` — scaffolds a new event:
  1. Creates `{event_id}_tcg_cards` + replica indices in Algolia
  2. Applies `algolia-config.json` settings to new indices
  3. Inserts record into `tcg_events`
- `/data/data-utilities/set_active_event.py` — toggles `current: true`:
  1. Sets all records to `current: false`
  2. Sets target event to `current: true`

---

### Step 3: Frontend — Event Context + Routing
**New files:**
- `/tcg-search/src/utilities/events.js` — `fetchCurrentEvent()` (filter `current:true`)
  and `fetchEventById(eventId)` (getObject by objectID) helpers
- `/tcg-search/src/context/EventContext.jsx` — React context + provider; accepts
  `eventId` prop, calls `fetchEventById(eventId)`, exposes `{ eventConfig, loading, error }`

**Modified files:**
- `/tcg-search/src/utilities/algolia.js` — remove hardcoded `VITE_ALGOLIA_INDEX_NAME*`
  env vars; export a `getIndexNames(indexPrefix)` helper that returns
  `{ primary, priceAsc, priceDesc }` index names
- `/tcg-search/src/App.jsx` — routes:
  - `/` → `<CurrentEventRedirect />` (fetches current event, navigates to `/:eventId`)
  - `/:eventId` → `<EventProvider eventId={eventId}><Search /></EventProvider>`
- `/tcg-search/src/components/Search.jsx` — call `useEvent()` + `getIndexNames()` instead
  of importing hardcoded index name constants
- `/tcg-search/.env.example` — remove `VITE_ALGOLIA_INDEX_NAME*` vars;
  add `VITE_ALGOLIA_EVENTS_INDEX=tcg_events`

---

### Step 4: Claims — Add event_id
**Modified files:**
- `/data/supabase_claims_table.sql` — add `event_id TEXT NOT NULL DEFAULT 'etail-west-2026'`
  column and index; add RLS policy filter by event_id for anon SELECT
- `/tcg-search/api/claims/create.js` — read `event_id` from event config (passed in
  request body or via `VITE_EVENT_ID` fallback env var); include in Supabase INSERT
- `/tcg-search/src/components/ClaimedCarousel.jsx` — filter Supabase SELECT by
  `event_id` from EventContext; scope realtime subscription to current event using
  Supabase `filter` option on the channel

---

### Step 5: Dynamic AI Agent Prompt
**Modified files:**
- `/PROMPT.md` — replace hardcoded "Etail conference (booth 701)" with
  `{{event_name}}` and `{{booth}}` placeholders
- `/tcg-search/src/components/ChatAgent.jsx` — inject `eventConfig.name` and
  `eventConfig.booth` into the prompt template at runtime

---

### Step 6: Env Vars Cleanup
**`.env.example` final state:**
```
VITE_ALGOLIA_APP_ID=
VITE_ALGOLIA_API_KEY=
VITE_ALGOLIA_EVENTS_INDEX=tcg_events       # NEW — metadata index
VITE_ALGOLIA_CHAT_AGENT_ID=                # optional
VITE_USER_TOKEN=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
ALGOLIA_WRITE_API_KEY=
```
Removed: `VITE_ALGOLIA_INDEX_NAME`, `VITE_ALGOLIA_INDEX_NAME_PRICE_ASC`,
`VITE_ALGOLIA_INDEX_NAME_PRICE_DESC` (now derived from events index)

---

### Step 7: Data Pipeline Update
**Modified files:**
- `/data/.env.example` — replace `ALGOLIA_INDEX_NAME` with `ALGOLIA_EVENT_ID`;
  add `ALGOLIA_EVENTS_INDEX=tcg_events`
- `/data/data-utilities/ingest.py` — derive index name as `{event_id}_tcg_cards`
  from `ALGOLIA_EVENT_ID` env var
- `/data/data-utilities/configure_index.py` — same pattern
- `/data/data-utilities/clear_index.py` — same pattern
- `/data/data-utilities/README.md` — document new event workflow

---

## Critical Files

| File | Change |
|------|--------|
| `/tcg-search/src/utilities/algolia.js` | Dynamic index names from EventContext |
| `/tcg-search/src/App.jsx` | EventProvider wrapper + loading state |
| `/tcg-search/src/context/EventContext.jsx` | NEW — event config context |
| `/tcg-search/src/utilities/events.js` | NEW — fetchCurrentEvent() |
| `/tcg-search/src/components/ClaimedCarousel.jsx` | Filter by event_id |
| `/tcg-search/api/claims/create.js` | Include event_id in INSERT |
| `/data/supabase_claims_table.sql` | Add event_id column |
| `/data/data-utilities/create_event.py` | NEW — scaffold new event |
| `/data/data-utilities/set_active_event.py` | NEW — toggle active event |
| Both `package.json` files | Rename to algolia-tcg-search |

---

## Verification
1. `npm run serve` — app loads with a spinner, then renders the active event's cards
2. Change `current: true` in Algolia dashboard to a different event record → reload
   shows that event's cards without any code change or redeploy
3. Claim a card → row in Supabase has correct `event_id`; ClaimedCarousel only shows
   claims for the active event
4. `python create_event.py shoptalk-2026 "Shoptalk 2026" 314` creates indices and
   events record; `python set_active_event.py shoptalk-2026` switches the active event
5. `npm test` — existing ClaimedCarousel and CardModal tests still pass

---

---

### Step 8: Switch to Virtual Replicas
Standard replicas store a full copy of the data and require manual settings propagation
(caused the `attributesForFaceting` bug fixed in Step 7). Virtual replicas share data
with the primary and always inherit settings — simpler and more storage-efficient.

**Modified files:**
- `/data/data-utilities/create_event.py` — change `"replicas"` key to `"virtualReplicas"`;
  remove the separate `set_settings` calls for replicas (settings inherited automatically)

**Manual steps:**
- Delete existing `tcg_cards_etail-palm-springs-2026_price_asc` and `_price_desc` indices
  in the Algolia dashboard (standard replicas must be deleted before re-creating as virtual)
- Re-run `create_event.py etail-palm-springs-2026 ...` to recreate as virtual replicas
  (or run the targeted `set_settings` one-liner to flip the primary's `virtualReplicas` key)

**Verification:**
- `get_settings(primary).virtual_replicas` returns the two replica names
- `get_settings(primary).replicas` is empty
- `is_top_10_chase_card:true` filter still returns 19 hits in the price_desc replica
  without needing to manually set `attributesForFaceting`

---

## Out of Scope (Future Work)
- Per-event branding (logos, colors) — events index schema supports adding `logo_url`
  and `primary_color` fields later
- ~~Historical event browsing via URL routing~~ — implemented in Step 3
- Admin dashboard UI for event management (swagsearch pattern) — `create_event.py`
  and `set_active_event.py` CLI tools cover the immediate need
