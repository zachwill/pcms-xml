"""
RULES_REFERENCE sheet writer.

Per the blueprint (excel-cap-book-blueprint.md), this is:
"Not a CBA dump — only rules that analysts need while operating."

Topics included:
- Tax rates table (from DATA_tax_rates)
- Minimum salary scales (from DATA_minimum_scale)
- Rookie scale (from DATA_rookie_scale)
- Salary matching tiers (static)
- Apron gates / hard-cap triggers (static notes)

Design notes:
- Uses XLOOKUP (Excel 365/2021+) filtered by SelectedYear where appropriate
- XLOOKUP with compound key concatenation for multi-key lookups
- Returns "" if not found (clean blanks without IFERROR wrapping)
- Read-only reference sheet (no input zones)
- Each section is labeled with a header for easy navigation
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from .command_bar import (
    write_command_bar_readonly,
    get_content_start_row,
)


# =============================================================================
# Layout Constants
# =============================================================================

COL_A = 0
COL_B = 1
COL_C = 2
COL_D = 3
COL_E = 4
COL_F = 5
COL_G = 6
COL_H = 7
COL_I = 8
COL_J = 9

# Wider columns for readability
COLUMN_WIDTHS = {
    COL_A: 28,
    COL_B: 14,
    COL_C: 14,
    COL_D: 14,
    COL_E: 14,
    COL_F: 14,
    COL_G: 14,
    COL_H: 14,
    COL_I: 14,
    COL_J: 14,
}

# Money format
FMT_MONEY = "$#,##0"


# =============================================================================
# Static Rule Tables
# =============================================================================

# Salary matching tiers (CBA rules for trade legality)
# These are static rules that rarely change.
SALARY_MATCHING_TIERS = [
    {
        "scenario": "Under the cap (cap room)",
        "rule": "Outgoing ≤ Cap room available",
        "notes": "No matching required when using cap room",
    },
    {
        "scenario": "Over cap, under first apron",
        "rule": "$7.5M + 175% of outgoing",
        "notes": "Standard matching formula",
    },
    {
        "scenario": "At or above first apron",
        "rule": "$7.5M + 100% of outgoing",
        "notes": "Tighter matching at apron level",
    },
    {
        "scenario": "Simultaneous trade",
        "rule": "Sum all outgoing vs sum all incoming",
        "notes": "Aggregate matching for multi-player deals",
    },
]

# Apron gates / hard-cap triggers
APRON_GATES = [
    {
        "trigger": "Sign-and-trade acquisition",
        "effect": "Hard cap at first apron for remainder of season",
        "notes": "Cannot exceed apron via any subsequent move",
    },
    {
        "trigger": "Use non-taxpayer MLE ($12.4M in 2024-25)",
        "effect": "Hard cap at first apron for remainder of season",
        "notes": "Taxpayer MLE ($5.2M) does not trigger hard cap",
    },
    {
        "trigger": "Aggregate player",
        "effect": "Hard cap at first apron for remainder of season",
        "notes": "Combining players to match salary",
    },
    {
        "trigger": "Use BAE ($4.7M in 2024-25)",
        "effect": "Hard cap at first apron for remainder of season",
        "notes": "Bi-annual exception usage",
    },
    {
        "trigger": "Exceed second apron",
        "effect": "Significant roster-building restrictions",
        "notes": "No sign-and-trade, TPE capped, etc.",
    },
]

# Proration notes (static reference)
PRORATION_NOTES = [
    {
        "topic": "Salary proration",
        "formula": "(Days remaining / Days in season) × Full salary",
        "example": "Mid-season signing: 100 days left in 175-day season → 57.1% of full salary",
    },
    {
        "topic": "10-day contracts",
        "formula": "10 / Days in season × Minimum salary",
        "example": "~5.7% of minimum salary per 10-day",
    },
    {
        "topic": "Rest-of-season contracts",
        "formula": "Days remaining / Days in season × Minimum salary",
        "example": "Signed Feb 1 with 100 days left → prorated minimum",
    },
    {
        "topic": "Trade deadline timing",
        "formula": "N/A",
        "example": "Typically ~60% through season; acquisitions get prorated salary",
    },
]


# =============================================================================
# Format Helpers
# =============================================================================


def _create_rules_formats(workbook: Workbook) -> dict[str, Any]:
    """Create formats specific to the rules reference sheet."""
    formats = {}

    # Section headers (dark blue)
    formats["section_header"] = workbook.add_format({
        "bold": True,
        "font_size": 12,
        "bg_color": "#1E3A5F",  # Dark blue
        "font_color": "#FFFFFF",
        "bottom": 2,
    })

    # Column headers (gray)
    formats["col_header"] = workbook.add_format({
        "bold": True,
        "font_size": 10,
        "bg_color": "#E5E7EB",  # gray-200
        "align": "center",
        "bottom": 1,
        "text_wrap": True,
    })

    # Data cells
    formats["data"] = workbook.add_format({"font_size": 10, "text_wrap": True})
    formats["data_center"] = workbook.add_format({
        "font_size": 10,
        "align": "center",
    })
    formats["data_bold"] = workbook.add_format({
        "font_size": 10,
        "bold": True,
    })

    # Money format
    formats["money"] = workbook.add_format({"num_format": FMT_MONEY})
    formats["money_header"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "bold": True,
        "font_size": 10,
        "bg_color": "#E5E7EB",
        "align": "center",
    })

    # Notes (italic, gray)
    formats["note"] = workbook.add_format({
        "font_size": 9,
        "font_color": "#6B7280",
        "italic": True,
        "text_wrap": True,
    })

    # Year selector reference
    formats["year_ref"] = workbook.add_format({
        "bold": True,
        "font_color": "#1E40AF",  # blue-800
    })

    # Table rows - alternating
    formats["row_even"] = workbook.add_format({
        "font_size": 10,
        "bg_color": "#F9FAFB",  # gray-50
    })
    formats["row_odd"] = workbook.add_format({
        "font_size": 10,
    })

    return formats


def _protect_sheet(worksheet: Worksheet) -> None:
    """Apply standard sheet protection."""
    worksheet.protect(options={
        "objects": True,
        "scenarios": True,
        "format_cells": False,
        "select_unlocked_cells": True,
        "select_locked_cells": True,
    })


# =============================================================================
# Section Writers
# =============================================================================


def _write_tax_rates_section(
    worksheet: Worksheet,
    formats: dict[str, Any],
    start_row: int,
) -> int:
    """
    Write tax rates reference table.
    
    Uses XLOOKUP formulas (Excel 365/2021+) to show tax brackets for SelectedYear.
    
    Returns the next available row.
    """
    row = start_row

    # Section header
    worksheet.merge_range(row, COL_A, row, COL_G, "Luxury Tax Rates", formats["section_header"])
    row += 1

    # Note about year filtering
    worksheet.write(row, COL_A, "Showing rates for year:", formats["data_bold"])
    worksheet.write_formula(row, COL_B, "=SelectedYear", formats["year_ref"])
    row += 1

    # Column headers
    tax_headers = [
        ("Bracket", COL_A),
        ("Lower Limit", COL_B),
        ("Upper Limit", COL_C),
        ("Non-Repeater Rate", COL_D),
        ("Repeater Rate", COL_E),
        ("Base Charge (Non-Rep)", COL_F),
        ("Base Charge (Rep)", COL_G),
    ]
    for header, col in tax_headers:
        worksheet.write(row, col, header, formats["col_header"])
    row += 1

    # Use XLOOKUP to get tax rates for the selected year + bracket
    # The table is tbl_tax_rates with columns:
    # league_lk, salary_year, bracket_number, lower_limit, upper_limit,
    # tax_rate_non_repeater, tax_rate_repeater, base_charge_non_repeater, base_charge_repeater
    
    # We use XLOOKUP with compound key (salary_year & bracket_number)
    # XLOOKUP returns "" if not found (cleaner than IFERROR wrapping)
    for i in range(1, 11):
        bracket_row = row
        
        # Bracket number (static)
        worksheet.write(bracket_row, COL_A, i, formats["data_center"])
        
        # Lower limit - XLOOKUP with compound key
        worksheet.write_formula(
            bracket_row, COL_B,
            f'=XLOOKUP(SelectedYear&{i},tbl_tax_rates[salary_year]&tbl_tax_rates[bracket_number],tbl_tax_rates[lower_limit],"")',
            formats["money"],
        )
        
        # Upper limit
        worksheet.write_formula(
            bracket_row, COL_C,
            f'=XLOOKUP(SelectedYear&{i},tbl_tax_rates[salary_year]&tbl_tax_rates[bracket_number],tbl_tax_rates[upper_limit],"")',
            formats["money"],
        )
        
        # Non-repeater rate
        worksheet.write_formula(
            bracket_row, COL_D,
            f'=XLOOKUP(SelectedYear&{i},tbl_tax_rates[salary_year]&tbl_tax_rates[bracket_number],tbl_tax_rates[tax_rate_non_repeater],"")',
            formats["data_center"],
        )
        
        # Repeater rate
        worksheet.write_formula(
            bracket_row, COL_E,
            f'=XLOOKUP(SelectedYear&{i},tbl_tax_rates[salary_year]&tbl_tax_rates[bracket_number],tbl_tax_rates[tax_rate_repeater],"")',
            formats["data_center"],
        )
        
        # Base charge non-repeater
        worksheet.write_formula(
            bracket_row, COL_F,
            f'=XLOOKUP(SelectedYear&{i},tbl_tax_rates[salary_year]&tbl_tax_rates[bracket_number],tbl_tax_rates[base_charge_non_repeater],"")',
            formats["money"],
        )
        
        # Base charge repeater
        worksheet.write_formula(
            bracket_row, COL_G,
            f'=XLOOKUP(SelectedYear&{i},tbl_tax_rates[salary_year]&tbl_tax_rates[bracket_number],tbl_tax_rates[base_charge_repeater],"")',
            formats["money"],
        )
        
        row += 1

    # Note about repeater status
    row += 1
    worksheet.write(
        row, COL_A,
        "Note: Repeater = taxpayer in 4 of last 5 seasons (including current).",
        formats["note"],
    )
    row += 2

    return row


def _write_minimum_scale_section(
    worksheet: Worksheet,
    formats: dict[str, Any],
    start_row: int,
) -> int:
    """
    Write minimum salary scale table.
    
    Uses XLOOKUP (Excel 365/2021+) to show minimum salary by years of service for SelectedYear.
    
    Returns the next available row.
    """
    row = start_row

    # Section header
    worksheet.merge_range(row, COL_A, row, COL_C, "Minimum Salary Scale", formats["section_header"])
    row += 1

    # Note about year filtering
    worksheet.write(row, COL_A, "Showing minimums for year:", formats["data_bold"])
    worksheet.write_formula(row, COL_B, "=SelectedYear", formats["year_ref"])
    row += 1

    # Column headers
    worksheet.write(row, COL_A, "Years of Service", formats["col_header"])
    worksheet.write(row, COL_B, "Minimum Salary", formats["col_header"])
    worksheet.write(row, COL_C, "Notes", formats["col_header"])
    row += 1

    # Show minimums for YOS 0-10+
    yos_notes = {
        0: "Rookie (undrafted)",
        1: "1 year experience",
        2: "2 years experience",
        3: "3 years experience",
        4: "4-5 years (starts here)",
        5: "",
        6: "6-7 years",
        7: "",
        8: "8-9 years",
        9: "",
        10: "10+ years (veteran max minimum)",
    }

    for yos in range(11):
        worksheet.write(row, COL_A, yos, formats["data_center"])
        
        # Minimum salary - XLOOKUP with compound key (salary_year & years_of_service)
        worksheet.write_formula(
            row, COL_B,
            f'=XLOOKUP(SelectedYear&{yos},tbl_minimum_scale[salary_year]&tbl_minimum_scale[years_of_service],tbl_minimum_scale[minimum_salary_amount],"")',
            formats["money"],
        )
        
        worksheet.write(row, COL_C, yos_notes.get(yos, ""), formats["note"])
        row += 1

    row += 1
    worksheet.write(
        row, COL_A,
        "Note: Veteran minimum contracts only count against the cap at 2-year minimum rate.",
        formats["note"],
    )
    row += 2

    return row


def _write_rookie_scale_section(
    worksheet: Worksheet,
    formats: dict[str, Any],
    start_row: int,
) -> int:
    """
    Write rookie scale table.
    
    Uses XLOOKUP (Excel 365/2021+) to show rookie scale amounts by pick number for SelectedYear.
    
    Returns the next available row.
    """
    row = start_row

    # Section header (spans more columns for 4 contract years)
    worksheet.merge_range(row, COL_A, row, COL_F, "Rookie Scale (First Round)", formats["section_header"])
    row += 1

    # Note about year filtering
    worksheet.write(row, COL_A, "Draft class year:", formats["data_bold"])
    worksheet.write_formula(row, COL_B, "=SelectedYear", formats["year_ref"])
    row += 1

    # Column headers
    rookie_headers = [
        ("Pick #", COL_A),
        ("Year 1", COL_B),
        ("Year 2", COL_C),
        ("Year 3 (TO)", COL_D),
        ("Year 4 (TO)", COL_E),
        ("Notes", COL_F),
    ]
    for header, col in rookie_headers:
        worksheet.write(row, col, header, formats["col_header"])
    row += 1

    # Show picks 1-30 (first round)
    # Use XLOOKUP with compound key (salary_year & pick_number)
    for pick in range(1, 31):
        worksheet.write(row, COL_A, pick, formats["data_center"])
        
        # Year 1 salary
        worksheet.write_formula(
            row, COL_B,
            f'=XLOOKUP(SelectedYear&{pick},tbl_rookie_scale[salary_year]&tbl_rookie_scale[pick_number],tbl_rookie_scale[salary_year_1],"")',
            formats["money"],
        )
        
        # Year 2 salary
        worksheet.write_formula(
            row, COL_C,
            f'=XLOOKUP(SelectedYear&{pick},tbl_rookie_scale[salary_year]&tbl_rookie_scale[pick_number],tbl_rookie_scale[salary_year_2],"")',
            formats["money"],
        )
        
        # Year 3 (team option)
        worksheet.write_formula(
            row, COL_D,
            f'=XLOOKUP(SelectedYear&{pick},tbl_rookie_scale[salary_year]&tbl_rookie_scale[pick_number],tbl_rookie_scale[salary_year_3],"")',
            formats["money"],
        )
        
        # Year 4 (team option)
        worksheet.write_formula(
            row, COL_E,
            f'=XLOOKUP(SelectedYear&{pick},tbl_rookie_scale[salary_year]&tbl_rookie_scale[pick_number],tbl_rookie_scale[salary_year_4],"")',
            formats["money"],
        )
        
        # Notes for notable picks
        note = ""
        if pick == 1:
            note = "#1 overall"
        elif pick == 14:
            note = "Lottery cutoff"
        elif pick == 30:
            note = "Last first-round pick"
        worksheet.write(row, COL_F, note, formats["note"])
        
        row += 1

    row += 1
    worksheet.write(
        row, COL_A,
        "Note: Years 3-4 are team options. Scale shows 100% amounts; teams typically sign at 120% of scale.",
        formats["note"],
    )
    row += 2

    return row


def _write_salary_matching_section(
    worksheet: Worksheet,
    formats: dict[str, Any],
    start_row: int,
) -> int:
    """
    Write salary matching tiers table (static rules).
    
    Returns the next available row.
    """
    row = start_row

    # Section header
    worksheet.merge_range(row, COL_A, row, COL_C, "Trade Salary Matching Rules", formats["section_header"])
    row += 1

    # Column headers
    worksheet.write(row, COL_A, "Scenario", formats["col_header"])
    worksheet.write(row, COL_B, "Matching Rule", formats["col_header"])
    worksheet.write(row, COL_C, "Notes", formats["col_header"])
    row += 1

    # Write static data
    for i, tier in enumerate(SALARY_MATCHING_TIERS):
        fmt = formats["row_even"] if i % 2 == 0 else formats["row_odd"]
        worksheet.write(row, COL_A, tier["scenario"], fmt)
        worksheet.write(row, COL_B, tier["rule"], fmt)
        worksheet.write(row, COL_C, tier["notes"], formats["note"])
        row += 1

    row += 1
    worksheet.write(
        row, COL_A,
        "Note: Matching is based on outgoing salary; $7.5M base is a fixed CBA parameter.",
        formats["note"],
    )
    row += 2

    return row


def _write_apron_gates_section(
    worksheet: Worksheet,
    formats: dict[str, Any],
    start_row: int,
) -> int:
    """
    Write apron gates / hard-cap triggers table (static rules).
    
    Returns the next available row.
    """
    row = start_row

    # Section header
    worksheet.merge_range(row, COL_A, row, COL_C, "Apron Gates & Hard-Cap Triggers", formats["section_header"])
    row += 1

    # Column headers
    worksheet.write(row, COL_A, "Trigger Action", formats["col_header"])
    worksheet.write(row, COL_B, "Effect", formats["col_header"])
    worksheet.write(row, COL_C, "Notes", formats["col_header"])
    row += 1

    # Write static data
    for i, gate in enumerate(APRON_GATES):
        fmt = formats["row_even"] if i % 2 == 0 else formats["row_odd"]
        worksheet.write(row, COL_A, gate["trigger"], fmt)
        worksheet.write(row, COL_B, gate["effect"], fmt)
        worksheet.write(row, COL_C, gate["notes"], formats["note"])
        row += 1

    row += 1
    worksheet.write(
        row, COL_A,
        "Note: Hard cap is strictly enforced — cannot exceed even temporarily.",
        formats["note"],
    )
    row += 2

    return row


def _write_proration_section(
    worksheet: Worksheet,
    formats: dict[str, Any],
    start_row: int,
) -> int:
    """
    Write proration helpers table (static reference).
    
    Returns the next available row.
    """
    row = start_row

    # Section header
    worksheet.merge_range(row, COL_A, row, COL_C, "Proration Reference", formats["section_header"])
    row += 1

    # Column headers
    worksheet.write(row, COL_A, "Topic", formats["col_header"])
    worksheet.write(row, COL_B, "Formula", formats["col_header"])
    worksheet.write(row, COL_C, "Example", formats["col_header"])
    row += 1

    # Write static data
    for i, item in enumerate(PRORATION_NOTES):
        fmt = formats["row_even"] if i % 2 == 0 else formats["row_odd"]
        worksheet.write(row, COL_A, item["topic"], fmt)
        worksheet.write(row, COL_B, item["formula"], fmt)
        worksheet.write(row, COL_C, item["example"], formats["note"])
        row += 1

    row += 1
    worksheet.write(
        row, COL_A,
        "Note: Season length is typically 177 days (regular season). Check DATA_system_values for exact days_in_season.",
        formats["note"],
    )
    row += 2

    return row


# =============================================================================
# Main Sheet Writer
# =============================================================================


def write_rules_reference(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write the RULES_REFERENCE sheet.
    
    This sheet provides quick reference tables for:
    - Tax rates (filtered by SelectedYear)
    - Minimum salary scale (filtered by SelectedYear)
    - Rookie scale (filtered by SelectedYear)
    - Salary matching tiers (static)
    - Apron gates / hard-cap triggers (static)
    - Proration helpers (static)
    
    Args:
        workbook: The XlsxWriter workbook
        worksheet: The worksheet to write to
        formats: Standard format dict from create_standard_formats()
    """
    # Create sheet-specific formats
    rf = _create_rules_formats(workbook)

    # Set column widths
    for col, width in COLUMN_WIDTHS.items():
        worksheet.set_column(col, col, width)

    # Title row (before command bar)
    worksheet.write(0, COL_A, "RULES REFERENCE", formats["header"])
    worksheet.write(1, COL_A, "Quick reference for CBA operating rules (filtered by SelectedYear)")

    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)

    # Get content start row (after command bar)
    content_row = get_content_start_row()

    # Write each section
    content_row = _write_tax_rates_section(worksheet, rf, content_row)
    content_row = _write_minimum_scale_section(worksheet, rf, content_row)
    content_row = _write_rookie_scale_section(worksheet, rf, content_row)
    content_row = _write_salary_matching_section(worksheet, rf, content_row)
    content_row = _write_apron_gates_section(worksheet, rf, content_row)
    content_row = _write_proration_section(worksheet, rf, content_row)

    # Final note
    worksheet.write(
        content_row, COL_A,
        "For full CBA details, consult the official NBA/NBPA Collective Bargaining Agreement.",
        rf["note"],
    )

    # Protect sheet (read-only)
    _protect_sheet(worksheet)
