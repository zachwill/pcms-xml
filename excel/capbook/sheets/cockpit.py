"""
TEAM_COCKPIT sheet writer with shared command bar and primary readouts.

This module implements:
1. The editable command bar (using command_bar.write_command_bar_editable)
2. Primary readouts section driven by DATA_team_salary_warehouse
3. Sheet protection with unlocked input cells

Per the blueprint (excel-cap-book-blueprint.md), the command bar is the
workbook's "operating context" and should be consistent across all sheets.
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ..xlsx import FMT_MONEY
from .command_bar import (
    write_command_bar_editable,
    get_content_start_row,
)


# =============================================================================
# Primary Readouts Layout
# =============================================================================

# Readouts start after the command bar
def _get_readouts_start_row() -> int:
    return get_content_start_row()


# Column layout for readouts
COL_READOUT_LABEL = 0
COL_READOUT_VALUE = 1
COL_READOUT_DESC = 2


def _sumifs_formula(data_col: str) -> str:
    """Build SUMIFS formula to look up a value from tbl_team_salary_warehouse.

    Uses SelectedTeam and SelectedYear to filter.
    SUMIFS works well for numeric values with two-column lookup.
    """
    return (
        f"=SUMIFS(tbl_team_salary_warehouse[{data_col}],"
        f"tbl_team_salary_warehouse[team_code],SelectedTeam,"
        f"tbl_team_salary_warehouse[salary_year],SelectedYear)"
    )


def _if_formula(data_col: str) -> str:
    """Build INDEX/MATCH formula for boolean/text values from tbl_team_salary_warehouse.

    For booleans like is_repeater_taxpayer, we convert to display text.
    """
    # Use SUMPRODUCT with INDEX to get single value (works for text/bool)
    return (
        f"=IFERROR(INDEX(tbl_team_salary_warehouse[{data_col}],"
        f"MATCH(1,(tbl_team_salary_warehouse[team_code]=SelectedTeam)*"
        f"(tbl_team_salary_warehouse[salary_year]=SelectedYear),0)),\"\")"
    )


def write_team_cockpit_with_command_bar(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
    build_meta: dict[str, Any],
    team_codes: list[str] | None = None,
) -> None:
    """
    Write TEAM_COCKPIT sheet with editable command bar and primary readouts.

    The command bar provides the workbook's operating context:
    - SelectedTeam, SelectedYear, AsOfDate, SelectedMode
    - Policy toggles (roster fill, two-way counting, etc.)
    - Plan selectors (ActivePlan, ComparePlanA/B/C/D)

    The primary readouts section shows key metrics from DATA_team_salary_warehouse:
    - Cap position, Tax position, Apron room, Roster counts, Repeater status

    Args:
        workbook: The XlsxWriter Workbook (needed for define_name and formats)
        worksheet: The TEAM_COCKPIT worksheet
        formats: Standard format dict from create_standard_formats
        build_meta: Build metadata (base_year, as_of_date, etc.)
        team_codes: Optional list of team codes for validation dropdown
    """
    # Sheet title (row 0-1)
    worksheet.write(0, 0, "TEAM COCKPIT", formats["header"])
    worksheet.write(1, 0, "Primary flight display for team cap position")
    
    # Write the editable command bar
    write_command_bar_editable(
        workbook,
        worksheet,
        formats,
        build_meta,
        team_codes=team_codes,
        plan_names=None,  # Will be populated when PLAN_MANAGER is implemented
    )
    
    # =========================================================================
    # Primary Readouts Section
    # =========================================================================
    
    readouts_start = _get_readouts_start_row()
    
    # Create formats
    money_fmt = workbook.add_format({"num_format": FMT_MONEY, "bold": True})
    label_fmt = workbook.add_format({"bold": False})
    bold_fmt = workbook.add_format({"bold": True})
    
    # Column widths for readouts area
    worksheet.set_column(COL_READOUT_DESC, COL_READOUT_DESC, 30)
    
    # Section header
    worksheet.write(readouts_start, COL_READOUT_LABEL, "PRIMARY READOUTS", formats["header"])
    worksheet.write(
        readouts_start, COL_READOUT_DESC, "(values update when Team/Year changes)"
    )
    
    # Row assignments (relative to readouts_start)
    row_cap = readouts_start + 1
    row_tax = readouts_start + 2
    row_apron1 = readouts_start + 3
    row_apron2 = readouts_start + 4
    row_roster = readouts_start + 5
    row_repeater = readouts_start + 6
    row_cap_total = readouts_start + 7
    row_tax_total = readouts_start + 8
    
    # --- Cap Position ---
    worksheet.write(row_cap, COL_READOUT_LABEL, "Cap Position:", label_fmt)
    worksheet.write_formula(
        row_cap, COL_READOUT_VALUE, _sumifs_formula("over_cap"), money_fmt
    )
    worksheet.write_formula(
        row_cap,
        COL_READOUT_DESC,
        f'=IF({_sumifs_formula("over_cap")}>0,"over cap","cap room")',
    )

    # --- Tax Position ---
    worksheet.write(row_tax, COL_READOUT_LABEL, "Tax Position:", label_fmt)
    worksheet.write_formula(
        row_tax, COL_READOUT_VALUE, _sumifs_formula("room_under_tax"), money_fmt
    )
    worksheet.write_formula(
        row_tax,
        COL_READOUT_DESC,
        f'=IF({_sumifs_formula("room_under_tax")}>0,"under tax line","over tax line")',
    )

    # --- Room Under Apron 1 ---
    worksheet.write(row_apron1, COL_READOUT_LABEL, "Room Under Apron 1:", label_fmt)
    worksheet.write_formula(
        row_apron1, COL_READOUT_VALUE, _sumifs_formula("room_under_apron1"), money_fmt
    )
    worksheet.write_formula(
        row_apron1,
        COL_READOUT_DESC,
        f'=IF({_sumifs_formula("room_under_apron1")}>0,"under 1st apron","at/above 1st apron")',
    )

    # --- Room Under Apron 2 ---
    worksheet.write(row_apron2, COL_READOUT_LABEL, "Room Under Apron 2:", label_fmt)
    worksheet.write_formula(
        row_apron2, COL_READOUT_VALUE, _sumifs_formula("room_under_apron2"), money_fmt
    )
    worksheet.write_formula(
        row_apron2,
        COL_READOUT_DESC,
        f'=IF({_sumifs_formula("room_under_apron2")}>0,"under 2nd apron","at/above 2nd apron")',
    )

    # --- Roster Count ---
    worksheet.write(row_roster, COL_READOUT_LABEL, "Roster Count:", label_fmt)
    worksheet.write_formula(
        row_roster,
        COL_READOUT_VALUE,
        _sumifs_formula("roster_row_count"),
        bold_fmt,
    )
    worksheet.write_formula(
        row_roster,
        COL_READOUT_DESC,
        f'="NBA roster + "&{_sumifs_formula("two_way_row_count")}&" two-way"',
    )

    # --- Repeater Status ---
    worksheet.write(row_repeater, COL_READOUT_LABEL, "Repeater Status:", label_fmt)
    worksheet.write_formula(
        row_repeater,
        COL_READOUT_VALUE,
        f'=IF({_if_formula("is_repeater_taxpayer")}=TRUE,"YES","NO")',
        bold_fmt,
    )
    worksheet.write(
        row_repeater, COL_READOUT_DESC, "(repeater taxpayer if TRUE)", label_fmt
    )

    # --- Cap Total (for reference) ---
    worksheet.write(row_cap_total, COL_READOUT_LABEL, "Cap Total:", label_fmt)
    worksheet.write_formula(
        row_cap_total, COL_READOUT_VALUE, _sumifs_formula("cap_total"), money_fmt
    )
    worksheet.write_formula(
        row_cap_total,
        COL_READOUT_DESC,
        f'="vs cap of "&TEXT({_sumifs_formula("salary_cap_amount")},"$#,##0")',
    )

    # --- Tax Total (for reference) ---
    worksheet.write(row_tax_total, COL_READOUT_LABEL, "Tax Total:", label_fmt)
    worksheet.write_formula(
        row_tax_total, COL_READOUT_VALUE, _sumifs_formula("tax_total"), money_fmt
    )
    worksheet.write_formula(
        row_tax_total,
        COL_READOUT_DESC,
        f'="vs tax line of "&TEXT({_sumifs_formula("tax_level_amount")},"$#,##0")',
    )
    
    # =========================================================================
    # Sheet Protection
    # =========================================================================
    # Protect the sheet but allow editing of unlocked (input) cells
    # Input cells are marked with locked=False in command_bar.py
    worksheet.protect(options={
        "objects": True,
        "scenarios": True,
        "format_cells": False,  # Allow format changes
        "select_unlocked_cells": True,
        "select_locked_cells": True,
    })


def get_command_bar_cell_refs() -> dict[str, tuple[int, int]]:
    """Return cell positions (row, col) for command bar inputs.

    Useful for other sheets that need to reference these cells.
    
    Deprecated: Use the named ranges (SelectedTeam, etc.) instead of cell refs.
    """
    from .command_bar import NAMED_RANGES
    return NAMED_RANGES.copy()
