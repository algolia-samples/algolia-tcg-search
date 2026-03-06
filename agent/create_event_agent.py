#!/usr/bin/env python3
"""
TCG-specific wrapper around algolia-agent CLI.

Creates and manages per-event Algolia Agent Studio agents, with:
  - Event verification against the tcg_events Algolia index
  - TCG index name construction from event_id
  - Writing agent_id back to the tcg_events record after creation

Usage:
  python create_event_agent.py create <event_id> "<Event Name>" <booth> [--dry-run] [--publish]
  python create_event_agent.py publish <agent_id>
"""

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

APP_ID = os.getenv("ALGOLIA_APP_ID")
API_KEY = os.getenv("ALGOLIA_API_KEY")
EVENTS_INDEX = os.getenv("ALGOLIA_EVENTS_INDEX", "tcg_events")

AGENT_DIR = Path(__file__).parent


def algolia_index_request(path, method="GET", body=None, allow_404=False):
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
        if allow_404 and e.code == 404:
            return None
        print(f"Error {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def cmd_create(args):
    if not APP_ID or not API_KEY:
        print("ERROR: Missing ALGOLIA_APP_ID or ALGOLIA_API_KEY in agent/.env", file=sys.stderr)
        sys.exit(1)

    # Verify event exists in tcg_events
    event = algolia_index_request(
        f"/1/indexes/{EVENTS_INDEX}/{args.event_id}", allow_404=True
    )
    if event is None:
        print(f"ERROR: Event '{args.event_id}' not found in {EVENTS_INDEX}.", file=sys.stderr)
        sys.exit(1)
    print(f"Event: {event.get('name')} (booth {event.get('booth')})")

    # Build TCG index names
    primary = f"tcg_cards_{args.event_id}"
    price_asc = f"{primary}_price_asc"
    price_desc = f"{primary}_price_desc"

    # Build algolia-agent create command
    cmd = [
        "algolia-agent", "create",
        "--config", str(AGENT_DIR / "agent-config.json"),
        "--name", f"TCG Agent {args.event_name}",
        "--index", primary,
        "--replica", price_asc,
        "--replica", price_desc,
        "--var", f"event_name={args.event_name}",
        "--var", f"booth={args.booth}",
        "--json",
    ]

    if args.dry_run:
        cmd = [c for c in cmd if c != "--json"]
        cmd.append("--dry-run")
        subprocess.run(cmd, check=True)
        return

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(result.returncode)

    agent = json.loads(result.stdout)
    agent_id = agent["id"]

    print(f"Created agent: {agent['name']}")
    print(f"Agent ID:      {agent_id}")
    print(f"Status:        {agent['status']}")

    # Write agent_id back to tcg_events record
    try:
        algolia_index_request(
            f"/1/indexes/{EVENTS_INDEX}/{args.event_id}/partial?createIfNotExists=false",
            method="POST",
            body={"agent_id": agent_id},
        )
        print(f"\nUpdated tcg_events record '{args.event_id}' with agent_id.")
    except SystemExit:
        print(
            f"\nWARNING: Failed to update tcg_events record '{args.event_id}'.\n"
            f"Agent ID: {agent_id}\n"
            f"Update manually.",
            file=sys.stderr,
        )

    if args.publish:
        _publish(agent_id)
    else:
        print(f"\nAgent created (draft). To publish:\n  python create_event_agent.py publish {agent_id}")


def cmd_publish(args):
    _publish(args.agent_id)


def _publish(agent_id):
    result = subprocess.run(
        ["algolia-agent", "publish", agent_id, "--json"],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(result.returncode)
    agent = json.loads(result.stdout)
    print(f"Published agent: {agent['name']}")
    print(f"Agent ID:        {agent['id']}")
    print(f"Status:          {agent['status']}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="TCG Event Agent Manager")
    sub = parser.add_subparsers(dest="command")

    create_p = sub.add_parser("create", help="Create a draft agent for a TCG event")
    create_p.add_argument("event_id", help="Event ID slug (e.g. etail-palm-springs-2026)")
    create_p.add_argument("event_name", help='Event display name (e.g. "eTail Palm Springs 2026")')
    create_p.add_argument("booth", help="Booth number (e.g. 701)")
    create_p.add_argument("--dry-run", action="store_true",
                          help="Preview without making API calls")
    create_p.add_argument("--publish", action="store_true",
                          help="Publish immediately after creation")

    pub_p = sub.add_parser("publish", help="Publish a draft agent")
    pub_p.add_argument("agent_id", help="Agent ID (UUID)")

    args = parser.parse_args()

    if args.command == "create":
        cmd_create(args)
    elif args.command == "publish":
        cmd_publish(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
