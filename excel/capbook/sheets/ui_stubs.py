"""
UI sheet stub writers with shared command bar.

Each UI sheet gets:
- The shared command bar (read-only reference to TEAM_COCKPIT)
- Sheet title and purpose description
- Placeholder content indicating future functionality
- Sheet protection (with unlocked input zones as needed)

These stubs establish the workbook structure before full implementation.
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from .command_bar import (
    write_command_bar_readonly,
    get_content_start_row,
)


def _protect_sheet(worksheet: Worksheet) -> None:
    """Apply standard sheet protection."""
    worksheet.protect(options={
        "objects": True,
        "scenarios": True,
        "format_cells": False,
        "select_unlocked_cells": True,
        "select_locked_cells": True,
    })


def write_home_stub(
    worksheet: Worksheet,
    formats: dict[str, Any],
    build_meta: dict[str, Any],
) -> None:
    """
    Write HOME sheet stub.

    HOME is the workbook landing page with:
    - Version/refresh info
    - Data health indicator
    - Navigation links
    
    NOTE: HOME does not have the command bar (it's the landing page).
    """
    worksheet.set_column(0, 0, 25)
    worksheet.set_column(1, 1, 40)

    worksheet.write(0, 0, "NBA Cap Workbook", formats["header"])
    worksheet.write(0, 1, "", formats["header"])

    # Validation status banner
    if build_meta.get("validation_status") == "PASS":
        worksheet.write(2, 0, "Data Status:", formats["alert_ok"])
        worksheet.write(2, 1, "✓ PASS", formats["alert_ok"])
    else:
        worksheet.write(2, 0, "Data Status:", formats["alert_fail"])
        worksheet.write(2, 1, "✗ FAILED - See META sheet", formats["alert_fail"])

    # Build info
    worksheet.write(4, 0, "League:")
    worksheet.write(4, 1, build_meta.get("league_lk", ""))
    worksheet.write(5, 0, "Data contract:")
    worksheet.write(5, 1, build_meta.get("data_contract_version", ""))
    worksheet.write(6, 0, "Base Year:")
    worksheet.write(6, 1, build_meta.get("base_year", ""))
    worksheet.write(7, 0, "As-Of Date:")
    worksheet.write(7, 1, build_meta.get("as_of_date", ""))
    worksheet.write(8, 0, "Refreshed:")
    worksheet.write(8, 1, build_meta.get("refreshed_at", ""))
    worksheet.write(9, 0, "Git SHA:")
    worksheet.write(9, 1, build_meta.get("exporter_git_sha", ""))

    # Navigation section
    worksheet.write(11, 0, "Sheets:", formats["header"])
    worksheet.write(12, 0, "• TEAM_COCKPIT")
    worksheet.write(12, 1, "Primary readouts + alerts")
    worksheet.write(13, 0, "• ROSTER_GRID")
    worksheet.write(13, 1, "Full roster ledger view")
    worksheet.write(14, 0, "• BUDGET_LEDGER")
    worksheet.write(14, 1, "Authoritative totals + deltas")
    worksheet.write(15, 0, "• TRADE_MACHINE")
    worksheet.write(15, 1, "Lane-based trade iteration")
    worksheet.write(16, 0, "• AUDIT_AND_RECONCILE")
    worksheet.write(16, 1, "Reconciliation + drilldowns")
    worksheet.write(17, 0, "• META")
    worksheet.write(17, 1, "Build metadata + validation")
    
    _protect_sheet(worksheet)


def write_team_cockpit_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write TEAM_COCKPIT sheet stub.
    
    NOTE: This stub is superseded by write_team_cockpit_with_command_bar()
    in cockpit.py. Kept for backwards compatibility.
    """
    worksheet.set_column(0, 0, 20)
    worksheet.set_column(1, 1, 15)

    worksheet.write(0, 0, "TEAM COCKPIT", formats["header"])
    worksheet.write(1, 0, "(See cockpit.py for full implementation)")


def write_roster_grid_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write ROSTER_GRID sheet stub with shared command bar.

    ROSTER_GRID shows all rows with explicit counts vs exists truth.
    """
    worksheet.write(0, 0, "ROSTER GRID", formats["header"])
    worksheet.write(1, 0, "Full roster/ledger view with explicit bucket classification")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    content_start = get_content_start_row()

    worksheet.write(content_start, 0, "Columns (planned):")
    worksheet.write(content_start + 1, 0, "• Player/Hold/Dead Money label")
    worksheet.write(content_start + 2, 0, "• Bucket (ROST/FA/TERM/2WAY/GENERATED)")
    worksheet.write(content_start + 3, 0, "• CountsTowardTotal? (Y/N)")
    worksheet.write(content_start + 4, 0, "• CountsTowardRoster? (Y/N)")
    worksheet.write(content_start + 5, 0, "• Contract/option/guarantee badges")
    worksheet.write(content_start + 6, 0, "• Multi-year amounts (cap/tax/apron)")
    
    _protect_sheet(worksheet)


def write_budget_ledger_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write BUDGET_LEDGER sheet stub with shared command bar.

    BUDGET_LEDGER is the single source of truth for totals and deltas.
    """
    worksheet.write(0, 0, "BUDGET LEDGER", formats["header"])
    worksheet.write(1, 0, "Authoritative accounting statement")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    content_start = get_content_start_row()

    worksheet.write(content_start, 0, "Sections (planned):")
    worksheet.write(content_start + 1, 0, "1. Snapshot totals (by bucket)")
    worksheet.write(content_start + 2, 0, "2. Plan deltas (journal actions)")
    worksheet.write(content_start + 3, 0, "3. Policy-generated deltas")
    worksheet.write(content_start + 4, 0, "4. Derived totals = snapshot + deltas")
    
    _protect_sheet(worksheet)


def write_plan_manager_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write PLAN_MANAGER sheet stub with shared command bar.

    PLAN_MANAGER manages scenarios and comparisons.
    """
    worksheet.write(0, 0, "PLAN MANAGER", formats["header"])
    worksheet.write(1, 0, "Manage scenarios and comparisons")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    content_start = get_content_start_row()

    worksheet.write(content_start, 0, "Features (planned):")
    worksheet.write(content_start + 1, 0, "• Plans table (ID, name, notes, created)")
    worksheet.write(content_start + 2, 0, "• Baseline vs Plan selection")
    worksheet.write(content_start + 3, 0, "• Compare selectors (A/B/C/D)")
    
    _protect_sheet(worksheet)


def write_plan_journal_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write PLAN_JOURNAL sheet stub with shared command bar.

    PLAN_JOURNAL is the scenario engine with ordered actions.
    """
    worksheet.write(0, 0, "PLAN JOURNAL", formats["header"])
    worksheet.write(1, 0, "Ordered actions for scenario modeling")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    content_start = get_content_start_row()

    worksheet.write(content_start, 0, "Journal columns (planned):")
    worksheet.write(content_start + 1, 0, "• Step # (order)")
    worksheet.write(content_start + 2, 0, "• Enabled?")
    worksheet.write(content_start + 3, 0, "• Effective date")
    worksheet.write(content_start + 4, 0, "• Action type")
    worksheet.write(content_start + 5, 0, "• Targets (players, picks, exceptions)")
    worksheet.write(content_start + 6, 0, "• Computed deltas by year")
    worksheet.write(content_start + 7, 0, "• Validation status (OK/Warning/Error)")
    
    _protect_sheet(worksheet)


def write_trade_machine_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write TRADE_MACHINE sheet stub with shared command bar.

    TRADE_MACHINE supports lane-based rapid trade iteration.
    """
    worksheet.write(0, 0, "TRADE MACHINE", formats["header"])
    worksheet.write(1, 0, "Lane-based trade iteration and comparison")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    content_start = get_content_start_row()

    worksheet.write(content_start, 0, "Lanes:", formats["header"])
    worksheet.write(content_start, 1, "Lane A")
    worksheet.write(content_start, 2, "Lane B")
    worksheet.write(content_start, 3, "Lane C")
    worksheet.write(content_start, 4, "Lane D")

    worksheet.write(content_start + 2, 0, "Features (planned):")
    worksheet.write(content_start + 3, 0, "• Teams selection")
    worksheet.write(content_start + 4, 0, "• Outgoing/incoming players")
    worksheet.write(content_start + 5, 0, "• Salary matching mode")
    worksheet.write(content_start + 6, 0, "• Legality check")
    worksheet.write(content_start + 7, 0, "• Max incoming calculation")
    worksheet.write(content_start + 8, 0, "• Apron gate flags")
    worksheet.write(content_start + 9, 0, "• Publish to journal")
    
    _protect_sheet(worksheet)


def write_signings_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write SIGNINGS_AND_EXCEPTIONS sheet stub with shared command bar.

    SIGNINGS_AND_EXCEPTIONS handles signings, minimums, exceptions.
    """
    worksheet.write(0, 0, "SIGNINGS & EXCEPTIONS", formats["header"])
    worksheet.write(1, 0, "Signings, minimums, exception usage")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    content_start = get_content_start_row()

    worksheet.write(content_start, 0, "Features (planned):")
    worksheet.write(content_start + 1, 0, "• Player/slot selection")
    worksheet.write(content_start + 2, 0, "• Contract structure")
    worksheet.write(content_start + 3, 0, "• Signing method (cap room/exception/minimum)")
    worksheet.write(content_start + 4, 0, "• Effective date")
    worksheet.write(content_start + 5, 0, "• Per-year deltas output")
    worksheet.write(content_start + 6, 0, "• Exception usage remaining")
    worksheet.write(content_start + 7, 0, "• Hard-cap trigger flags")
    
    _protect_sheet(worksheet)


def write_waive_buyout_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write WAIVE_BUYOUT_STRETCH sheet stub with shared command bar.

    WAIVE_BUYOUT_STRETCH handles dead money modeling.
    """
    worksheet.write(0, 0, "WAIVE / BUYOUT / STRETCH", formats["header"])
    worksheet.write(1, 0, "Guided dead money modeling")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    content_start = get_content_start_row()

    worksheet.write(content_start, 0, "Inputs (planned):")
    worksheet.write(content_start + 1, 0, "• Player selection")
    worksheet.write(content_start + 2, 0, "• Waive date")
    worksheet.write(content_start + 3, 0, "• Give-back amount")
    worksheet.write(content_start + 4, 0, "• Stretch toggle")
    worksheet.write(content_start + 5, 0, "• Set-off assumptions")

    worksheet.write(content_start + 7, 0, "Outputs (planned):")
    worksheet.write(content_start + 8, 0, "• Cap/tax/apron distribution by year")
    worksheet.write(content_start + 9, 0, "• Immediate savings vs future costs")
    
    _protect_sheet(worksheet)


def write_assets_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write ASSETS sheet stub with shared command bar.

    ASSETS shows exception/TPE and draft pick inventory.
    """
    worksheet.write(0, 0, "ASSETS", formats["header"])
    worksheet.write(1, 0, "Exception/TPE and draft pick inventory")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    content_start = get_content_start_row()

    worksheet.write(content_start, 0, "Sections (planned):")
    worksheet.write(content_start + 1, 0, "• Exceptions/TPEs (remaining, expiration, restrictions)")
    worksheet.write(content_start + 2, 0, "• Draft picks (ownership grid, encumbrances)")
    
    _protect_sheet(worksheet)


def write_audit_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write AUDIT_AND_RECONCILE sheet stub with shared command bar.

    AUDIT_AND_RECONCILE prevents "your number is wrong" fights.
    
    NOTE: This stub may be superseded by write_audit_and_reconcile() in audit.py.
    """
    worksheet.write(0, 0, "AUDIT & RECONCILE", formats["header"])
    worksheet.write(1, 0, "Reconciliation and explainability layer")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    content_start = get_content_start_row()

    worksheet.write(content_start, 0, "Sections (planned):")
    worksheet.write(content_start + 1, 0, "• Totals reconciliation (snapshot vs counting rows)")
    worksheet.write(content_start + 2, 0, "• Contributing rows drilldowns")
    worksheet.write(content_start + 3, 0, "• Assumptions applied (fill rows, toggles)")
    worksheet.write(content_start + 4, 0, "• Plan diff (baseline vs plan)")
    worksheet.write(content_start + 5, 0, "• Journal step summary")
    
    _protect_sheet(worksheet)


def write_rules_reference_stub(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write RULES_REFERENCE sheet stub with shared command bar.

    RULES_REFERENCE provides inline memory aids (not a full CBA dump).
    """
    worksheet.set_column(0, 0, 25)
    worksheet.set_column(1, 1, 50)
    
    worksheet.write(0, 0, "RULES REFERENCE", formats["header"])
    worksheet.write(1, 0, "Quick reference for operating rules")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    content_start = get_content_start_row()

    worksheet.write(content_start, 0, "Topics (planned):")
    worksheet.write(content_start + 1, 0, "• Salary matching tiers")
    worksheet.write(content_start + 2, 0, "• Apron gates / hard-cap triggers")
    worksheet.write(content_start + 3, 0, "• Minimum salary scales")
    worksheet.write(content_start + 4, 0, "• Rookie scale")
    worksheet.write(content_start + 5, 0, "• Proration helpers")
    
    _protect_sheet(worksheet)


# =============================================================================
# Mapping of sheet names to their stub writers
# =============================================================================
# 
# All writers have the signature: (workbook, worksheet, formats) -> None
# They include the shared command bar (read-only) and sheet protection.
# TEAM_COCKPIT is handled by cockpit.py's write_team_cockpit_with_command_bar().
#

UI_STUB_WRITERS = {
    "TEAM_COCKPIT": write_team_cockpit_stub,  # Superseded by cockpit.py
    "ROSTER_GRID": write_roster_grid_stub,
    "BUDGET_LEDGER": write_budget_ledger_stub,
    "PLAN_MANAGER": write_plan_manager_stub,
    "PLAN_JOURNAL": write_plan_journal_stub,
    "TRADE_MACHINE": write_trade_machine_stub,
    "SIGNINGS_AND_EXCEPTIONS": write_signings_stub,
    "WAIVE_BUYOUT_STRETCH": write_waive_buyout_stub,
    "ASSETS": write_assets_stub,
    "AUDIT_AND_RECONCILE": write_audit_stub,
    "RULES_REFERENCE": write_rules_reference_stub,
}
