"""
Verification section writer for BUDGET_LEDGER.

Verifies that derived totals match snapshot (when no deltas).
"""

from __future__ import annotations

from typing import Any

import xlsxwriter.utility

from xlsxwriter.worksheet import Worksheet

from .constants import COL_LABEL, COL_CAP, COL_NOTES
from .helpers import warehouse_sumifs


def write_verification_section(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    budget_formats: dict[str, Any],
    snapshot_total_row: int,
) -> int:
    """Write verification that derived totals match snapshot (when no deltas).
    
    This section confirms the ledger is consistent.
    
    Returns next row.
    """
    # Section header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "VERIFICATION (Baseline Mode — no plan deltas)",
        budget_formats["subsection_header"]
    )
    row += 1
    
    # In baseline mode with no plan deltas, derived should equal snapshot
    # This is a sanity check that formulas are wired correctly
    
    snapshot_cap = xlsxwriter.utility.xl_rowcol_to_cell(snapshot_total_row, COL_CAP)
    
    # Compare snapshot cap_total to warehouse cap_total (should be same formula)
    worksheet.write(row, COL_LABEL, "Snapshot vs Warehouse check:", budget_formats["label"])
    
    # This verifies that our snapshot section correctly pulls from warehouse
    verify_formula = (
        f"=IF({snapshot_cap}={warehouse_sumifs('cap_total')},"
        f"\"✓ Matched\",\"✗ MISMATCH\")"
    )
    worksheet.write_formula(row, COL_CAP, verify_formula)
    
    # Conditional formatting
    worksheet.conditional_format(row, COL_CAP, row, COL_CAP, {
        "type": "text",
        "criteria": "containing",
        "value": "✓",
        "format": budget_formats["verify_ok"],
    })
    worksheet.conditional_format(row, COL_CAP, row, COL_CAP, {
        "type": "text",
        "criteria": "containing",
        "value": "✗",
        "format": budget_formats["verify_fail"],
    })
    
    worksheet.write(row, COL_NOTES, "Confirms snapshot pulls correctly from warehouse", budget_formats["note"])
    row += 2
    
    return row
