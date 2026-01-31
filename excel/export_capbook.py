#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["xlsxwriter", "psycopg[binary]"]
# ///
"""
Export the NBA cap workbook to Excel.

Generates a self-contained .xlsx workbook from Postgres (pcms.* warehouses).

Usage:
    uv run excel/export_capbook.py --out shared/capbook.xlsx --base-year 2025 --as-of 2026-01-31
    uv run excel/export_capbook.py --help

Design reference:
    reference/blueprints/README.md
    reference/blueprints/excel-cap-book-blueprint.md
    reference/blueprints/excel-workbook-data-contract.md
"""

import argparse
import sys
from datetime import date
from pathlib import Path


def parse_date(s: str) -> date:
    """Parse YYYY-MM-DD date string."""
    try:
        return date.fromisoformat(s)
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid date format: {s}. Use YYYY-MM-DD.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export NBA cap workbook to Excel.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    uv run excel/export_capbook.py --out shared/capbook.xlsx --base-year 2025 --as-of 2026-01-31
    uv run excel/export_capbook.py --out shared/capbook.xlsx --base-year 2025 --as-of today

Design reference:
    reference/blueprints/excel-cap-book-blueprint.md
""",
    )
    parser.add_argument(
        "--out",
        type=Path,
        required=True,
        help="Output file path (.xlsx)",
    )
    parser.add_argument(
        "--base-year",
        type=int,
        required=True,
        help="Base salary year (e.g., 2025)",
    )
    parser.add_argument(
        "--as-of",
        type=str,
        required=True,
        help="As-of date (YYYY-MM-DD or 'today')",
    )
    parser.add_argument(
        "--league",
        type=str,
        default="NBA",
        help="League code (default: NBA)",
    )
    parser.add_argument(
        "--skip-assertions",
        action="store_true",
        help="Skip SQL assertions (for testing/debugging)",
    )
    args = parser.parse_args()

    # Parse as-of date
    if args.as_of.lower() == "today":
        as_of_date = date.today()
    else:
        as_of_date = parse_date(args.as_of)

    # Ensure output directory exists
    args.out.parent.mkdir(parents=True, exist_ok=True)

    # Import build module (after parsing args to avoid import errors on --help)
    from capbook.build import build_capbook

    print(f"Building cap workbook...")
    print(f"  Output:    {args.out}")
    print(f"  Base year: {args.base_year}")
    print(f"  As-of:     {as_of_date}")
    print(f"  League:    {args.league}")
    print()

    # Build the workbook
    meta = build_capbook(
        out_path=args.out,
        base_year=args.base_year,
        as_of=as_of_date,
        league=args.league,
        skip_assertions=args.skip_assertions,
    )

    # Report results
    print(f"Workbook generated: {args.out}")
    print(f"  Refreshed at: {meta['refreshed_at']}")
    print(f"  Git SHA:      {meta['exporter_git_sha']}")
    print(f"  Validation:   {meta['validation_status']}")

    if meta["validation_status"] != "PASS":
        print()
        print("VALIDATION FAILED:")
        for err in meta.get("validation_errors", []):
            print(f"  {err[:200]}...")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
