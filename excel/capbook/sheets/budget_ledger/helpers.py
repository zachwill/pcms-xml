"""
Helper functions for the BUDGET_LEDGER sheet.

Provides SUMIFS formula builders and column header writer.
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.worksheet import Worksheet

from .constants import COL_LABEL, COL_CAP, COL_TAX, COL_APRON, COL_NOTES


def warehouse_sumifs(column: str) -> str:
    """Build SUMIFS formula for team_salary_warehouse filtered by SelectedTeam + SelectedYear."""
    return (
        f"SUMIFS(tbl_team_salary_warehouse[{column}],"
        f"tbl_team_salary_warehouse[team_code],SelectedTeam,"
        f"tbl_team_salary_warehouse[salary_year],SelectedYear)"
    )


def system_sumifs(column: str) -> str:
    """Build SUMIFS formula for system_values filtered by SelectedYear."""
    return (
        f"SUMIFS(tbl_system_values[{column}],"
        f"tbl_system_values[salary_year],SelectedYear)"
    )


def write_column_headers(
    worksheet: Worksheet,
    row: int,
    budget_formats: dict[str, Any],
) -> int:
    """Write the column headers for the budget ledger.
    
    Returns next row.
    """
    fmt = budget_formats["col_header"]
    
    worksheet.write(row, COL_LABEL, "", fmt)
    worksheet.write(row, COL_CAP, "Cap", fmt)
    worksheet.write(row, COL_TAX, "Tax", fmt)
    worksheet.write(row, COL_APRON, "Apron", fmt)
    worksheet.write(row, COL_NOTES, "Notes", fmt)
    
    return row + 1
