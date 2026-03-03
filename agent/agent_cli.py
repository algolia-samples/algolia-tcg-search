#!/usr/bin/env python3
"""
Algolia Agent Studio CLI

Subcommands:
  list                              List all agents
  get <agent_id>                    Full agent config
  providers                         List available LLM providers
  create <event_id> <name> <booth>  Create a draft agent for an event
  publish <agent_id>                Publish a draft agent
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

APP_ID = os.getenv("ALGOLIA_APP_ID")
API_KEY = os.getenv("ALGOLIA_API_KEY")
EVENTS_INDEX = os.getenv("ALGOLIA_EVENTS_INDEX", "tcg_events")
BASE_URL = f"https://{APP_ID}.algolia.net/agent-studio/1"

AGENT_DIR = Path(__file__).parent


def algolia_request(path, method="GET", body=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("x-algolia-application-id", APP_ID)
    req.add_header("x-algolia-api-key", API_KEY)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    req.add_header("User-Agent", "algolia-tcg-cli/1.0")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def algolia_index_request(path, method="GET", body=None):
    """Make a request to the Algolia Search REST API."""
    url = f"https://{APP_ID}.algolia.net{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("x-algolia-application-id", APP_ID)
    req.add_header("x-algolia-api-key", API_KEY)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    req.add_header("User-Agent", "algolia-tcg-cli/1.0")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def cmd_list(args):
    result = algolia_request("/agents")
    agents = result.get("data", [])
    if not agents:
        print("No agents found.")
        return

    for agent in agents:
        status_indicator = "●" if agent["status"] == "published" else "○"
        print(f"{status_indicator} {agent['name']}")
        print(f"  ID:      {agent['id']}")
        print(f"  Status:  {agent['status']}")
        print(f"  Model:   {agent.get('model') or '(not set)'}")
        tools = agent.get("tools", [])
        if tools:
            for tool in tools:
                indices = [i["index"] for i in tool.get("indices", [])]
                print(f"  Tool:    {tool['type']} → {', '.join(indices)}")
        print(f"  Updated: {agent['updatedAt'][:10]}")
        print()


def cmd_get(args):
    result = algolia_request(f"/agents/{args.agent_id}")
    agent = result.get("data", result)

    print(f"Name:        {agent['name']}")
    print(f"ID:          {agent['id']}")
    print(f"Status:      {agent['status']}")
    print(f"Model:       {agent.get('model') or '(not set)'}")
    print(f"Created:     {agent['createdAt'][:10]}")
    print(f"Updated:     {agent['updatedAt'][:10]}")

    tools = agent.get("tools", [])
    if tools:
        print(f"\nTools ({len(tools)}):")
        for tool in tools:
            print(f"  - {tool['type']}")
            for idx in tool.get("indices", []):
                print(f"      {idx['index']}: {idx.get('description', '').splitlines()[0]}")

    print(f"\nInstructions:\n{'-' * 60}")
    print(agent.get("instructions") or "(none)")

    config = agent.get("config", {})
    if config:
        print(f"\nConfig:\n{json.dumps(config, indent=2)}")


def cmd_providers(args):
    result = algolia_request("/providers")
    providers = result.get("data", [])
    if not providers:
        print("No providers found.")
        return

    for provider in providers:
        print(f"  {provider['name']}")
        print(f"    ID:       {provider['id']}")
        print(f"    Provider: {provider.get('providerName', '(unknown)')}")
        print()


def resolve_provider_id(provider_name):
    """Resolve a provider name to its UUID."""
    result = algolia_request("/providers")
    providers = result.get("data", [])
    for provider in providers:
        if provider["name"] == provider_name:
            return provider["id"]
    available = [p["name"] for p in providers]
    print(
        f"ERROR: Provider '{provider_name}' not found. Available: {', '.join(available)}",
        file=sys.stderr,
    )
    sys.exit(1)


def cmd_create(args):
    config_path = AGENT_DIR / "agent-config.json"
    prompt_path = AGENT_DIR / "PROMPT.md"

    if not config_path.exists():
        print(f"ERROR: {config_path} not found.", file=sys.stderr)
        sys.exit(1)
    if not prompt_path.exists():
        print(f"ERROR: {prompt_path} not found.", file=sys.stderr)
        sys.exit(1)

    with open(config_path) as f:
        agent_config = json.load(f)

    with open(prompt_path) as f:
        prompt_template = f.read()

    instructions = (
        prompt_template
        .replace("{{event_name}}", args.event_name)
        .replace("{{booth}}", args.booth)
    )

    primary = f"tcg_cards_{args.event_id}"
    price_asc = f"{primary}_price_asc"
    price_desc = f"{primary}_price_desc"

    index_descriptions = [
        (primary, f"Pokemon cards in the {args.event_name} vending machine. Use for inventory and pricing queries."),
        (price_asc, "Pokemon cards sorted by estimated value ascending (lowest price first)."),
        (price_desc, "Pokemon cards sorted by estimated value descending (highest price first)."),
    ]

    tools = [
        {
            "name": "tcg_card_inventory_search",
            "type": "algolia_search_index",
            "description": "\n".join(f"{idx}: {desc}" for idx, desc in index_descriptions),
            "indices": [
                {"index": idx, "description": desc}
                for idx, desc in index_descriptions
            ],
        }
    ]

    if args.dry_run:
        print("=== DRY RUN ===")
        print(f"\nAgent name: TCG Agent {args.event_name}")
        print(f"Provider:   {agent_config['provider']} (will resolve to UUID at runtime)")
        print(f"Model:      {agent_config['model']}")
        print(f"\nIndices:")
        for idx in tools[0]["indices"]:
            print(f"  - {idx['index']}")
            print(f"    {idx['description']}")
        print(f"\n--- Rendered Prompt ---\n{instructions}")
        return

    provider_id = resolve_provider_id(agent_config["provider"])

    payload = {
        "name": f"TCG Agent {args.event_name}",
        "providerId": provider_id,
        "model": agent_config["model"],
        "instructions": instructions,
        "status": "draft",
        "config": agent_config.get("config", {}),
        "tools": tools,
    }

    result = algolia_request("/agents", method="POST", body=payload)
    agent = result.get("data", result)
    agent_id = agent["id"]

    print(f"Created agent: {agent['name']}")
    print(f"Agent ID:      {agent_id}")
    print(f"Status:        {agent['status']}")

    # Write agent_id back to tcg_events record
    algolia_index_request(f"/1/indexes/{EVENTS_INDEX}/{args.event_id}/partial", method="POST", body={"agent_id": agent_id})
    print(f"\nUpdated tcg_events record '{args.event_id}' with agent_id.")
    print(f"\nAgent created (draft). Run:\n  python agent_cli.py publish {agent_id}")


def cmd_publish(args):
    result = algolia_request(f"/agents/{args.agent_id}/publish", method="POST")
    agent = result.get("data", result)
    print(f"Published agent: {agent['name']}")
    print(f"Agent ID:        {agent['id']}")
    print(f"Status:          {agent['status']}")


def main():
    if not APP_ID or not API_KEY:
        print("ERROR: Missing ALGOLIA_APP_ID or ALGOLIA_API_KEY in agent/.env", file=sys.stderr)
        sys.exit(1)

    parser = argparse.ArgumentParser(description="Algolia Agent Studio CLI")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("list", help="List all agents")

    get_parser = subparsers.add_parser("get", help="Get full config for an agent")
    get_parser.add_argument("agent_id", help="Agent ID (UUID)")

    subparsers.add_parser("providers", help="List available LLM providers")

    create_parser = subparsers.add_parser("create", help="Create a draft agent for an event")
    create_parser.add_argument("event_id", help="Event ID slug (e.g. etail-palm-springs-2026)")
    create_parser.add_argument("event_name", help='Event display name (e.g. "eTail Palm Springs 2026")')
    create_parser.add_argument("booth", help="Booth number (e.g. 701)")
    create_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print rendered prompt and tool config without making API calls",
    )

    publish_parser = subparsers.add_parser("publish", help="Publish a draft agent")
    publish_parser.add_argument("agent_id", help="Agent ID (UUID)")

    args = parser.parse_args()

    if args.command == "list":
        cmd_list(args)
    elif args.command == "get":
        cmd_get(args)
    elif args.command == "providers":
        cmd_providers(args)
    elif args.command == "create":
        cmd_create(args)
    elif args.command == "publish":
        cmd_publish(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
