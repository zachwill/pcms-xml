"""
BUDGET_LEDGER sheet writer — authoritative totals and deltas.

This module implements the "accounting statement" for team salary cap:
1. Shared command bar (read-only reference to TEAM_COCKPIT)
2. Snapshot totals section (from tbl_team_salary_warehouse)
   - Cap/Tax/Apron totals by bucket (ROST, FA, TERM, 2WAY)
   - System thresholds for context
3. Plan delta section (from tbl_plan_journal + tbl_subsystem_outputs)
   - Journal entries: manual actions filtered by ActivePlanId AND SelectedYear
   - Subsystem outputs: auto-linked deltas from TRADE_MACHINE, SIGNINGS, WAIVE sheets
   - Combined PLAN DELTA TOTAL from both sources
4. Policy delta section (generated fill rows and other analyst assumptions)
5. Derived totals section (snapshot + plan + policy)
6. Delta vs snapshot verification

Per the blueprint (excel-cap-book-blueprint.md):
- BUDGET_LEDGER is the "single source of truth for totals and deltas"
- This is the sheet you use to explain numbers to a GM/owner
- Every headline total must have an audit path
- Policy deltas are explicit and toggleable (visible generated rows)

Design notes:
- Uses Excel formulas filtered by SelectedTeam + SelectedYear + SelectedMode
- Mode-aware display (Cap vs Tax vs Apron columns)
- Plan deltas are aggregated from BOTH:
  - tbl_plan_journal (enabled rows, filtered by ActivePlanId + salary_year)
  - tbl_subsystem_outputs (include_in_plan="Yes", plan_id=ActivePlanId, salary_year=SelectedYear)
- Each journal entry has a salary_year column; blank means "use SelectedYear"
- Subsystem outputs auto-link to TRADE_MACHINE, SIGNINGS_AND_EXCEPTIONS, WAIVE_BUYOUT_STRETCH
- Policy deltas show generated fill impact with amber styling to indicate assumptions

**Excel 365/2021 Required (Modern Formulas):**
- Uses LET + FILTER + SUM instead of legacy SUMPRODUCT for plan deltas
- Leverages PlanRowMask LAMBDA for consistent filtering across the workbook
- See .ralph/EXCEL.md backlog item #5 for migration rationale

Split into modules:
- constants.py: Layout constants & column widths
- formats.py: Format definitions
- helpers.py: SUMIFS formula builders & column headers
- snapshot.py: Snapshot section writer
- thresholds.py: Thresholds section writer
- plan_deltas.py: Plan delta section writer
- policy.py: Policy delta section + policy warnings
- derived.py: Derived totals section writer
- verification.py: Verification section writer
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ..command_bar import (
    write_command_bar_readonly,
    get_content_start_row,
)

from .constants import COLUMN_WIDTHS
from .formats import create_budget_formats
from .snapshot import write_snapshot_section
from .thresholds import write_thresholds_section
from .plan_deltas import write_plan_delta_section
from .policy import write_policy_delta_section, write_policy_warnings
from .derived import write_derived_section
from .verification import write_verification_section


def write_budget_ledger(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write BUDGET_LEDGER sheet — the authoritative accounting statement.

    The budget ledger shows:
    - Snapshot totals by bucket from DATA_team_salary_warehouse
    - System thresholds for context
    - Plan deltas (from tbl_plan_journal, enabled rows filtered by ActivePlanId + SelectedYear)
    - Policy deltas (generated fill rows and other analyst assumptions)
    - Derived totals (snapshot + plan + policy)
    - Room/over analysis for cap/tax/aprons
    - Verification that formulas are consistent

    Per the blueprint:
    - This is the "single source of truth for totals and deltas"
    - This is the sheet you use to explain numbers to a GM/owner
    - Mode-aware (Cap vs Tax vs Apron columns always visible)
    - Policy deltas are explicit and toggleable (visible generated rows)

    Args:
        workbook: The XlsxWriter Workbook
        worksheet: The BUDGET_LEDGER worksheet
        formats: Standard format dict from create_standard_formats
    """
    # Sheet title
    worksheet.write(0, 0, "BUDGET LEDGER", formats["header"])
    worksheet.write(1, 0, "Authoritative accounting statement (Snapshot + Plan + Policy = Derived)")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    # Set column widths
    for col, width in COLUMN_WIDTHS.items():
        worksheet.set_column(col, col, width)
    
    # Create budget-specific formats
    budget_formats = create_budget_formats(workbook)
    
    # Content starts after command bar
    content_row = get_content_start_row()
    
    # 0. Policy warnings (NOT YET IMPLEMENTED alerts)
    content_row = write_policy_warnings(
        workbook, worksheet, content_row, budget_formats
    )
    
    # 1. Snapshot totals section
    content_row, snapshot_total_row = write_snapshot_section(
        worksheet, content_row, formats, budget_formats
    )
    
    # 2. System thresholds for context
    content_row = write_thresholds_section(
        worksheet, content_row, formats, budget_formats
    )
    
    # 3. Plan delta section (from tbl_plan_journal + tbl_subsystem_outputs)
    content_row, plan_delta_total_row = write_plan_delta_section(
        workbook, worksheet, content_row, formats, budget_formats
    )
    
    # 4. Policy delta section (generated fill rows and other assumptions)
    content_row, policy_delta_total_row = write_policy_delta_section(
        workbook, worksheet, content_row, formats, budget_formats
    )
    
    # 5. Derived totals section (snapshot + plan + policy)
    content_row, derived_total_row = write_derived_section(
        worksheet, content_row, formats, budget_formats,
        snapshot_total_row, plan_delta_total_row, policy_delta_total_row
    )
    
    # 6. Verification section
    content_row = write_verification_section(
        worksheet, content_row, formats, budget_formats,
        snapshot_total_row
    )
    
    # Sheet protection
    worksheet.protect(options={
        "objects": True,
        "scenarios": True,
        "format_cells": False,
        "select_unlocked_cells": True,
        "select_locked_cells": True,
    })
