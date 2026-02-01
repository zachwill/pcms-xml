"""
Snapshot section writer for BUDGET_LEDGER.

Writes the authoritative baseline totals from team_salary_warehouse.
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.worksheet import Worksheet

from .constants import COL_LABEL, COL_CAP, COL_TAX, COL_APRON, COL_NOTES
from .helpers import warehouse_sumifs, write_column_headers


def write_snapshot_section(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    budget_formats: dict[str, Any],
) -> tuple[int, int]:
    """Write the snapshot totals section from team_salary_warehouse.
    
    This is the authoritative baseline - what PCMS says the team owes.
    
    Returns (next_row, snapshot_total_row).
    """
    # Section header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "SNAPSHOT TOTALS (from DATA_team_salary_warehouse)",
        budget_formats["section_header"]
    )
    row += 1
    
    # Column headers
    row = write_column_headers(worksheet, row, budget_formats)
    
    # Bucket breakdown
    buckets = [
        ("Roster contracts (ROST)", "cap_rost", "tax_rost", "apron_rost", "Active player contracts"),
        ("Free agent holds (FA)", "cap_fa", "tax_fa", "apron_fa", "Cap holds for FA rights"),
        ("Dead money (TERM)", "cap_term", "tax_term", "apron_term", "Terminated/waived contracts"),
        ("Two-way contracts (2WAY)", "cap_2way", "tax_2way", "apron_2way", "Two-way player contracts"),
    ]
    
    for label, cap_col, tax_col, apron_col, note in buckets:
        worksheet.write(row, COL_LABEL, label, budget_formats["label_indent"])
        worksheet.write_formula(row, COL_CAP, f"={warehouse_sumifs(cap_col)}", budget_formats["money"])
        worksheet.write_formula(row, COL_TAX, f"={warehouse_sumifs(tax_col)}", budget_formats["money"])
        worksheet.write_formula(row, COL_APRON, f"={warehouse_sumifs(apron_col)}", budget_formats["money"])
        worksheet.write(row, COL_NOTES, note, budget_formats["note"])
        row += 1
    
    # Total row
    row += 1  # Blank row before total
    worksheet.write(row, COL_LABEL, "SNAPSHOT TOTAL", budget_formats["label_bold"])
    worksheet.write_formula(row, COL_CAP, f"={warehouse_sumifs('cap_total')}", budget_formats["money_total"])
    worksheet.write_formula(row, COL_TAX, f"={warehouse_sumifs('tax_total')}", budget_formats["money_total"])
    worksheet.write_formula(row, COL_APRON, f"={warehouse_sumifs('apron_total')}", budget_formats["money_total"])
    worksheet.write(row, COL_NOTES, "Authoritative PCMS total", budget_formats["note"])
    
    snapshot_total_row = row  # Save for later reference
    row += 2
    
    return row, snapshot_total_row
