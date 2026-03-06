# Agent Factory

TCG-specific wrapper for creating and managing per-event Algolia Agent Studio agents.
Uses [algolia-agent-cli](https://github.com/algolia-samples/algolia-agent-cli) for
Agent Studio API calls, and handles TCG-specific logic:

- Verifies the event exists in `tcg_events` before creating anything
- Constructs index names from `event_id` (`tcg_cards_{event_id}` + price replicas)
- Writes `agent_id` back to the `tcg_events` record so the chat widget picks it up

For `list`, `get`, and `providers`, call `algolia-agent` directly.

## Setup

```bash
poetry install             # installs algolia-agent-cli and python-dotenv
cp .env.example .env       # fill in ALGOLIA_APP_ID and ALGOLIA_API_KEY
```

## Usage

```bash
# Preview without making API calls
python agent.py create <event_id> "<Event Name>" <booth> --dry-run

# Create a draft agent (also writes agent_id to tcg_events record)
python agent.py create <event_id> "<Event Name>" <booth>

# Create and publish in one step
python agent.py create <event_id> "<Event Name>" <booth> --publish

# Publish a draft agent
python agent.py publish <agent_id>

# List / inspect agents directly via algolia-agent
algolia-agent list
algolia-agent get <agent_id>
algolia-agent providers
```

## Example

```bash
python agent.py create etail-palm-springs-2026 "eTail Palm Springs 2026" 701 --dry-run
python agent.py create etail-palm-springs-2026 "eTail Palm Springs 2026" 701
python agent.py publish <agent_id>
```

## Configuration

| File | Purpose |
|------|---------|
| `agent-config.json` | LLM provider, model, and config block |
| `PROMPT.md` | Agent system prompt template (`{{event_name}}` and `{{booth}}` substituted at create time) |
| `.env` | Algolia credentials (gitignored) |
