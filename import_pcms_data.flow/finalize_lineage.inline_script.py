"""
Finalize Lineage - Aggregates results from all import steps

This step runs last and:
1. Aggregates errors from all previous steps
2. Counts total records processed
3. Returns final summary

No database operations - just summarizes results.
"""
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────


def main(dry_run: bool = False, summaries: list[dict] = None):
    """
    Aggregate results from all import steps.

    Args:
        dry_run: Whether this was a dry run
        summaries: List of step summaries from previous steps
    """
    started_at = datetime.now().isoformat()
    summaries = summaries or []

    # Aggregate errors and record counts from all step summaries
    all_errors: list[str] = []
    record_count = 0

    for s in summaries:
        # Collect errors array from each step
        for err in s.get("errors") or []:
            all_errors.append(err)

        # Collect table-level errors and count records
        for t in s.get("tables") or []:
            record_count += int(t.get("attempted") or 0)
            if not t.get("success"):
                all_errors.append(f"{t.get('table')}: {t.get('error', 'unknown error')}")

    status = "FAILED" if all_errors else "SUCCESS"

    return {
        "dry_run": dry_run,
        "started_at": started_at,
        "finished_at": datetime.now().isoformat(),
        "tables": [],
        "errors": all_errors,
        "status": status,
        "record_count": record_count,
        "error_count": len(all_errors),
    }
