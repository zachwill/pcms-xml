"""
Policy section writer for BUDGET_LEDGER.

Writes policy-driven deltas (generated fill rows) and policy warnings.
"""

from __future__ import annotations

from typing import Any

import xlsxwriter.utility

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ...xlsx import FMT_MONEY
from .constants import COL_LABEL, COL_CAP, COL_TAX, COL_APRON, COL_NOTES
from .helpers import write_column_headers


def write_policy_delta_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    budget_formats: dict[str, Any],
) -> tuple[int, int]:
    """Write the policy deltas section for generated fill rows.
    
    This section shows policy-driven adjustments that are NOT from the plan journal
    or authoritative warehouse data. These are analyst assumptions.
    
    Currently includes:
    - Generated roster fill rows (when RosterFillTarget > 0)
    
    Per the blueprint: policies must create visible generated rows that are toggleable.
    
    Returns (next_row, policy_delta_total_row).
    """
    # Section header with amber styling to indicate policy/assumption nature
    policy_header_fmt = workbook.add_format({
        "bold": True,
        "font_size": 11,
        "bg_color": "#FEF3C7",  # amber-100
        "font_color": "#92400E",  # amber-800
        "bottom": 2,
    })
    
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "POLICY DELTAS (Generated Assumptions)",
        policy_header_fmt
    )
    row += 1
    
    # Column headers
    row = write_column_headers(worksheet, row, budget_formats)
    
    # ------------------------------------------------------------------
    # Generated Fill Rows calculation
    # ------------------------------------------------------------------
    # Current roster count formula (matches roster_grid.py and audit.py)
    # Uses ROWS(FILTER(...)) instead of SUMPRODUCT for consistency with modern standard
    current_roster_formula = (
        "IFERROR(ROWS(FILTER(tbl_salary_book_warehouse[player_id],SalaryBookRosterFilter())),0)"
    )
    
    # Fill rows needed = MAX(0, RosterFillTarget - current_roster_count)
    fill_rows_needed_formula = f"MAX(0,RosterFillTarget-{current_roster_formula})"
    
    # Fill amount per row (based on RosterFillType)
    rookie_min_formula = (
        "SUMIFS(tbl_rookie_scale[salary_year_1],"
        "tbl_rookie_scale[salary_year],SelectedYear,"
        "tbl_rookie_scale[pick_number],30)"
    )
    vet_min_formula = (
        "SUMIFS(tbl_minimum_scale[minimum_salary_amount],"
        "tbl_minimum_scale[salary_year],SelectedYear,"
        "tbl_minimum_scale[years_of_service],0)"
    )
    fill_amount_formula = (
        f'IF(RosterFillType="Rookie Min",{rookie_min_formula},'
        f'IF(RosterFillType="Vet Min",{vet_min_formula},'
        f'MIN({rookie_min_formula},{vet_min_formula})))'
    )
    
    # Total fill impact = fill_rows_needed * fill_amount (only when RosterFillTarget > 0)
    # This applies to cap/tax/apron equally (minimums count the same for all modes)
    total_fill_formula = f"IF(RosterFillTarget>0,{fill_rows_needed_formula}*{fill_amount_formula},0)"
    
    # Policy delta format (amber to indicate assumption)
    policy_delta_fmt = workbook.add_format({
        "num_format": FMT_MONEY,
        "bg_color": "#FEF3C7",  # amber-100
        "font_color": "#92400E",  # amber-800
    })
    policy_delta_zero_fmt = workbook.add_format({
        "num_format": FMT_MONEY,
        "font_color": "#9CA3AF",  # gray-400 (muted when zero)
        "italic": True,
    })
    
    # Write the Generated Fill Rows row
    worksheet.write(row, COL_LABEL, "  Generated Fill Rows (GEN)", budget_formats["label_indent"])
    worksheet.write_formula(row, COL_CAP, f"={total_fill_formula}", policy_delta_zero_fmt)
    worksheet.write_formula(row, COL_TAX, f"={total_fill_formula}", policy_delta_zero_fmt)
    worksheet.write_formula(row, COL_APRON, f"={total_fill_formula}", policy_delta_zero_fmt)
    
    # Dynamic note showing fill count and type
    note_formula = (
        '=IF(RosterFillTarget>0,'
        f'"Adds "&{fill_rows_needed_formula}&" fill slots × "&RosterFillType,'
        '"Disabled (RosterFillTarget=0)")'
    )
    worksheet.write_formula(row, COL_NOTES, note_formula, budget_formats["note"])
    
    # Conditional formatting: highlight amber when fill is active (> 0)
    for col in [COL_CAP, COL_TAX, COL_APRON]:
        worksheet.conditional_format(row, col, row, col, {
            "type": "cell",
            "criteria": ">",
            "value": 0,
            "format": policy_delta_fmt,
        })
    
    fill_row = row
    row += 1
    
    # (Future: additional policy rows could be added here, e.g., incomplete roster charges)
    
    # ------------------------------------------------------------------
    # Policy Delta Total row
    # ------------------------------------------------------------------
    row += 1
    policy_total_fmt = workbook.add_format({
        "num_format": FMT_MONEY,
        "bold": True,
        "top": 1,
        "bottom": 2,
        "bg_color": "#FEF3C7",  # amber-100
        "font_color": "#92400E",  # amber-800
    })
    policy_total_zero_fmt = workbook.add_format({
        "num_format": FMT_MONEY,
        "bold": True,
        "top": 1,
        "bottom": 2,
        "bg_color": "#F3F4F6",  # gray-100 when zero
    })
    
    worksheet.write(row, COL_LABEL, "POLICY DELTA TOTAL", budget_formats["label_bold"])
    
    # For now, policy total = fill total (when more policy rows added, sum them)
    fill_cap_cell = xlsxwriter.utility.xl_rowcol_to_cell(fill_row, COL_CAP)
    fill_tax_cell = xlsxwriter.utility.xl_rowcol_to_cell(fill_row, COL_TAX)
    fill_apron_cell = xlsxwriter.utility.xl_rowcol_to_cell(fill_row, COL_APRON)
    
    worksheet.write_formula(row, COL_CAP, f"={fill_cap_cell}", policy_total_zero_fmt)
    worksheet.write_formula(row, COL_TAX, f"={fill_tax_cell}", policy_total_zero_fmt)
    worksheet.write_formula(row, COL_APRON, f"={fill_apron_cell}", policy_total_zero_fmt)
    worksheet.write(row, COL_NOTES, "Sum of policy-driven assumptions (NOT authoritative)", budget_formats["note"])
    
    # Conditional formatting for total row when active
    for col in [COL_CAP, COL_TAX, COL_APRON]:
        worksheet.conditional_format(row, col, row, col, {
            "type": "cell",
            "criteria": ">",
            "value": 0,
            "format": policy_total_fmt,
        })
    
    policy_total_row = row
    row += 2
    
    return row, policy_total_row


def write_policy_warnings(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    budget_formats: dict[str, Any],
) -> int:
    """Write policy notifications for active features.
    
    Shows informational alerts when policy toggles are active:
    - RosterFillTarget > 0: shows generated fill rows are active
    - ShowExistsOnlyRows = "Yes": shows EXISTS_ONLY section is visible
    
    Returns next row.
    """
    # Create an info/warning format for active policies
    warning_fmt = workbook.add_format({
        "bold": True,
        "bg_color": "#FEF3C7",  # amber-100
        "font_color": "#92400E",  # amber-800
        "font_size": 10,
    })
    
    # RosterFillTarget ACTIVE notification
    # Uses IF formula to only show when RosterFillTarget > 0
    worksheet.write_formula(
        row, COL_LABEL,
        '=IF(RosterFillTarget>0,"📊 ROSTER FILL ACTIVE","")',
        warning_fmt
    )
    worksheet.write_formula(
        row, COL_CAP,
        '=IF(RosterFillTarget>0,"Target="&RosterFillTarget&", Type="&RosterFillType,"")',
        warning_fmt
    )
    worksheet.write_formula(
        row, COL_NOTES,
        '=IF(RosterFillTarget>0,"Generated fill rows added — see ROSTER_GRID and AUDIT_AND_RECONCILE","")',
        workbook.add_format({
            "bg_color": "#FEF3C7",
            "font_color": "#92400E",
            "font_size": 9,
            "italic": True,
        })
    )
    
    # Conditional formatting to highlight the entire row when fill is active
    worksheet.conditional_format(row, COL_LABEL, row, COL_NOTES, {
        "type": "formula",
        "criteria": "=RosterFillTarget>0",
        "format": warning_fmt,
    })
    
    row += 1
    
    # ShowExistsOnlyRows info message (feature now implemented)
    # The EXISTS_ONLY section is now available in ROSTER_GRID
    info_fmt = workbook.add_format({
        "bg_color": "#DBEAFE",  # blue-100
        "font_color": "#1E40AF",  # blue-800
        "font_size": 9,
    })
    worksheet.write_formula(
        row, COL_LABEL,
        '=IF(ShowExistsOnlyRows="Yes","ℹ️ EXISTS_ONLY section active","")',
        info_fmt
    )
    worksheet.write_formula(
        row, COL_CAP,
        '=IF(ShowExistsOnlyRows="Yes","See ROSTER_GRID","")',
        info_fmt
    )
    worksheet.write_formula(
        row, COL_NOTES,
        '=IF(ShowExistsOnlyRows="Yes","Non-counting rows with future-year amounts are displayed in ROSTER_GRID","")',
        workbook.add_format({
            "bg_color": "#DBEAFE",
            "font_color": "#1E40AF",
            "font_size": 9,
            "italic": True,
        })
    )
    
    # Conditional formatting to highlight the entire row when info is shown
    worksheet.conditional_format(row, COL_LABEL, row, COL_NOTES, {
        "type": "formula",
        "criteria": '=ShowExistsOnlyRows="Yes"',
        "format": info_fmt,
    })
    
    row += 1

    # NOTE: The former "Two-way toggles NOT YET IMPLEMENTED" warning was removed.
    # Two-way counting is a CBA fact (2-way counts toward cap totals, not roster).
    # The COCKPIT now shows informational 2-way readouts instead.

    # Blank row for spacing
    row += 1

    return row
