#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "psycopg[binary]"]
# ///
"""
Test runner for SportRadar import scripts.

Usage:
    uv run scripts/test-sr-import.py games --source-api nba --date 2026-01-28
    uv run scripts/test-sr-import.py games --dry-run
    uv run scripts/test-sr-import.py all --write
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
FLOW_DIR = BASE_DIR / "import_sr_data.flow"

# Allow inline scripts to import sr_fetch/sr_extract from the flow directory.
import sys
sys.path.insert(0, str(FLOW_DIR))

SCRIPTS = {
    "seasons": "upsert_seasons.inline_script.py",
    "teams": "upsert_teams.inline_script.py",
    "players": "upsert_players.inline_script.py",
    "games": "upsert_games.inline_script.py",
    "game_stats": "upsert_game_stats.inline_script.py",
    "pbp": "upsert_pbp.inline_script.py",
    "standings": "upsert_standings.inline_script.py",
    "rankings": "upsert_rankings.inline_script.py",
    "injuries": "upsert_injuries.inline_script.py",
    "season_stats": "upsert_season_stats.inline_script.py",
    "season_splits": "upsert_season_splits.inline_script.py",
    "series": "upsert_series.inline_script.py",
    "tournaments": "upsert_tournaments.inline_script.py",
    "leaders": "upsert_leaders.inline_script.py",
    "draft": "upsert_draft.inline_script.py",
    "intl_hierarchy": "upsert_intl_hierarchy.inline_script.py",
}


def load_script(name: str):
    script_path = FLOW_DIR / SCRIPTS[name]
    spec = importlib.util.spec_from_file_location(name, script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.main


def run_script(
    name: str,
    dry_run: bool,
    source_api: str,
    mode: str,
    date: str | None,
    season_year: int | None,
    season_type: str | None,
    include_pbp: bool,
    locale: str,
    max_concurrency: int,
):
    print(f"\n{'='*60}")
    print(f"Running: {name} (dry_run={dry_run})")
    print(f"{'='*60}\n")

    main = load_script(name)

    result = main(
        dry_run=dry_run,
        source_api=source_api,
        mode=mode,
        date=date,
        season_year=season_year,
        season_type=season_type,
        include_pbp=include_pbp,
        locale=locale,
        max_concurrency=max_concurrency,
    )

    print(json.dumps(result, indent=2))
    return result


def main():
    os.chdir(BASE_DIR)

    parser = argparse.ArgumentParser(description="Test SportRadar import scripts")
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
    parser.add_argument(
        "--source-api",
        default="nba",
        choices=["nba", "ncaa", "gleague", "intl"],
        help="SportRadar source API",
    )
    parser.add_argument(
        "--mode",
        default="daily",
        choices=["daily", "backfill"],
        help="Fetch mode",
    )
    parser.add_argument("--date", help="Date for daily mode (YYYY-MM-DD)")
    parser.add_argument("--season-year", type=int, help="Season year for backfill mode")
    parser.add_argument("--season-type", help="Season type for backfill mode (REG, PRE, PST, etc.)")
    parser.add_argument(
        "--include-pbp",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Include play-by-play fetch",
    )
    parser.add_argument("--locale", default="en", help="Locale for SportRadar")
    parser.add_argument("--max-concurrency", type=int, default=6, help="Max concurrent HTTP requests")

    args = parser.parse_args()
    dry_run = not args.write

    if args.script == "all":
        results = {}
        for name in (
            "seasons",
            "teams",
            "players",
            "games",
            "game_stats",
            "pbp",
            "standings",
            "rankings",
            "injuries",
            "season_stats",
            "season_splits",
            "series",
            "tournaments",
            "leaders",
            "draft",
            "intl_hierarchy",
        ):
            if name == "pbp" and not args.include_pbp:
                continue
            results[name] = run_script(
                name,
                dry_run=dry_run,
                source_api=args.source_api,
                mode=args.mode,
                date=args.date,
                season_year=args.season_year,
                season_type=args.season_type,
                include_pbp=args.include_pbp,
                locale=args.locale,
                max_concurrency=args.max_concurrency,
            )

        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        for name, result in results.items():
            errors = result.get("errors", [])
            tables = result.get("tables", [])
            status = "✓" if not errors else "✗"
            table_count = len(tables) if tables else 0
            print(f"{status} {name}: {table_count} tables, {len(errors)} errors")
    else:
        run_script(
            args.script,
            dry_run=dry_run,
            source_api=args.source_api,
            mode=args.mode,
            date=args.date,
            season_year=args.season_year,
            season_type=args.season_type,
            include_pbp=args.include_pbp,
            locale=args.locale,
            max_concurrency=args.max_concurrency,
        )


if __name__ == "__main__":
    main()
