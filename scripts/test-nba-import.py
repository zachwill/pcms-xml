#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["psycopg[binary]", "httpx"]
# ///
"""
Test runner for NBA import scripts.

Usage:
    uv run scripts/test-nba-import.py teams
    uv run scripts/test-nba-import.py game_data --mode backfill --start-date 2024-10-01 --end-date 2024-10-02
    uv run scripts/test-nba-import.py all --include-aggregates --include-supplemental --include-ngss --write
"""
import argparse
import importlib.util
import json
from pathlib import Path

SCRIPTS = {
    "teams": "teams.inline_script.py",
    "players": "players.inline_script.py",
    "schedules": "schedules.inline_script.py",
    "standings": "standings.inline_script.py",
    "games": "games.inline_script.py",
    "game_data": "game_data.inline_script.py",
    "aggregates": "aggregates.inline_script.py",
    "supplemental": "supplemental.inline_script.py",
    "ngss": "ngss.inline_script.py",
}

SCRIPT_FORCE_FLAGS = {
    "teams": {"include_reference": True},
    "players": {"include_reference": True},
    "schedules": {"include_schedule_and_standings": True},
    "standings": {"include_schedule_and_standings": True},
    "games": {"include_games": True},
    "game_data": {"include_game_data": True},
    "aggregates": {"include_aggregates": True},
    "supplemental": {"include_supplemental": True},
    "ngss": {"include_ngss": True},
}

SCRIPT_DIR = Path("import_nba_data.flow")


def load_script(name: str):
    """Dynamically load a script and return its main function."""
    script_path = SCRIPT_DIR / SCRIPTS[name]
    spec = importlib.util.spec_from_file_location(name, script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.main


def build_params(args: argparse.Namespace) -> dict:
    return {
        "league_id": args.league_id,
        "season_label": args.season_label,
        "season_type": args.season_type,
        "mode": args.mode,
        "days_back": args.days_back,
        "start_date": args.start_date,
        "end_date": args.end_date,
        "game_ids": args.game_ids,
        "include_reference": args.include_reference,
        "include_schedule_and_standings": args.include_schedule_and_standings,
        "include_games": args.include_games,
        "include_game_data": args.include_game_data,
        "include_aggregates": args.include_aggregates,
        "include_supplemental": args.include_supplemental,
        "include_ngss": args.include_ngss,
        "only_final_games": args.only_final_games,
    }


def run_script(name: str, dry_run: bool, params: dict):
    """Run a single import script."""
    print(f"\n{'=' * 60}")
    print(f"Running: {name} (dry_run={dry_run})")
    print(f"{'=' * 60}\n")

    main = load_script(name)
    script_params = params.copy()
    script_params["dry_run"] = dry_run
    script_params.update(SCRIPT_FORCE_FLAGS.get(name, {}))

    result = main(**script_params)
    print(json.dumps(result, indent=2))
    return result


def main():
    parser = argparse.ArgumentParser(description="Test NBA import scripts")
    parser.add_argument(
        "script",
        choices=list(SCRIPTS.keys()) + ["all"],
        help="Script to run (or 'all')",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Preview changes without writing to DB (default: True)",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Actually write to the database",
    )
    parser.add_argument("--league-id", default="00", help="League ID (00=NBA)")
    parser.add_argument("--season-label", default="2024-25", help="Season label (e.g., 2024-25)")
    parser.add_argument("--season-type", default="Regular Season", help="Season type")
    parser.add_argument(
        "--mode",
        choices=["refresh", "backfill"],
        default="refresh",
        help="refresh (last N days) or backfill (explicit range)",
    )
    parser.add_argument("--days-back", type=int, default=2, help="Days back for refresh mode")
    parser.add_argument("--start-date", default="", help="YYYY-MM-DD (backfill)")
    parser.add_argument("--end-date", default="", help="YYYY-MM-DD (backfill)")
    parser.add_argument("--game-ids", default="", help="Comma-separated game IDs (optional)")
    parser.add_argument(
        "--only-final-games",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Only fetch game_data for finals",
    )
    parser.add_argument(
        "--include-reference",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Fetch + upsert teams/players",
    )
    parser.add_argument(
        "--include-schedule-and-standings",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Fetch + upsert schedules + standings",
    )
    parser.add_argument(
        "--include-games",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Fetch + upsert games (scoreboard)",
    )
    parser.add_argument(
        "--include-game-data",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Fetch + upsert boxscores/pbp/poc/hustle/tracking",
    )
    parser.add_argument(
        "--include-aggregates",
        action=argparse.BooleanOptionalAction,
        default=False,
        help="Fetch + upsert player/team aggregates + lineups",
    )
    parser.add_argument(
        "--include-supplemental",
        action=argparse.BooleanOptionalAction,
        default=False,
        help="Fetch + upsert injuries/alerts/storylines/tracking streams",
    )
    parser.add_argument(
        "--include-ngss",
        action=argparse.BooleanOptionalAction,
        default=False,
        help="Fetch + upsert NGSS data",
    )

    args = parser.parse_args()
    dry_run = not args.write
    params = build_params(args)

    if args.script == "all":
        results = {}
        for name in SCRIPTS:
            results[name] = run_script(name, dry_run=dry_run, params=params)

        print(f"\n{'=' * 60}")
        print("SUMMARY")
        print(f"{'=' * 60}")
        for name, result in results.items():
            errors = result.get("errors", [])
            tables = result.get("tables", [])
            status = "✓" if not errors else "✗"
            print(f"{status} {name}: {len(tables)} tables, {len(errors)} errors")
    else:
        run_script(args.script, dry_run=dry_run, params=params)


if __name__ == "__main__":
    main()
