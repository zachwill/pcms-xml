"""
Thresholds section writer for BUDGET_LEDGER.

Writes system thresholds (cap, tax, aprons) for context.
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.worksheet import Worksheet

from .constants import COL_LABEL, COL_CAP, COL_NOTES
from .helpers import system_sumifs


def write_thresholds_section(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    budget_formats: dict[str, Any],
) -> int:
    """Write system thresholds for context.
    
    Returns next row.
    """
    # Subsection header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "System Thresholds (for SelectedYear)",
        budget_formats["subsection_header"]
    )
    row += 1
    
    thresholds = [
        ("Salary Cap", "salary_cap_amount"),
        ("Tax Level", "tax_level_amount"),
        ("First Apron", "tax_apron_amount"),
        ("Second Apron", "tax_apron2_amount"),
        ("Minimum Team Salary", "minimum_team_salary_amount"),
    ]
    
    for label, col in thresholds:
        worksheet.write(row, COL_LABEL, label, budget_formats["threshold_label"])
        worksheet.write_formula(row, COL_CAP, f"={system_sumifs(col)}", budget_formats["threshold_value"])
        row += 1
    
    row += 1
    return row
