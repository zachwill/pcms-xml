"""
Plan diff section (Baseline vs ActivePlan comparison).
"""

from __future__ import annotations

from typing import Any

import xlsxwriter.utility

from xlsxwriter.worksheet import Worksheet

from .formats import (
    COL_LABEL,
    COL_WAREHOUSE,
    COL_DRILLDOWN,
    COL_DELTA,
    COL_STATUS,
    COL_NOTES,
    write_column_headers,
)


def write_plan_diff_section(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    audit_formats: dict[str, Any],
) -> int:
    """Write the Plan Diff section showing Baseline vs ActivePlan comparison.
    
    This section provides:
    - Active Plan and Selected Year context display
    - Total plan deltas (cap/tax/apron) for ActivePlan + SelectedYear
    - Journal action counts (total rows vs enabled rows)
    - Link to PLAN_JOURNAL for detailed drilldown
    
    The formulas use LET + FILTER + SUM (dynamic arrays) to aggregate from
    tbl_plan_journal where:
    - plan_id matches ActivePlanId (or plan_id is blank)
    - salary_year matches SelectedYear (or is blank, defaulting to SelectedYear)
    - enabled = "Yes" for counting/summing active actions
    
    Uses the shared PlanRowMask LAMBDA helper for consistent filtering logic.
    
    Returns next row.
    """
    # Section header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "PLAN DIFF (Baseline vs ActivePlan)",
        audit_formats["section_header"]
    )
    row += 1
    
    # Context display: Active Plan and Selected Year
    worksheet.write(row, COL_LABEL, "Active Plan:", audit_formats["label_indent"])
    worksheet.write_formula(row, COL_WAREHOUSE, "=ActivePlan", audit_formats["label"])
    worksheet.write(row, COL_NOTES, "Selected scenario from command bar", audit_formats["note"])
    row += 1
    
    worksheet.write(row, COL_LABEL, "Selected Year:", audit_formats["label_indent"])
    worksheet.write_formula(row, COL_WAREHOUSE, "=SelectedYear", audit_formats["count"])
    worksheet.write(row, COL_NOTES, "Year context for plan deltas", audit_formats["note"])
    row += 1
    
    row += 1  # Blank row
    
    # =========================================================================
    # Journal Action Counts
    # =========================================================================
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "Journal Action Counts (for ActivePlan + SelectedYear)",
        audit_formats["subsection_header"]
    )
    row += 1
    
    # Total rows for ActivePlan (regardless of enabled status)
    # Count rows where plan_id matches ActivePlanId AND salary_year matches SelectedYear (or blank)
    # Uses LET + FILTER + ROWS pattern instead of SUMPRODUCT
    total_rows_formula = (
        '=LET('
        '_xlpm.tbl,tbl_plan_journal,'
        '_xlpm.plan_mask,(_xlpm.tbl[plan_id]=ActivePlanId)+(_xlpm.tbl[plan_id]=""),'
        '_xlpm.year_mask,(_xlpm.tbl[salary_year]=SelectedYear)+(_xlpm.tbl[salary_year]=""),'
        '_xlpm.action_mask,_xlpm.tbl[action_type]<>"",'
        '_xlpm.mask,(_xlpm.plan_mask>0)*(_xlpm.year_mask>0)*_xlpm.action_mask,'
        '_xlpm.filtered,FILTER(_xlpm.tbl[action_type],_xlpm.mask,""),'
        'IF(ISTEXT(_xlpm.filtered),0,ROWS(_xlpm.filtered))'
        ')'
    )
    worksheet.write(row, COL_LABEL, "Total Journal Rows:", audit_formats["label_indent"])
    worksheet.write_formula(row, COL_WAREHOUSE, total_rows_formula, audit_formats["count"])
    worksheet.write(row, COL_NOTES, "Rows with action_type for ActivePlan + SelectedYear", audit_formats["note"])
    row += 1
    
    # Enabled rows count
    # Uses LET + FILTER + ROWS with PlanRowMask for consistent filtering
    enabled_rows_formula = (
        '=LET('
        '_xlpm.mask,PlanRowMask(tbl_plan_journal[plan_id],tbl_plan_journal[salary_year],tbl_plan_journal[enabled]),'
        '_xlpm.filtered,FILTER(tbl_plan_journal[enabled],_xlpm.mask,""),'
        'IF(ISTEXT(_xlpm.filtered),0,ROWS(_xlpm.filtered))'
        ')'
    )
    worksheet.write(row, COL_LABEL, "Enabled Actions:", audit_formats["label_indent"])
    worksheet.write_formula(row, COL_WAREHOUSE, enabled_rows_formula, audit_formats["count"])
    worksheet.write(row, COL_NOTES, "Only enabled actions count toward plan deltas", audit_formats["note"])
    row += 1
    
    # Disabled/pending rows (for awareness)
    worksheet.write(row, COL_LABEL, "Disabled/Pending:", audit_formats["label_indent"])
    disabled_formula = f"={xlsxwriter.utility.xl_rowcol_to_cell(row-2, COL_WAREHOUSE)}-{xlsxwriter.utility.xl_rowcol_to_cell(row-1, COL_WAREHOUSE)}"
    worksheet.write_formula(row, COL_WAREHOUSE, disabled_formula, audit_formats["count"])
    worksheet.write(row, COL_NOTES, "Rows with enabled≠Yes (excluded from deltas)", audit_formats["note"])
    row += 1
    
    row += 1  # Blank row
    
    # =========================================================================
    # Plan Delta Totals
    # =========================================================================
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "Plan Delta Totals (Enabled Actions Only)",
        audit_formats["subsection_header"]
    )
    row += 1
    
    # Column headers for delta display
    headers = ["", "Cap Δ", "Tax Δ", "Apron Δ", "Notes"]
    for col, header in enumerate(headers[:5]):
        worksheet.write(row, col, header, audit_formats["col_header"])
    row += 1
    
    # Delta Cap Total - uses LET + FILTER + SUM with PlanRowMask
    delta_cap_formula = (
        '=LET('
        '_xlpm.mask,PlanRowMask(tbl_plan_journal[plan_id],tbl_plan_journal[salary_year],tbl_plan_journal[enabled]),'
        'IFERROR(SUM(FILTER(tbl_plan_journal[delta_cap],_xlpm.mask,0)),0)'
        ')'
    )
    delta_tax_formula = (
        '=LET('
        '_xlpm.mask,PlanRowMask(tbl_plan_journal[plan_id],tbl_plan_journal[salary_year],tbl_plan_journal[enabled]),'
        'IFERROR(SUM(FILTER(tbl_plan_journal[delta_tax],_xlpm.mask,0)),0)'
        ')'
    )
    delta_apron_formula = (
        '=LET('
        '_xlpm.mask,PlanRowMask(tbl_plan_journal[plan_id],tbl_plan_journal[salary_year],tbl_plan_journal[enabled]),'
        'IFERROR(SUM(FILTER(tbl_plan_journal[delta_apron],_xlpm.mask,0)),0)'
        ')'
    )
    
    worksheet.write(row, COL_LABEL, "PLAN DELTA TOTAL", audit_formats["label_bold"])
    worksheet.write_formula(row, COL_WAREHOUSE, delta_cap_formula, audit_formats["money_bold"])
    worksheet.write_formula(row, COL_DRILLDOWN, delta_tax_formula, audit_formats["money_bold"])
    worksheet.write_formula(row, COL_DELTA, delta_apron_formula, audit_formats["money_bold"])
    worksheet.write(row, COL_NOTES, "Sum of enabled actions for ActivePlan + SelectedYear", audit_formats["note"])
    
    # Conditional formatting for delta totals (highlight non-zero)
    for col in [COL_WAREHOUSE, COL_DRILLDOWN, COL_DELTA]:
        worksheet.conditional_format(row, col, row, col, {
            "type": "cell",
            "criteria": ">",
            "value": 0,
            "format": audit_formats["delta_fail"],  # Red for increasing costs
        })
        worksheet.conditional_format(row, col, row, col, {
            "type": "cell",
            "criteria": "<",
            "value": 0,
            "format": audit_formats["delta_ok"],  # Green for savings
        })
    row += 1
    
    row += 1  # Blank row
    
    # =========================================================================
    # Drilldown Link
    # =========================================================================
    worksheet.write(
        row, COL_LABEL,
        "➤ For full journal drilldown, see PLAN_JOURNAL sheet",
        audit_formats["note"]
    )
    row += 1
    worksheet.write(
        row, COL_LABEL,
        "  PLAN_JOURNAL shows per-action details + cumulative running totals",
        audit_formats["note"]
    )
    row += 1
    worksheet.write(
        row, COL_LABEL,
        "  BUDGET_LEDGER shows plan deltas by action type with derived totals",
        audit_formats["note"]
    )
    row += 1
    
    # Note about Baseline behavior
    row += 1
    worksheet.write(
        row, COL_LABEL,
        "ℹ When ActivePlan = 'Baseline', deltas should be $0 (no journal entries).",
        audit_formats["note"]
    )
    row += 1
    
    return row + 2
