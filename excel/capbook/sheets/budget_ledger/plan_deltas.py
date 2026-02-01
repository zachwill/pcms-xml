"""
Plan deltas section writer for BUDGET_LEDGER.

Writes plan deltas from tbl_plan_journal and tbl_subsystem_outputs.
Uses modern Excel 365 formulas (LET + FILTER + SUM) instead of legacy SUMPRODUCT.
"""

from __future__ import annotations

from typing import Any

import xlsxwriter.utility

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ...xlsx import FMT_MONEY
from .constants import COL_LABEL, COL_CAP, COL_TAX, COL_APRON, COL_NOTES
from .helpers import write_column_headers


def _journal_let_filter_by_action(delta_col: str, action_type: str) -> str:
    """
    Sum journal deltas for a specific action type using LET + FILTER + SUM.
    
    Uses PlanRowMask LAMBDA for the base filter, then adds action_type filter.
    IFERROR handles empty results or blank ActivePlanId gracefully.
    """
    return (
        f'=IFERROR(LET('
        f'_xlpm.mask,PlanRowMask(tbl_plan_journal[plan_id],tbl_plan_journal[salary_year],tbl_plan_journal[enabled]),'
        f'_xlpm.action_mask,(tbl_plan_journal[action_type]="{action_type}"),'
        f'_xlpm.combined,_xlpm.mask*_xlpm.action_mask,'
        f'SUM(FILTER(tbl_plan_journal[{delta_col}],_xlpm.combined,0))'
        f'),0)'
    )


def _subsystem_let_filter_by_source(delta_col: str, source_value: str) -> str:
    """
    Sum subsystem output deltas for a specific source using LET + FILTER + SUM.
    
    Filter conditions:
    - include_in_plan = "Yes"
    - plan_id = ActivePlanId
    - salary_year = SelectedYear
    - source = source_value
    """
    return (
        f'=IFERROR(LET('
        f'_xlpm.mask,'
        f'(tbl_subsystem_outputs[include_in_plan]="Yes")*'
        f'(tbl_subsystem_outputs[plan_id]=ActivePlanId)*'
        f'(tbl_subsystem_outputs[salary_year]=SelectedYear)*'
        f'(tbl_subsystem_outputs[source]="{source_value}"),'
        f'SUM(FILTER(tbl_subsystem_outputs[{delta_col}],_xlpm.mask,0))'
        f'),0)'
    )


def write_plan_delta_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    budget_formats: dict[str, Any],
) -> tuple[int, int]:
    """Write the plan delta section sourced from tbl_plan_journal AND tbl_subsystem_outputs.
    
    This section summarizes journal actions for the active plan and selected year.
    Uses modern Excel 365 formulas (LET + FILTER + SUM) instead of legacy SUMPRODUCT.
    
    Journal entries are filtered where:
    - plan_id matches ActivePlanId (derived from ActivePlan name)
    - salary_year matches SelectedYear (or is blank, which defaults to SelectedYear)
    - enabled = "Yes"
    
    Per backlog task #19, this section ALSO includes deltas from tbl_subsystem_outputs
    where include_in_plan="Yes" AND plan_id=ActivePlanId AND salary_year=SelectedYear.
    
    Fallback behavior:
    - If ActivePlanId is blank/error (e.g., plan not found), deltas are 0
    - The "Baseline" plan has plan_id=1 but no journal entries by default
    - Blank salary_year is treated as "same as SelectedYear"
    
    **Modern Formula Pattern (per .ralph/EXCEL.md #5):**
    - Uses LET + FILTER + SUM instead of SUMPRODUCT
    - Leverages PlanRowMask LAMBDA for consistent filtering
    - IFERROR wrapping for graceful blank/error handling
    
    Returns (next_row, delta_total_row).
    """
    # Section header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "PLAN DELTAS (from tbl_plan_journal + tbl_subsystem_outputs)",
        budget_formats["section_header"]
    )
    row += 1
    
    # Column headers
    row = write_column_headers(worksheet, row, budget_formats)
    
    # -------------------------------------------------------------------------
    # JOURNAL ENTRIES subsection
    # -------------------------------------------------------------------------
    worksheet.write(
        row, COL_LABEL,
        "Journal Entries (tbl_plan_journal):",
        budget_formats["label_bold"]
    )
    worksheet.write(row, COL_NOTES, "Enabled rows for ActivePlan + SelectedYear", budget_formats["note"])
    row += 1
    
    # Action type breakdown
    action_categories = [
        ("Trade", "Trade actions"),
        ("Sign (Cap Room)", "Cap room signings"),
        ("Sign (Exception)", "Exception signings"),
        ("Sign (Minimum)", "Minimum signings"),
        ("Waive", "Waiver actions"),
        ("Buyout", "Buyout actions"),
        ("Stretch", "Stretch provisions"),
        ("Renounce", "Renounced rights"),
        ("Other", "Other actions"),
    ]
    
    delta_row_start = row  # Track for conditional formatting
    
    for action_type, note in action_categories:
        worksheet.write(row, COL_LABEL, f"  {action_type}", budget_formats["label_indent"])
        
        # LET + FILTER: sum delta where PlanRowMask matches AND action_type matches
        cap_formula = _journal_let_filter_by_action("delta_cap", action_type)
        tax_formula = _journal_let_filter_by_action("delta_tax", action_type)
        apron_formula = _journal_let_filter_by_action("delta_apron", action_type)
        
        worksheet.write_formula(row, COL_CAP, cap_formula, budget_formats["delta_zero"])
        worksheet.write_formula(row, COL_TAX, tax_formula, budget_formats["delta_zero"])
        worksheet.write_formula(row, COL_APRON, apron_formula, budget_formats["delta_zero"])
        worksheet.write(row, COL_NOTES, note, budget_formats["note"])
        row += 1
    
    journal_delta_row_end = row - 1  # Last journal data row
    
    # Journal entries subtotal using LET + FILTER + SUM with PlanRowMask
    journal_subtotal_cap_formula = (
        '=IFERROR(LET('
        '_xlpm.mask,PlanRowMask(tbl_plan_journal[plan_id],tbl_plan_journal[salary_year],tbl_plan_journal[enabled]),'
        'SUM(FILTER(tbl_plan_journal[delta_cap],_xlpm.mask,0))'
        '),0)'
    )
    journal_subtotal_tax_formula = (
        '=IFERROR(LET('
        '_xlpm.mask,PlanRowMask(tbl_plan_journal[plan_id],tbl_plan_journal[salary_year],tbl_plan_journal[enabled]),'
        'SUM(FILTER(tbl_plan_journal[delta_tax],_xlpm.mask,0))'
        '),0)'
    )
    journal_subtotal_apron_formula = (
        '=IFERROR(LET('
        '_xlpm.mask,PlanRowMask(tbl_plan_journal[plan_id],tbl_plan_journal[salary_year],tbl_plan_journal[enabled]),'
        'SUM(FILTER(tbl_plan_journal[delta_apron],_xlpm.mask,0))'
        '),0)'
    )
    
    worksheet.write(row, COL_LABEL, "  Journal Subtotal", budget_formats["label_indent"])
    worksheet.write_formula(row, COL_CAP, journal_subtotal_cap_formula, budget_formats["money"])
    worksheet.write_formula(row, COL_TAX, journal_subtotal_tax_formula, budget_formats["money"])
    worksheet.write_formula(row, COL_APRON, journal_subtotal_apron_formula, budget_formats["money"])
    worksheet.write(row, COL_NOTES, "Sum of tbl_plan_journal entries", budget_formats["note"])
    journal_subtotal_row = row
    row += 2
    
    # -------------------------------------------------------------------------
    # SUBSYSTEM OUTPUTS subsection
    # -------------------------------------------------------------------------
    # Create subsystem-specific formats (blue tint to differentiate from journal)
    subsystem_header_fmt = workbook.add_format({
        "bold": True,
        "font_size": 10,
        "bg_color": "#DBEAFE",  # blue-100
        "font_color": "#1E40AF",  # blue-800
    })
    subsystem_value_fmt = workbook.add_format({
        "num_format": FMT_MONEY,
        "bg_color": "#EFF6FF",  # blue-50
    })
    subsystem_note_fmt = workbook.add_format({
        "font_size": 9,
        "font_color": "#1E40AF",  # blue-800
        "italic": True,
        "bg_color": "#EFF6FF",  # blue-50
    })
    
    worksheet.write(
        row, COL_LABEL,
        "Subsystem Outputs (tbl_subsystem_outputs):",
        budget_formats["label_bold"]
    )
    worksheet.write(row, COL_NOTES, "Included rows for ActivePlan + SelectedYear", budget_formats["note"])
    row += 1
    
    # Subsystem output row breakdown using LET + FILTER + SUM
    subsystem_sources = [
        ("Trade Lane A", "Trade Lane A"),
        ("Trade Lane B", "Trade Lane B"),
        ("Trade Lane C", "Trade Lane C"),
        ("Trade Lane D", "Trade Lane D"),
        ("Signings", "Signings (SIGNINGS_AND_EXCEPTIONS)"),
        ("Waive/Buyout", "Waive/Buyout (WAIVE_BUYOUT_STRETCH)"),
    ]
    
    subsystem_row_start = row
    
    for label, source_value in subsystem_sources:
        worksheet.write(row, COL_LABEL, f"  {label}", budget_formats["label_indent"])
        
        # LET + FILTER: sum delta by source
        cap_formula = _subsystem_let_filter_by_source("delta_cap", source_value)
        tax_formula = _subsystem_let_filter_by_source("delta_tax", source_value)
        apron_formula = _subsystem_let_filter_by_source("delta_apron", source_value)
        
        worksheet.write_formula(row, COL_CAP, cap_formula, subsystem_value_fmt)
        worksheet.write_formula(row, COL_TAX, tax_formula, subsystem_value_fmt)
        worksheet.write_formula(row, COL_APRON, apron_formula, subsystem_value_fmt)
        worksheet.write(row, COL_NOTES, f"From {source_value}", subsystem_note_fmt)
        row += 1
    
    subsystem_row_end = row - 1
    
    # Subsystem outputs subtotal using LET + FILTER + SUM
    subsystem_subtotal_cap_formula = (
        '=IFERROR(LET('
        '_xlpm.mask,'
        '(tbl_subsystem_outputs[include_in_plan]="Yes")*'
        '(tbl_subsystem_outputs[plan_id]=ActivePlanId)*'
        '(tbl_subsystem_outputs[salary_year]=SelectedYear),'
        'SUM(FILTER(tbl_subsystem_outputs[delta_cap],_xlpm.mask,0))'
        '),0)'
    )
    subsystem_subtotal_tax_formula = (
        '=IFERROR(LET('
        '_xlpm.mask,'
        '(tbl_subsystem_outputs[include_in_plan]="Yes")*'
        '(tbl_subsystem_outputs[plan_id]=ActivePlanId)*'
        '(tbl_subsystem_outputs[salary_year]=SelectedYear),'
        'SUM(FILTER(tbl_subsystem_outputs[delta_tax],_xlpm.mask,0))'
        '),0)'
    )
    subsystem_subtotal_apron_formula = (
        '=IFERROR(LET('
        '_xlpm.mask,'
        '(tbl_subsystem_outputs[include_in_plan]="Yes")*'
        '(tbl_subsystem_outputs[plan_id]=ActivePlanId)*'
        '(tbl_subsystem_outputs[salary_year]=SelectedYear),'
        'SUM(FILTER(tbl_subsystem_outputs[delta_apron],_xlpm.mask,0))'
        '),0)'
    )
    
    worksheet.write(row, COL_LABEL, "  Subsystem Subtotal", budget_formats["label_indent"])
    worksheet.write_formula(row, COL_CAP, subsystem_subtotal_cap_formula, subsystem_value_fmt)
    worksheet.write_formula(row, COL_TAX, subsystem_subtotal_tax_formula, subsystem_value_fmt)
    worksheet.write_formula(row, COL_APRON, subsystem_subtotal_apron_formula, subsystem_value_fmt)
    worksheet.write(row, COL_NOTES, "Sum of tbl_subsystem_outputs entries", subsystem_note_fmt)
    subsystem_subtotal_row = row
    row += 2
    
    # -------------------------------------------------------------------------
    # PLAN DELTA TOTAL (Journal + Subsystem)
    # -------------------------------------------------------------------------
    journal_cap_cell = xlsxwriter.utility.xl_rowcol_to_cell(journal_subtotal_row, COL_CAP)
    journal_tax_cell = xlsxwriter.utility.xl_rowcol_to_cell(journal_subtotal_row, COL_TAX)
    journal_apron_cell = xlsxwriter.utility.xl_rowcol_to_cell(journal_subtotal_row, COL_APRON)
    
    subsystem_cap_cell = xlsxwriter.utility.xl_rowcol_to_cell(subsystem_subtotal_row, COL_CAP)
    subsystem_tax_cell = xlsxwriter.utility.xl_rowcol_to_cell(subsystem_subtotal_row, COL_TAX)
    subsystem_apron_cell = xlsxwriter.utility.xl_rowcol_to_cell(subsystem_subtotal_row, COL_APRON)
    
    worksheet.write(row, COL_LABEL, "PLAN DELTA TOTAL", budget_formats["label_bold"])
    worksheet.write_formula(row, COL_CAP, f"={journal_cap_cell}+{subsystem_cap_cell}", budget_formats["money_total"])
    worksheet.write_formula(row, COL_TAX, f"={journal_tax_cell}+{subsystem_tax_cell}", budget_formats["money_total"])
    worksheet.write_formula(row, COL_APRON, f"={journal_apron_cell}+{subsystem_apron_cell}", budget_formats["money_total"])
    worksheet.write(row, COL_NOTES, "Journal + Subsystem Outputs for ActivePlan + SelectedYear", budget_formats["note"])
    
    delta_total_row = row
    row += 1
    
    # -------------------------------------------------------------------------
    # WARNING BANNER when subsystem outputs are included
    # -------------------------------------------------------------------------
    warning_fmt = workbook.add_format({
        "bold": True,
        "font_size": 9,
        "font_color": "#1E40AF",  # blue-800
        "bg_color": "#DBEAFE",  # blue-100
        "italic": True,
    })
    
    # Formula: if subsystem subtotal != 0, show warning
    worksheet.write_formula(
        row, COL_LABEL,
        f'=IF({subsystem_cap_cell}<>0,"ℹ️ Subsystem outputs included in PLAN DELTA TOTAL","")',
        warning_fmt
    )
    worksheet.write_formula(
        row, COL_NOTES,
        f'=IF({subsystem_cap_cell}<>0,"See PLAN_JOURNAL → SUBSYSTEM_OUTPUTS table","")',
        warning_fmt
    )
    
    # Conditional formatting to highlight the entire row when subsystem outputs are active
    worksheet.conditional_format(row, COL_LABEL, row, COL_NOTES, {
        "type": "formula",
        "criteria": f"={subsystem_cap_cell}<>0",
        "format": warning_fmt,
    })
    
    row += 2
    
    # Conditional formatting for delta cells (positive=red/cost, negative=green/savings)
    # Apply to the journal category rows
    for delta_row in range(delta_row_start, journal_delta_row_end + 1):
        for col in [COL_CAP, COL_TAX, COL_APRON]:
            worksheet.conditional_format(delta_row, col, delta_row, col, {
                "type": "cell",
                "criteria": ">",
                "value": 0,
                "format": budget_formats["delta_positive"],
            })
            worksheet.conditional_format(delta_row, col, delta_row, col, {
                "type": "cell",
                "criteria": "<",
                "value": 0,
                "format": budget_formats["delta_negative"],
            })
    
    # Apply to subsystem rows as well
    for delta_row in range(subsystem_row_start, subsystem_row_end + 1):
        for col in [COL_CAP, COL_TAX, COL_APRON]:
            worksheet.conditional_format(delta_row, col, delta_row, col, {
                "type": "cell",
                "criteria": ">",
                "value": 0,
                "format": budget_formats["delta_positive"],
            })
            worksheet.conditional_format(delta_row, col, delta_row, col, {
                "type": "cell",
                "criteria": "<",
                "value": 0,
                "format": budget_formats["delta_negative"],
            })
    
    return row, delta_total_row
