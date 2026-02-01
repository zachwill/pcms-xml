"""
PLAN_MANAGER and PLAN_JOURNAL sheet writers — scenario engine foundation.

This module implements:
1. PLAN_MANAGER — manages scenarios (plans) with an editable table
2. PLAN_JOURNAL — ordered action journal for scenario modeling

Per the blueprint (excel-cap-book-blueprint.md):
- A "scenario" is: Baseline state + Plan journal + Derived state
- Analysts work by transformations, not edits
- Comparison is a first-class workflow (A/B/C/D lanes)

Design notes:
- PLAN_MANAGER provides the list of plans for ActivePlan dropdown validation
- PLAN_JOURNAL holds ordered actions that modify the baseline
- Both tables are INPUT zones (unlocked for editing, yellow background)
- The tables must be actual Excel Tables for formula references

Named table conventions:
- tbl_plan_manager: Plan definitions (user-editable)
- tbl_plan_journal: Ordered actions (user-editable)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import xlsxwriter.utility

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ..xlsx import FMT_MONEY
from .command_bar import (
    write_command_bar_readonly,
    get_content_start_row,
    NAMED_RANGES,
    ROW_ACTIVE_PLAN,
    COL_INPUT_3,
    COCKPIT_SHEET_NAME,
)


# =============================================================================
# Action Type Taxonomy
# =============================================================================

# Per the blueprint (mental-models-and-design-principles.md Section 7.2)
# These are the valid action types for the plan journal.
ACTION_TYPES = [
    "Trade",
    "Sign (Cap Room)",
    "Sign (Exception)",
    "Sign (Minimum)",
    "Waive",
    "Buyout",
    "Stretch",
    "Renounce",
    "Option Exercise",
    "Option Decline",
    "Convert 2-Way",
    "Sign 2-Way",
    "Use TPE",
    "Other",
]


# =============================================================================
# Layout Constants
# =============================================================================

# PLAN_MANAGER layout
PM_COL_PLAN_ID = 0
PM_COL_PLAN_NAME = 1
PM_COL_NOTES = 2
PM_COL_CREATED_AT = 3
PM_COL_IS_ACTIVE = 4  # Helper for filtering

# PLAN_JOURNAL layout
PJ_COL_STEP = 0
PJ_COL_PLAN_ID = 1
PJ_COL_ENABLED = 2
PJ_COL_SALARY_YEAR = 3  # NEW: which salary year the delta applies to
PJ_COL_EFFECTIVE_DATE = 4
PJ_COL_ACTION_TYPE = 5
PJ_COL_TARGET_PLAYER = 6
PJ_COL_TARGET_TEAM = 7
PJ_COL_NOTES = 8
PJ_COL_DELTA_CAP = 9
PJ_COL_DELTA_TAX = 10
PJ_COL_DELTA_APRON = 11
PJ_COL_VALIDATION = 12
PJ_COL_SOURCE = 13


# =============================================================================
# Format Helpers
# =============================================================================

def _create_plan_formats(workbook: Workbook) -> dict[str, Any]:
    """Create formats specific to plan sheets."""
    formats = {}
    
    # Section headers
    formats["section_header"] = workbook.add_format({
        "bold": True,
        "font_size": 11,
        "bg_color": "#1E3A5F",  # Dark blue
        "font_color": "#FFFFFF",
        "bottom": 2,
    })
    
    # Input cell format (editable zone)
    formats["input"] = workbook.add_format({
        "bg_color": "#FFFDE7",  # Light yellow
        "border": 1,
        "border_color": "#FBC02D",  # Amber
        "locked": False,
    })
    
    formats["input_date"] = workbook.add_format({
        "bg_color": "#FFFDE7",
        "border": 1,
        "border_color": "#FBC02D",
        "locked": False,
        "num_format": "yyyy-mm-dd",
    })
    
    formats["input_money"] = workbook.add_format({
        "bg_color": "#FFFDE7",
        "border": 1,
        "border_color": "#FBC02D",
        "locked": False,
        "num_format": FMT_MONEY,
    })
    
    formats["input_center"] = workbook.add_format({
        "bg_color": "#FFFDE7",
        "border": 1,
        "border_color": "#FBC02D",
        "locked": False,
        "align": "center",
    })
    
    # Table headers
    formats["table_header"] = workbook.add_format({
        "bold": True,
        "bg_color": "#E5E7EB",  # gray-200
        "border": 1,
    })
    
    # Labels
    formats["label"] = workbook.add_format({
        "font_size": 10,
    })
    
    # Notes
    formats["note"] = workbook.add_format({
        "font_size": 9,
        "font_color": "#6B7280",
        "italic": True,
    })
    
    # Validation indicators
    formats["valid_ok"] = workbook.add_format({
        "font_color": "#059669",  # green-600
        "align": "center",
    })
    formats["valid_warn"] = workbook.add_format({
        "bg_color": "#FEF3C7",  # amber-100
        "font_color": "#92400E",  # amber-800
        "align": "center",
    })
    formats["valid_error"] = workbook.add_format({
        "bg_color": "#FEE2E2",  # red-100
        "font_color": "#991B1B",  # red-800
        "align": "center",
    })
    
    return formats


# =============================================================================
# PLAN_MANAGER Sheet Writer
# =============================================================================

def write_plan_manager(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write PLAN_MANAGER sheet with plan definitions table.
    
    The plan manager provides:
    - A table of plan definitions (ID, name, notes, created_at)
    - The "Baseline" plan is pre-populated and always first
    - Users can add new plans by extending the table
    - The plan names feed the ActivePlan dropdown on TEAM_COCKPIT
    
    Args:
        workbook: The XlsxWriter Workbook
        worksheet: The PLAN_MANAGER worksheet
        formats: Standard format dict from create_standard_formats
    """
    plan_formats = _create_plan_formats(workbook)
    
    # Sheet title
    worksheet.write(0, 0, "PLAN MANAGER", formats["header"])
    worksheet.write(1, 0, "Manage scenarios — plans feed ActivePlan dropdown on TEAM_COCKPIT")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    # Column widths
    worksheet.set_column(PM_COL_PLAN_ID, PM_COL_PLAN_ID, 10)
    worksheet.set_column(PM_COL_PLAN_NAME, PM_COL_PLAN_NAME, 20)
    worksheet.set_column(PM_COL_NOTES, PM_COL_NOTES, 40)
    worksheet.set_column(PM_COL_CREATED_AT, PM_COL_CREATED_AT, 20)
    worksheet.set_column(PM_COL_IS_ACTIVE, PM_COL_IS_ACTIVE, 12)
    
    content_row = get_content_start_row()
    
    # Section header
    worksheet.merge_range(
        content_row, PM_COL_PLAN_ID,
        content_row, PM_COL_IS_ACTIVE,
        "PLAN DEFINITIONS (tbl_plan_manager)",
        plan_formats["section_header"],
    )
    content_row += 1
    
    # Instructions
    worksheet.write(
        content_row, PM_COL_PLAN_ID,
        "Add rows to create new plans. Plan names appear in ActivePlan dropdown.",
        plan_formats["note"],
    )
    content_row += 2
    
    # Pre-populate with Baseline plan
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    
    # Define table columns
    columns = ["plan_id", "plan_name", "notes", "created_at", "is_active"]
    
    # Initial data: Baseline plan + 4 empty slots for user plans
    initial_data = [
        {
            "plan_id": 1,
            "plan_name": "Baseline",
            "notes": "Original snapshot — no modifications",
            "created_at": now_str,
            "is_active": "Yes",
        },
        # Empty slots for user to add plans
        {"plan_id": 2, "plan_name": "", "notes": "", "created_at": "", "is_active": ""},
        {"plan_id": 3, "plan_name": "", "notes": "", "created_at": "", "is_active": ""},
        {"plan_id": 4, "plan_name": "", "notes": "", "created_at": "", "is_active": ""},
        {"plan_id": 5, "plan_name": "", "notes": "", "created_at": "", "is_active": ""},
    ]
    
    # Write the table
    table_start_row = content_row
    table_end_row = table_start_row + len(initial_data)
    table_end_col = len(columns) - 1
    
    # Build data matrix
    data_matrix = []
    for row_dict in initial_data:
        data_matrix.append([row_dict.get(col, "") for col in columns])
    
    # Column definitions with unlocked formats for editing on protected sheet
    # All columns in tbl_plan_manager are user-editable inputs
    column_defs = [
        {"header": "plan_id", "format": formats["input_int"]},
        {"header": "plan_name", "format": formats["input"]},
        {"header": "notes", "format": formats["input"]},
        {"header": "created_at", "format": formats["input"]},
        {"header": "is_active", "format": formats["input"]},
    ]
    
    worksheet.add_table(
        table_start_row,
        PM_COL_PLAN_ID,
        table_end_row,
        table_end_col,
        {
            "name": "tbl_plan_manager",
            "columns": column_defs,
            "data": data_matrix,
            "style": "Table Style Light 9",  # Yellow-ish to indicate input
        },
    )
    
    # Data validation for is_active column
    worksheet.data_validation(
        table_start_row + 1,  # First data row
        PM_COL_IS_ACTIVE,
        table_end_row,
        PM_COL_IS_ACTIVE,
        {
            "validate": "list",
            "source": ["Yes", "No", ""],
            "input_title": "Plan Active?",
            "input_message": "Is this plan active for selection?",
        },
    )
    
    content_row = table_end_row + 3
    
    # Editable zone note
    worksheet.write(
        content_row, PM_COL_PLAN_ID,
        "📝 EDITABLE ZONE: The table above (yellow cells) is unlocked for editing. "
        "Formulas and sheet structure are protected.",
        plan_formats["note"],
    )
    content_row += 2
    
    # Usage notes
    worksheet.write(content_row, PM_COL_PLAN_ID, "Usage Notes:", formats["header"])
    content_row += 1
    
    notes = [
        "• 'Baseline' is the default plan showing unmodified snapshot data",
        "• Add a plan_name to create a new scenario",
        "• Set is_active='Yes' for plans to appear in ActivePlan dropdown",
        "• Plan actions are recorded in PLAN_JOURNAL tab",
        "• Compare plans using ComparePlanA/B/C/D dropdowns on TEAM_COCKPIT",
    ]
    for note in notes:
        worksheet.write(content_row, PM_COL_PLAN_ID, note, plan_formats["note"])
        content_row += 1
    
    # Sheet protection (allows editing table cells)
    worksheet.protect(options={
        "objects": True,
        "scenarios": True,
        "format_cells": False,
        "select_unlocked_cells": True,
        "select_locked_cells": True,
    })


# =============================================================================
# PLAN_JOURNAL Sheet Writer
# =============================================================================

def write_plan_journal(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write PLAN_JOURNAL sheet with ordered action journal.
    
    The plan journal provides:
    - An input table for recording scenario actions
    - Action Type validation from the taxonomy
    - Delta columns for cap/tax/apron effects
    - Validation status column
    - Source column (e.g., "Generated by Trade Lane A")
    
    Per the blueprint:
    - Journal table columns: Step#, Enabled?, EffectiveDate, ActionType,
      Targets, Parameters, ComputedDeltas, RosterAdds/Drops, ValidationStatus, Source
    
    Args:
        workbook: The XlsxWriter Workbook
        worksheet: The PLAN_JOURNAL worksheet
        formats: Standard format dict from create_standard_formats
    """
    plan_formats = _create_plan_formats(workbook)
    
    # Sheet title
    worksheet.write(0, 0, "PLAN JOURNAL", formats["header"])
    worksheet.write(1, 0, "Ordered scenario actions — each row is a step in the plan")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    # Column widths
    worksheet.set_column(PJ_COL_STEP, PJ_COL_STEP, 6)
    worksheet.set_column(PJ_COL_PLAN_ID, PJ_COL_PLAN_ID, 8)
    worksheet.set_column(PJ_COL_ENABLED, PJ_COL_ENABLED, 9)
    worksheet.set_column(PJ_COL_SALARY_YEAR, PJ_COL_SALARY_YEAR, 11)
    worksheet.set_column(PJ_COL_EFFECTIVE_DATE, PJ_COL_EFFECTIVE_DATE, 14)
    worksheet.set_column(PJ_COL_ACTION_TYPE, PJ_COL_ACTION_TYPE, 16)
    worksheet.set_column(PJ_COL_TARGET_PLAYER, PJ_COL_TARGET_PLAYER, 20)
    worksheet.set_column(PJ_COL_TARGET_TEAM, PJ_COL_TARGET_TEAM, 10)
    worksheet.set_column(PJ_COL_NOTES, PJ_COL_NOTES, 25)
    worksheet.set_column(PJ_COL_DELTA_CAP, PJ_COL_DELTA_CAP, 12)
    worksheet.set_column(PJ_COL_DELTA_TAX, PJ_COL_DELTA_TAX, 12)
    worksheet.set_column(PJ_COL_DELTA_APRON, PJ_COL_DELTA_APRON, 12)
    worksheet.set_column(PJ_COL_VALIDATION, PJ_COL_VALIDATION, 12)
    worksheet.set_column(PJ_COL_SOURCE, PJ_COL_SOURCE, 20)
    
    content_row = get_content_start_row()
    
    # Section header
    worksheet.merge_range(
        content_row, PJ_COL_STEP,
        content_row, PJ_COL_SOURCE,
        "PLAN JOURNAL (tbl_plan_journal) — Record scenario actions",
        plan_formats["section_header"],
    )
    content_row += 1
    
    # Instructions
    worksheet.write(
        content_row, PJ_COL_STEP,
        "Enter actions in order. Each action has a salary_year (defaults to SelectedYear). "
        "Delta columns show cap/tax/apron effect (positive = cost increase, negative = savings).",
        plan_formats["note"],
    )
    content_row += 2
    
    # Define table columns (now includes salary_year)
    columns = [
        "step",
        "plan_id",
        "enabled",
        "salary_year",  # NEW: which year the delta applies to
        "effective_date",
        "action_type",
        "target_player",
        "target_team",
        "notes",
        "delta_cap",
        "delta_tax",
        "delta_apron",
        "validation",
        "source",
    ]
    
    # Initial empty rows for user input
    # salary_year defaults to "" which means the BUDGET_LEDGER formulas will filter by SelectedYear
    # Users can override to apply deltas to different years (e.g., multi-year contracts)
    num_empty_rows = 20
    initial_data = []
    for i in range(num_empty_rows):
        initial_data.append({
            "step": i + 1,
            "plan_id": "",
            "enabled": "",
            "salary_year": "",  # Blank defaults to SelectedYear in formulas
            "effective_date": "",
            "action_type": "",
            "target_player": "",
            "target_team": "",
            "notes": "",
            "delta_cap": 0,
            "delta_tax": 0,
            "delta_apron": 0,
            "validation": "",
            "source": "",
        })
    
    # Write the table
    table_start_row = content_row
    table_end_row = table_start_row + len(initial_data)
    table_end_col = len(columns) - 1
    
    # Build data matrix
    data_matrix = []
    for row_dict in initial_data:
        data_matrix.append([row_dict.get(col, "") for col in columns])
    
    # Column definitions with unlocked formats for editing on protected sheet
    # Most columns are user-editable; delta and validation may be formula-driven in future
    column_defs = [
        {"header": "step", "format": formats["input_int"]},
        {"header": "plan_id", "format": formats["input_int"]},
        {"header": "enabled", "format": formats["input"]},
        {"header": "salary_year", "format": formats["input_int"]},  # NEW: year context
        {"header": "effective_date", "format": formats["input_date"]},
        {"header": "action_type", "format": formats["input"]},
        {"header": "target_player", "format": formats["input"]},
        {"header": "target_team", "format": formats["input"]},
        {"header": "notes", "format": formats["input"]},
        {"header": "delta_cap", "format": formats["input_money"]},
        {"header": "delta_tax", "format": formats["input_money"]},
        {"header": "delta_apron", "format": formats["input_money"]},
        {"header": "validation", "format": formats["input"]},
        {"header": "source", "format": formats["input"]},
    ]
    
    worksheet.add_table(
        table_start_row,
        PJ_COL_STEP,
        table_end_row,
        table_end_col,
        {
            "name": "tbl_plan_journal",
            "columns": column_defs,
            "data": data_matrix,
            "style": "Table Style Light 9",  # Yellow-ish to indicate input
        },
    )
    
    # Data validation: enabled column
    worksheet.data_validation(
        table_start_row + 1,
        PJ_COL_ENABLED,
        table_end_row,
        PJ_COL_ENABLED,
        {
            "validate": "list",
            "source": ["Yes", "No", ""],
            "input_title": "Enabled?",
            "input_message": "Is this action enabled?",
        },
    )
    
    # Data validation: salary_year column
    # Allow blank (defaults to SelectedYear) or valid years (base_year through base_year+5)
    # Since we don't know base_year at generation time, use a reasonable range
    worksheet.data_validation(
        table_start_row + 1,
        PJ_COL_SALARY_YEAR,
        table_end_row,
        PJ_COL_SALARY_YEAR,
        {
            "validate": "integer",
            "criteria": "between",
            "minimum": 2024,
            "maximum": 2035,
            "ignore_blank": True,
            "input_title": "Salary Year",
            "input_message": "Which year does this delta apply to? Leave blank for SelectedYear.",
        },
    )
    
    # Data validation: action_type column (from taxonomy)
    worksheet.data_validation(
        table_start_row + 1,
        PJ_COL_ACTION_TYPE,
        table_end_row,
        PJ_COL_ACTION_TYPE,
        {
            "validate": "list",
            "source": ACTION_TYPES,
            "input_title": "Action Type",
            "input_message": "Select the type of action",
            "error_title": "Invalid Action",
            "error_message": "Please select a valid action type from the list",
        },
    )
    
    # Data validation: validation status
    worksheet.data_validation(
        table_start_row + 1,
        PJ_COL_VALIDATION,
        table_end_row,
        PJ_COL_VALIDATION,
        {
            "validate": "list",
            "source": ["OK", "Warning", "Error", ""],
            "input_title": "Validation Status",
            "input_message": "Status of this action",
        },
    )
    
    # Conditional formatting for validation column
    worksheet.conditional_format(
        table_start_row + 1,
        PJ_COL_VALIDATION,
        table_end_row,
        PJ_COL_VALIDATION,
        {
            "type": "text",
            "criteria": "containing",
            "value": "OK",
            "format": plan_formats["valid_ok"],
        },
    )
    worksheet.conditional_format(
        table_start_row + 1,
        PJ_COL_VALIDATION,
        table_end_row,
        PJ_COL_VALIDATION,
        {
            "type": "text",
            "criteria": "containing",
            "value": "Warning",
            "format": plan_formats["valid_warn"],
        },
    )
    worksheet.conditional_format(
        table_start_row + 1,
        PJ_COL_VALIDATION,
        table_end_row,
        PJ_COL_VALIDATION,
        {
            "type": "text",
            "criteria": "containing",
            "value": "Error",
            "format": plan_formats["valid_error"],
        },
    )
    
    content_row = table_end_row + 3
    
    # Editable zone note
    worksheet.write(
        content_row, PJ_COL_STEP,
        "📝 EDITABLE ZONE: The table above (yellow cells) is unlocked for editing. "
        "Formulas and sheet structure are protected.",
        plan_formats["note"],
    )
    content_row += 2
    
    # Action type reference
    worksheet.write(content_row, PJ_COL_STEP, "Action Types (Reference):", formats["header"])
    content_row += 1
    
    for action_type in ACTION_TYPES:
        worksheet.write(content_row, PJ_COL_STEP, f"  • {action_type}", plan_formats["note"])
        content_row += 1
    
    content_row += 1
    
    # Usage notes
    worksheet.write(content_row, PJ_COL_STEP, "Usage Notes:", formats["header"])
    content_row += 1
    
    notes = [
        "• Each row is one action in the plan",
        "• Use plan_id to associate actions with plans from PLAN_MANAGER",
        "• Set enabled='Yes' to include action in plan calculations",
        "• salary_year: which year this delta applies to (leave blank for SelectedYear)",
        "• Delta columns: + = cost increase, - = savings",
        "• BUDGET_LEDGER aggregates deltas filtered by ActivePlan AND SelectedYear",
        "• Subsystem sheets (TRADE_MACHINE, etc.) will 'publish' rows here",
    ]
    for note in notes:
        worksheet.write(content_row, PJ_COL_STEP, note, plan_formats["note"])
        content_row += 1
    
    # Sheet protection (allows editing table cells)
    worksheet.protect(options={
        "objects": True,
        "scenarios": True,
        "format_cells": False,
        "select_unlocked_cells": True,
        "select_locked_cells": True,
    })


# =============================================================================
# Helper: Get Plan Names for Dropdown Validation
# =============================================================================

def get_plan_names_formula() -> str:
    """
    Return an Excel formula that extracts non-blank plan names from tbl_plan_manager.
    
    This can be used for data validation source on the ActivePlan dropdown.
    
    Note: Excel data validation with dynamic formulas is complex.
    For now, we use the simpler approach of referencing the plan_name column directly.
    """
    # Simple approach: reference the entire plan_name column
    # Users will see blank entries but can only select non-blank ones
    return "tbl_plan_manager[plan_name]"


def get_plan_manager_table_ref() -> str:
    """Return the table reference for PLAN_MANAGER plan names."""
    return "tbl_plan_manager[plan_name]"
