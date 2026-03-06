# Building an Agent Factory for a Multi-Event AI Demo

## Executive Summary

The Algolia TCG Search demo powers a Pokemon card vending machine at Algolia's conference
booth. Each event has its own physical inventory of cards — which means its own Algolia
index. And because the search index is embedded as a tool inside the AI chat agent, each
event also needs its own agent. This post covers how we automated that: an "agent factory"
that creates, configures, and publishes a fully wired Algolia Agent Studio agent for any
event in two commands.

---

## Problem

The vending machine demo started life as a single-event project. The card inventory for
one conference lived in one Algolia index. One AI chat agent pointed at that index and
answered questions about it. Simple enough.

When we decided to take the demo to multiple events per year, the single-event model
unraveled quickly. The core problem is inventory isolation: each conference gets a fresh
machine stocked with a different set of cards. That inventory has to live in its own
Algolia index — you can't mix eTail Palm Springs cards with Shoptalk cards in a shared
index and serve the right results to the right audience. So every new event means
provisioning a new primary index and two virtual replica indices (for price-sorted
browsing).

That index isolation cascades directly into the AI agent layer. In Algolia Agent Studio,
the search index is baked into the agent's tool configuration at creation time. An agent configured for
`tcg_cards_etail-palm-springs-2026` simply cannot search `tcg_cards_shoptalk-2026`. This
means one agent per event is a hard requirement of how the platform works.

Each per-event agent also needs a custom system prompt. The prompt tells the agent which
conference it's at, what booth it's in, and how to talk to attendees. A generic prompt
produces a worse experience — the agent should know it's at eTail Palm Springs, not just
"some event."

Manual creation in the Algolia dashboard doesn't scale. It's four or five screens of
configuration per event, easy to misconfigure, and produces an agent ID that lives only
in whoever's browser history. There was no connection between the agent and the event
record the frontend uses to know which agent to load — meaning even if you created the
agent correctly, you still had to manually update the right config in the right place to
serve it to users.

---

## Solution

We solved this at two levels: infrastructure and runtime.

**Infrastructure** — a `create_event.py` CLI (part of an earlier phase of the project)
scaffolds the Algolia side of a new event: it creates the primary card index and two
virtual replicas, applies the standard index configuration, and inserts a record into a
`tcg_events` Algolia index that acts as the authoritative registry of all events. Each
event record stores the slug, display name, booth number, and a `current` flag.

**Runtime** — the React frontend reads from `tcg_events` on every page load. The active
event's record drives everything: which index to search, what to show in the header, and
— after the agent factory — which AI agent to load in the chat widget. Switching events
is a one-field update in Algolia. 

The agent factory is a self-contained Python project
with a single CLI entry point, `agent_cli.py`. Two commands create and publish a fully
configured agent for any event:

```bash
python agent_cli.py create etail-palm-springs-2026 "eTail Palm Springs 2026" 701
python agent_cli.py publish <agent_id>
```

Two design principles drove the implementation:

**1. The `tcg_events` index is the source of truth.**
The CLI verifies the event exists in `tcg_events` before touching anything in Agent
Studio, and writes the returned `agent_id` back to the event record via a partial update.
The frontend never needs to know an agent ID in advance — it arrives as part of the event
config already loaded on every render, at no extra cost.

**2. Configuration lives in files, not dashboards.**
`agent-config.json` holds the LLM provider name and model. `PROMPT.md` is the canonical
system prompt template with `{{event_name}}` and `{{booth}}` placeholders substituted at
creation time. Updating the prompt for all future events means editing one Markdown file.
Swapping the LLM provider means changing one JSON field.

The `create` command handles the full flow: preflight validation, prompt rendering,
provider name-to-UUID resolution, Agent Studio API call, and writing the `agent_id` back
to the event record. The `publish` command is intentionally separate — so the draft agent
can be reviewed before going live. A `--dry-run` flag prints the rendered prompt and
index configuration without making any API calls.

---

## Implementation

### Prompt rendering

The system prompt had always been written with `{{event_name}}` and `{{booth}}`
placeholders, but substitution was a manual copy-paste step in the dashboard. The agent
factory closes that loop: `create` reads `PROMPT.md`, substitutes both placeholders with
the CLI arguments, and sends the rendered string as the agent's `instructions` field. The
template stays in version control, so prompt improvements are shared across all future
events automatically.

### Three indices, one tool

Each event's card data lives in three Algolia indices — a primary for general search and
two virtual replicas for price-sorted browsing. Virtual replicas were chosen because they
inherit all settings from the primary automatically: a change to facets or ranking only
needs to be made once. All three indices are registered under a single
`algolia_search_index` tool (`tcg_card_inventory_search`) in the agent configuration,
giving the model everything it needs to answer inventory, value, and sorted-browsing
questions from one tool.

A useful side effect: because the replicas are virtual, Algolia automatically populates
each index description in the API response with its current facet values and searchable
attributes (`enhancedDescription`). The agent always has an accurate picture of what's
filterable in each index without any extra configuration.

### API discovery

Rather than relying solely on documentation, the exact payload shape for creating an
agent was confirmed by inspecting the live API response from the existing manually-created
agent — the tool type (`algolia_search_index`), the required `name` and `description`
fields on the tool object, and the dedicated publish endpoint (`POST /agents/{id}/publish`
rather than a status PATCH). Using a working agent as a reference meant we could validate
each field against a known-good configuration before writing a single line of CLI code.
Those details are now encoded in the CLI so the next person setting up an event starts
from a working baseline. (**EDITOR'S NOTE** This was because the agent couldn't directly read the Agent Studio API docs due to server side rendering with JavaScript).

### Frontend wiring

The `ChatAgent` React component previously read its agent ID from a static environment
variable (`VITE_ALGOLIA_CHAT_AGENT_ID`). It now reads `eventConfig.agent_id` from
`EventContext` first, with the environment variable as a fallback. Because `EventContext`
already loads the full `tcg_events` record on every page render, the correct agent is
served automatically whenever the active event changes — no additional API calls, no
manual configuration updates between events.

---

## Conclusion

The root cause of everything in this post is a fundamental characteristic of Algolia
Agent Studio: the things that make an agent useful — its system prompt, its search tool,
its index configuration — are baked in at creation time, not injected at query time. There
is no way to tell an agent "use this index for this event a different one tomorrow." That
static configuration model forces one agent per event, which is what makes
automation necessary at any meaningful scale.

The agent factory closes the loop that the rest of the multi-event infrastructure left
open. Every other part of the stack — index provisioning, data ingestion, frontend
routing, claims scoping — was already automated and driven by the `tcg_events` registry.
The AI agent was the one thing still requiring manual dashboard work, leaving a dangling
ID that had to be manually threaded back to the right place. Rather than accepting that,
we treated the agent as infrastructure: automate creation, store the resulting ID in the
same event registry that drives everything else, and let the frontend pick it up for free.
The prompt and tool config stay in version control so improvements propagate to every
future event without extra work.

The broader lesson applies to any project where Algolia Agents are used across multiple
contexts — different customers, different product lines, different environments. An agent
is a configured service with dependencies (indices, providers, prompt, 
models) and state (agent ID) that needs to be tracked. If that configuration is
context-specific, build a factory. Treat agents as infrastructure, not one-off dashboard
creations.
