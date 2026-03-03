# Agent Factory

Standalone CLI for creating and managing per-event Algolia Agent Studio agents.

## Setup

```bash
cp .env.example .env   # fill in ALGOLIA_APP_ID and ALGOLIA_API_KEY
poetry install
```

## Usage

```bash
# List all agents
python agent_cli.py list

# Create a draft agent for an event (also writes agent_id to tcg_events record)
python agent_cli.py create <event_id> "<Event Name>" <booth>

# Preview without making API calls
python agent_cli.py create <event_id> "<Event Name>" <booth> --dry-run

# Publish a draft agent
python agent_cli.py publish <agent_id>

# Get full config for an agent
python agent_cli.py get <agent_id>

# List available LLM providers
python agent_cli.py providers
```

## Example

```bash
python agent_cli.py create etail-palm-springs-2026 "eTail Palm Springs 2026" 701 --dry-run
python agent_cli.py create etail-palm-springs-2026 "eTail Palm Springs 2026" 701
python agent_cli.py publish <agent_id>
```

## Configuration

| File | Purpose |
|------|---------|
| `agent-config.json` | LLM provider and model (update `provider` to swap — run `providers` to see available names) |
| `PROMPT.md` | Agent system prompt template (`{{event_name}}` and `{{booth}}` are substituted at create time) |
| `.env` | Algolia credentials (gitignored) |
