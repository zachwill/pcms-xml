#!/usr/bin/env python3
"""
Import curated endnotes from ~/blazers/cba-docs/endnotes/revised/*.txt into pcms.endnotes.

Usage:
    uv run scripts/import-endnotes.py --dry-run   # parse + show stats, no DB writes
    uv run scripts/import-endnotes.py --write     # upsert to DB
"""

import os
import re
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional
import psycopg2
from psycopg2.extras import execute_values

# Default endnotes directory
DEFAULT_ENDNOTES_DIR = Path.home() / "blazers/cba-docs/endnotes/revised"


def parse_endnote_file(filepath: Path) -> dict:
    """Parse a single endnote file into structured fields."""
    content = filepath.read_text(encoding="utf-8")
    filename = filepath.name
    
    result = {
        "source_file": filename,
        "raw_content": content,
        "parse_errors": [],
    }
    
    # Extract endnote ID from header (e.g., "ENDNOTE 164" or "ENDNOTE 027")
    endnote_match = re.search(r"^ENDNOTE\s+(\d+)", content, re.MULTILINE)
    if endnote_match:
        result["endnote_id"] = int(endnote_match.group(1))
    else:
        # Try to get from filename (e.g., "164_bogdanovic_grimes.txt")
        fname_match = re.match(r"^(\d+)_", filename)
        if fname_match:
            result["endnote_id"] = int(fname_match.group(1))
        else:
            result["parse_errors"].append("Could not extract endnote_id")
            return result
    
    # Extract trade date
    date_match = re.search(r"TRADE DATE:\s*(.+)", content)
    if date_match:
        date_str = date_match.group(1).strip()
        try:
            # Parse formats like "February 8, 2024"
            parsed_date = datetime.strptime(date_str, "%B %d, %Y")
            result["trade_date"] = parsed_date.date().isoformat()
        except ValueError:
            result["parse_errors"].append(f"Could not parse date: {date_str}")
    
    # Extract status
    status_match = re.search(r"^STATUS:\s*(.+?)(?:\n\n|\n(?=[A-Z])|\Z)", content, re.MULTILINE | re.DOTALL)
    if status_match:
        result["status"] = status_match.group(1).strip()
    
    # Extract trade summary section
    summary_match = re.search(r"TRADE SUMMARY:\n((?:  .+\n)+)", content)
    if summary_match:
        result["trade_summary"] = summary_match.group(1).strip()
    
    # Extract conveyance section
    conveyance_match = re.search(r"CONVEYANCE:\n((?:  .+\n?)+)", content)
    if conveyance_match:
        result["conveyance"] = conveyance_match.group(1).strip()
    
    # Extract protections section
    protections_match = re.search(r"PROTECTIONS:\n((?:  .+\n?)+)", content)
    if protections_match:
        result["protections"] = protections_match.group(1).strip()
    
    # Extract contingency section
    contingency_match = re.search(r"CONTINGENCY:\n((?:  .+\n?)+)", content)
    if contingency_match:
        result["contingency"] = contingency_match.group(1).strip()
    
    # Extract exercise section
    exercise_match = re.search(r"EXERCISE:\n((?:  .+\n?)+)", content)
    if exercise_match:
        result["exercise"] = exercise_match.group(1).strip()
    
    # Extract original text (the verbatim PCMS endnote)
    # Can be "ORIGINAL TEXT:" or "VERBATIM ORIGINAL:"
    original_match = re.search(
        r"(?:ORIGINAL TEXT|VERBATIM ORIGINAL):\s*\n(.+)",
        content,
        re.DOTALL
    )
    if original_match:
        result["original_text"] = original_match.group(1).strip()
    
    # Detect swap rights
    result["is_swap"] = bool(re.search(r"swap", content, re.IGNORECASE))
    
    # Detect conditional language
    conditional_keywords = [
        r"less favorable",
        r"more favorable",
        r"provided,? however",
        r"if .+ is obligated",
        r"shall be extinguished",
        r"top \d+ protected",
    ]
    result["is_conditional"] = any(
        re.search(kw, content, re.IGNORECASE) for kw in conditional_keywords
    )
    
    # Extract referenced endnotes (e.g., "see endnote 61", "per Endnote 97")
    endnote_refs = re.findall(r"(?:see |per )?[Ee]ndnote\s+(\d+)", content)
    if endnote_refs:
        result["referenced_endnotes"] = [int(x) for x in endnote_refs]
    
    # Extract teams mentioned (3-letter codes)
    team_codes = set(re.findall(r"\b([A-Z]{3})\b", content))
    # Filter out common non-team abbreviations
    non_teams = {"THE", "AND", "FOR", "NBA", "OWN", "VIA", "TOP", "NOT", "OKC"}
    # OKC is actually a team, so don't filter it
    non_teams.discard("OKC")
    team_codes = team_codes - non_teams
    if team_codes:
        result["team_codes_mentioned"] = sorted(team_codes)
    
    # Try to extract draft year(s) from content
    draft_years = re.findall(r"\b(20[2-3]\d)\b", content)
    if draft_years:
        result["draft_years_mentioned"] = sorted(set(int(y) for y in draft_years))
    
    # Detect round (1st vs 2nd)
    if re.search(r"first round|1st round", content, re.IGNORECASE):
        result["mentions_first_round"] = True
    if re.search(r"second round|2nd round", content, re.IGNORECASE):
        result["mentions_second_round"] = True
    
    return result


def load_all_endnotes(endnotes_dir: Path) -> list[dict]:
    """Load and parse all endnote files from directory.
    
    Dedupes by endnote_id, keeping the most recently modified file.
    """
    files = sorted(endnotes_dir.glob("*.txt"))
    results = []
    for f in files:
        parsed = parse_endnote_file(f)
        parsed["mtime"] = f.stat().st_mtime
        results.append(parsed)
    
    # Dedupe by endnote_id, keeping most recent
    by_id = {}
    for p in results:
        eid = p.get("endnote_id")
        if eid is None:
            continue
        if eid not in by_id or p["mtime"] > by_id[eid]["mtime"]:
            by_id[eid] = p
    
    dupes = len(results) - len(by_id)
    if dupes > 0:
        print(f"Deduped {dupes} files (kept most recent per endnote_id)")
    
    return list(by_id.values())


def build_db_row(parsed: dict) -> dict:
    """Convert parsed endnote to DB row format."""
    # Build metadata_json with everything we extracted
    metadata = {
        "source_file": parsed.get("source_file"),
        "parse_version": "1.0",
        "parsed_at": datetime.utcnow().isoformat(),
    }
    
    # Add optional parsed fields to metadata
    for key in [
        "trade_summary",
        "conveyance", 
        "protections",
        "contingency",
        "exercise",
        "status",
        "referenced_endnotes",
        "team_codes_mentioned",
        "draft_years_mentioned",
        "mentions_first_round",
        "mentions_second_round",
        "parse_errors",
    ]:
        if key in parsed and parsed[key]:
            metadata[key] = parsed[key]
    
    # Build conditions_json if we have conditional/swap info
    conditions = {}
    if parsed.get("is_swap"):
        conditions["is_swap"] = True
    if parsed.get("is_conditional"):
        conditions["is_conditional"] = True
    if parsed.get("referenced_endnotes"):
        conditions["depends_on_endnotes"] = parsed["referenced_endnotes"]
    
    return {
        "endnote_id": parsed.get("endnote_id"),
        "original_note": parsed.get("original_text"),
        "revised_note": parsed.get("raw_content"),
        "explanation": parsed.get("conveyance"),  # Use conveyance as primary explanation
        "trade_date": parsed.get("trade_date"),
        "is_swap": parsed.get("is_swap", False),
        "is_conditional": parsed.get("is_conditional", False),
        "conditions_json": json.dumps(conditions) if conditions else None,
        "metadata_json": json.dumps(metadata),
    }


def upsert_endnotes(conn, rows: list[dict], dry_run: bool = True):
    """Upsert endnotes to database."""
    if not rows:
        print("No rows to upsert")
        return
    
    # Filter out rows without endnote_id
    valid_rows = [r for r in rows if r.get("endnote_id") is not None]
    invalid_count = len(rows) - len(valid_rows)
    if invalid_count > 0:
        print(f"Skipping {invalid_count} rows without endnote_id")
    
    if dry_run:
        print(f"\n[DRY RUN] Would upsert {len(valid_rows)} endnotes")
        # Show sample
        print("\nSample rows:")
        for row in valid_rows[:3]:
            print(f"  endnote_id={row['endnote_id']}, trade_date={row.get('trade_date')}, "
                  f"is_swap={row.get('is_swap')}, is_conditional={row.get('is_conditional')}")
        return
    
    # Build upsert SQL
    columns = [
        "endnote_id", "original_note", "revised_note", "explanation",
        "trade_date", "is_swap", "is_conditional", "conditions_json",
        "metadata_json", "ingested_at"
    ]
    
    values = []
    for r in valid_rows:
        values.append((
            r["endnote_id"],
            r.get("original_note"),
            r.get("revised_note"),
            r.get("explanation"),
            r.get("trade_date"),
            r.get("is_swap", False),
            r.get("is_conditional", False),
            r.get("conditions_json"),
            r.get("metadata_json"),
            datetime.utcnow(),
        ))
    
    sql = f"""
        INSERT INTO pcms.endnotes ({', '.join(columns)})
        VALUES %s
        ON CONFLICT (endnote_id) DO UPDATE SET
            original_note = EXCLUDED.original_note,
            revised_note = EXCLUDED.revised_note,
            explanation = EXCLUDED.explanation,
            trade_date = EXCLUDED.trade_date,
            is_swap = EXCLUDED.is_swap,
            is_conditional = EXCLUDED.is_conditional,
            conditions_json = EXCLUDED.conditions_json,
            metadata_json = EXCLUDED.metadata_json,
            ingested_at = EXCLUDED.ingested_at,
            updated_at = NOW()
    """
    
    with conn.cursor() as cur:
        execute_values(cur, sql, values)
        print(f"Upserted {len(values)} endnotes")
    
    conn.commit()


def main():
    parser = argparse.ArgumentParser(description="Import curated endnotes into pcms.endnotes")
    parser.add_argument("--dry-run", action="store_true", default=True,
                        help="Parse and show stats without writing to DB (default)")
    parser.add_argument("--write", action="store_true",
                        help="Actually write to database")
    parser.add_argument("--endnotes-dir", type=Path, default=DEFAULT_ENDNOTES_DIR,
                        help=f"Directory containing endnote files (default: {DEFAULT_ENDNOTES_DIR})")
    parser.add_argument("--sample", type=int, default=0,
                        help="Only process N random files (for testing)")
    
    args = parser.parse_args()
    
    # --write overrides --dry-run
    dry_run = not args.write
    
    if not args.endnotes_dir.exists():
        print(f"Error: endnotes directory not found: {args.endnotes_dir}")
        return 1
    
    # Load all endnotes
    print(f"Loading endnotes from: {args.endnotes_dir}")
    all_parsed = load_all_endnotes(args.endnotes_dir)
    print(f"Loaded {len(all_parsed)} files")
    
    # Sample if requested
    if args.sample > 0:
        import random
        all_parsed = random.sample(all_parsed, min(args.sample, len(all_parsed)))
        print(f"Sampled {len(all_parsed)} files")
    
    # Stats
    with_errors = [p for p in all_parsed if p.get("parse_errors")]
    with_swap = [p for p in all_parsed if p.get("is_swap")]
    with_conditional = [p for p in all_parsed if p.get("is_conditional")]
    with_refs = [p for p in all_parsed if p.get("referenced_endnotes")]
    
    print(f"\nParse stats:")
    print(f"  Total files:        {len(all_parsed)}")
    print(f"  With parse errors:  {len(with_errors)}")
    print(f"  Is swap:            {len(with_swap)}")
    print(f"  Is conditional:     {len(with_conditional)}")
    print(f"  References others:  {len(with_refs)}")
    
    if with_errors:
        print(f"\nFiles with errors:")
        for p in with_errors[:5]:
            print(f"  {p.get('source_file')}: {p.get('parse_errors')}")
    
    # Build DB rows
    db_rows = [build_db_row(p) for p in all_parsed]
    
    # Connect and upsert
    postgres_url = os.environ.get("POSTGRES_URL")
    if not postgres_url:
        print("\nError: POSTGRES_URL environment variable not set")
        if not dry_run:
            return 1
        print("Continuing in dry-run mode without DB connection")
        upsert_endnotes(None, db_rows, dry_run=True)
        return 0
    
    conn = psycopg2.connect(postgres_url)
    try:
        upsert_endnotes(conn, db_rows, dry_run=dry_run)
    finally:
        conn.close()
    
    return 0


if __name__ == "__main__":
    exit(main())
