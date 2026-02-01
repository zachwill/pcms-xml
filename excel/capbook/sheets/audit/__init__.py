"""
AUDIT_AND_RECONCILE sheet writer.

This sheet is the "prevent 'your number is wrong' fights" layer.
Per the blueprint (excel-cap-book-blueprint.md), it must include:
- Totals reconciliation (snapshot vs counting rows vs derived totals)
- Contributing rows drilldowns for each headline readout
- Assumptions applied (fill rows, toggles, overrides)
- Plan diff (baseline vs ActivePlan) and journal action summary

This implementation provides:
1. Shared command bar (read-only reference to TEAM_COCKPIT)
2. Summary banner (at-a-glance reconciliation status for cap/tax/apron)
3. Authoritative totals from DATA_team_salary_warehouse (by bucket)
4. Drilldown table sums (salary_book, cap_holds, dead_money)
5. Visible deltas with conditional formatting
6. Row counts + counts-vs-exists summary
7. Policy assumptions summary (fill rows, toggles)
8. Plan diff section (Baseline vs ActivePlan delta totals + action counts)
9. Notes section with drilldown links

Design notes:
- Uses Excel formulas filtered by SelectedTeam + SelectedYear
- **Uses LET + FILTER + SUM patterns instead of legacy SUMPRODUCT** (Excel 365/2021+)
- Salary book drilldowns use LET + CHOOSECOLS + FILTER for year-column selection
- Plan diff uses shared PlanRowMask LAMBDA helper for consistent filtering
- Conditional formatting highlights any non-zero deltas as red (reconciliation failures)
- Row count comparison shows if drilldown tables have expected number of rows

Module structure (split by reconciliation type):
- formats.py: Layout constants + format definitions
- helpers.py: SUMIFS/FILTER formula builders
- cap_reconciliation.py: Cap amount reconciliation
- tax_reconciliation.py: Tax amount reconciliation
- apron_reconciliation.py: Apron amount reconciliation
- row_counts.py: Row counts reconciliation
- plan_diff.py: Plan diff (Baseline vs ActivePlan)
- policy_assumptions.py: Policy assumptions + summary banner + notes
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from .formats import (
    COLUMN_WIDTHS,
    create_audit_formats,
)
from .cap_reconciliation import write_cap_reconciliation_section
from .tax_reconciliation import write_tax_reconciliation_section
from .apron_reconciliation import write_apron_reconciliation_section
from .row_counts import write_row_counts_section
from .plan_diff import write_plan_diff_section
from .policy_assumptions import (
    write_summary_banner,
    write_policy_assumptions_section,
    write_notes_section,
)
from ..command_bar import (
    write_command_bar_readonly,
    get_content_start_row,
)


def write_audit_and_reconcile(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
    build_meta: dict[str, Any],
) -> None:
    """
    Write AUDIT_AND_RECONCILE sheet — the explainability and verification layer.

    The audit sheet shows:
    - Summary banner (at-a-glance reconciliation status)
    - Cap amount reconciliation (warehouse vs drilldown by bucket)
    - Tax amount reconciliation (warehouse vs drilldown by bucket)
    - Apron amount reconciliation (warehouse vs drilldown by bucket)
    - Row counts comparison
    - Policy assumptions summary (fill rows, toggles)
    - Plan diff (Baseline vs ActivePlan delta totals + action counts)
    - Notes and guidance

    Per the blueprint:
    - Prevent "your number is wrong" fights
    - Every headline total must have a contributing-rows drilldown
    - Visible deltas with conditional formatting (green=OK, red=mismatch)

    Args:
        workbook: The XlsxWriter Workbook
        worksheet: The AUDIT_AND_RECONCILE worksheet
        formats: Standard format dict from create_standard_formats
        build_meta: Build metadata (used for context, not directly displayed here)
    """
    # Sheet title
    worksheet.write(0, 0, "AUDIT & RECONCILE", formats["header"])
    worksheet.write(1, 0, "Reconciliation and explainability layer — verifies drilldown tables match warehouse totals")
    
    # Write read-only command bar (consistent with other UI sheets)
    write_command_bar_readonly(workbook, worksheet, formats)
    
    # Set column widths
    for col, width in COLUMN_WIDTHS.items():
        worksheet.set_column(col, col, width)
    
    # Create audit-specific formats
    audit_formats = create_audit_formats(workbook)
    
    # Content starts after command bar
    content_row = get_content_start_row()
    
    # 1. Summary banner (at-a-glance status)
    content_row = write_summary_banner(worksheet, content_row, formats, audit_formats)
    
    # 2. Cap amount reconciliation
    content_row = write_cap_reconciliation_section(worksheet, content_row, formats, audit_formats)
    
    # 3. Tax amount reconciliation
    content_row = write_tax_reconciliation_section(worksheet, content_row, formats, audit_formats)
    
    # 4. Apron amount reconciliation
    content_row = write_apron_reconciliation_section(worksheet, content_row, formats, audit_formats)
    
    # 5. Row counts
    content_row = write_row_counts_section(worksheet, content_row, formats, audit_formats)
    
    # 6. Policy assumptions
    content_row = write_policy_assumptions_section(worksheet, content_row, formats, audit_formats)
    
    # 7. Plan diff (Baseline vs ActivePlan)
    content_row = write_plan_diff_section(worksheet, content_row, formats, audit_formats)
    
    # 8. Notes
    content_row = write_notes_section(worksheet, content_row, formats, audit_formats)
    
    # Sheet protection
    worksheet.protect(options={
        "objects": True,
        "scenarios": True,
        "format_cells": False,
        "select_unlocked_cells": True,
        "select_locked_cells": True,
    })


# Re-export the main function
__all__ = ["write_audit_and_reconcile"]
