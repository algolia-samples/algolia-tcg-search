# Building an Agent Factory for a Multi-Event AI Demo

## Executive Summary

The Algolia TCG Search demo powers a Pokemon card vending machine at Algolia's conference
booth. To scale it from a single event to many, we needed every layer of the stack —
indices, data, and AI agents — to be per-event. This post covers the last piece of that
puzzle: an "agent factory" that automates the creation and configuration of Algolia Agent
Studio agents, one per event, wired directly into the event's data.

---

## Problem

The original `etail-west-tcg-search` was hardwired to a single conference. One Algolia
index, one agent, one deployment — fine for a PoC. When we committed to running the demo
at multiple events per year, that model broke down.

The broader multi-event migration (Steps 1–8 of the project plan) solved most of it. A
`tcg_events` Algolia index became the source of truth: each event record stores its slug,
name, booth number, and a `current` flag. A `create_event.py` CLI scaffolds a new
`tcg_cards_{event_id}` primary index and two virtual replica indices (price ascending,
price descending) and pushes a record into `tcg_events`. The React frontend reads
`EventContext` on load, derives index names dynamically, and scopes card claims to the
active event in Supabase. Switching events is a one-field update — no redeploy.

One problem remained: the AI chat agent. Each event needs its own agent in Algolia Agent
Studio pointing at the event's specific card indices and carrying a system prompt with the
correct event name and booth number. The original agent was created manually in the
dashboard — a process that doesn't scale, is error-prone, and leaves the agent ID
disconnected from the `tcg_events` record the frontend depends on.

Step 9 of the plan stated the goal plainly:

> *Each event needs its own Algolia AI agent, configured with `PROMPT.md` content filled
> in for that event. The `tcg_events` record stores `agent_id` for that event.
> `ChatAgent.jsx` reads `eventConfig.agent_id` from EventContext instead of the static
> env var.*

---

## Solution

The agent factory is a standalone `/agent/` directory — a Poetry project that mirrors the
`/data/data-utilities/` event factory — with a single CLI entry point: `agent_cli.py`.

The design has two guiding principles:

**1. The `tcg_events` index is the source of truth.**
The CLI verifies the event exists in `tcg_events` before creating anything, and writes the
returned `agent_id` back to the event record via a partial update. The frontend never
needs to know an agent ID in advance.

**2. Configuration lives in files, not dashboards.**
`agent-config.json` holds the LLM provider name and model. `PROMPT.md` (moved from the
repo root) is the canonical prompt template, with `{{event_name}}` and `{{booth}}`
placeholders. Swapping a provider means editing one JSON field. Updating the prompt means
editing one Markdown file.

The workflow for a new event:

```bash
python agent_cli.py create etail-palm-springs-2026 "eTail Palm Springs 2026" 701
python agent_cli.py publish <agent_id>
```

That's it. The `create` command handles preflight validation, prompt rendering, provider
resolution, API calls, and writing the agent ID back to `tcg_events`. The `publish`
command hits a separate endpoint — intentionally decoupled so the agent can be reviewed
before going live. A `--dry-run` flag prints the rendered prompt and index config without
touching the API.

---

## Implementation

### The prompt template problem

The original `PROMPT.md` at the repo root had placeholder syntax (`{{event_name}}`,
`{{booth}}`) from the multi-event plan's Step 5. But it was never consumed programmatically
— the substitution was intended to happen manually in the dashboard. The agent factory
closes that loop: `create` reads `PROMPT.md`, substitutes the two placeholders, and sends
the rendered string as the agent's `instructions` field.

### Three indices, one tool

Each event's search index is a primary (`tcg_cards_{event_id}`) plus two virtual replicas
(`_price_asc`, `_price_desc`). Virtual replicas were adopted in Step 8 to avoid having
to propagate settings changes to every replica — they inherit configuration from the
primary automatically. The agent tool is configured with all three indices under a single
`algolia_search_index` tool (`tcg_card_inventory_search`), so the agent can answer both
inventory questions (primary) and value-sorting questions (replicas) from a single tool
call.

### API discovery

The Agent Studio create API was not documented in enough detail to infer the exact
payload shape. The correct tool type (`algolia_search_index` vs. the guessed
`algolia_index_search`), the required `name` field on the tool object, the required
top-level tool `description` string, and the dedicated `POST /agents/{id}/publish`
endpoint (rather than a PATCH) were all discovered by inspecting the live API responses
from the existing manually-created agent and iterating against the 422 validation errors.
These details are now encoded in the CLI so no one has to rediscover them.

### Safety rails

Three issues surfaced during code review worth calling out:

- **Orphan prevention:** `createIfNotExists=false` on the `tcg_events` partial update
  ensures a typo in the event slug returns an error rather than silently creating an
  incomplete record.
- **Recovery path:** If the index update fails after a successful agent creation, the
  CLI prints the agent ID before exiting so it can be manually wired up.
- **Preflight check:** The `create` command fetches the event record from `tcg_events`
  at the start and fails fast if it doesn't exist — before any Agent Studio API calls
  are made.

### Frontend wiring

`ChatAgent.jsx` reads `eventConfig.agent_id` from `EventContext` with
`VITE_ALGOLIA_CHAT_AGENT_ID` as a fallback. Because `EventContext` is already loaded
with the full `tcg_events` record on every page render, no additional API call is needed
— the agent ID arrives for free with the rest of the event config.
