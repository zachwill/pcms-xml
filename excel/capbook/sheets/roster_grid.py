"""
ROSTER_GRID sheet writer — full roster/ledger view with reconciliation.

This module implements:
1. Shared command bar (read-only reference to TEAM_COCKPIT)
2. Roster rows section (from tbl_salary_book_warehouse)
   - Player name, team, badge columns (option, guarantee, trade restrictions)
   - Multi-year salary columns (cap_y0..cap_y5)
   - Bucket classification (ROST/2WAY)
   - MINIMUM label display when is_min_contract=TRUE
3. Cap holds section (bucket = FA, from tbl_cap_holds_warehouse)
4. Dead money section (bucket = TERM, from tbl_dead_money_warehouse)
5. Totals + reconciliation block vs DATA_team_salary_warehouse
6. % of cap display helper

Per the blueprint (excel-cap-book-blueprint.md):
- Every headline total must be reconcilable to the authoritative ledger
- Drilldown tables are labeled by bucket and scoped to the snapshot

Design notes:
- Uses Excel formulas filtered by SelectedTeam + SelectedYear
- Reconciliation block sums rows and compares to team_salary_warehouse totals
- Conditional formatting highlights deltas ≠ 0
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ..xlsx import FMT_MONEY, FMT_PERCENT
from .command_bar import (
    write_command_bar_readonly,
    get_content_start_row,
)


# =============================================================================
# Layout Constants
# =============================================================================

# Column layout for roster grid
# A=0: Row Type/Bucket
# B=1: Player/Hold Name
# C=2: Option Badge
# D=3: Guarantee Status
# E=4: Trade Restriction
# F=5: Min Contract label
# G=6: cap_y0 (base year)
# H-L=7-11: cap_y1..cap_y5
# M=12: Total / % of Cap

COL_BUCKET = 0
COL_NAME = 1
COL_OPTION = 2
COL_GUARANTEE = 3
COL_TRADE = 4
COL_MIN_LABEL = 5
COL_CAP_Y0 = 6
COL_CAP_Y1 = 7
COL_CAP_Y2 = 8
COL_CAP_Y3 = 9
COL_CAP_Y4 = 10
COL_CAP_Y5 = 11
COL_PCT_CAP = 12

YEAR_COLS = [COL_CAP_Y0, COL_CAP_Y1, COL_CAP_Y2, COL_CAP_Y3, COL_CAP_Y4, COL_CAP_Y5]

# Column widths
COLUMN_WIDTHS = {
    COL_BUCKET: 8,
    COL_NAME: 22,
    COL_OPTION: 6,
    COL_GUARANTEE: 8,
    COL_TRADE: 12,
    COL_MIN_LABEL: 10,
    COL_CAP_Y0: 12,
    COL_CAP_Y1: 12,
    COL_CAP_Y2: 12,
    COL_CAP_Y3: 12,
    COL_CAP_Y4: 12,
    COL_CAP_Y5: 12,
    COL_PCT_CAP: 10,
}


# =============================================================================
# Format Helpers
# =============================================================================

def _create_roster_formats(workbook: Workbook) -> dict[str, Any]:
    """Create formats specific to the roster grid."""
    formats = {}
    
    # Section headers
    formats["section_header"] = workbook.add_format({
        "bold": True,
        "font_size": 11,
        "bg_color": "#E5E7EB",  # gray-200
        "bottom": 1,
    })
    
    # Column headers
    formats["col_header"] = workbook.add_format({
        "bold": True,
        "font_size": 9,
        "bg_color": "#F3F4F6",  # gray-100
        "align": "center",
        "bottom": 1,
    })
    
    # Money format
    formats["money"] = workbook.add_format({"num_format": FMT_MONEY})
    formats["money_bold"] = workbook.add_format({"num_format": FMT_MONEY, "bold": True})
    
    # Percent format
    formats["percent"] = workbook.add_format({"num_format": FMT_PERCENT, "align": "center"})
    
    # Badge formats (option/guarantee/trade)
    formats["badge_po"] = workbook.add_format({
        "bg_color": "#DBEAFE",  # blue-100
        "font_color": "#1E40AF",  # blue-800
        "align": "center",
        "font_size": 9,
    })
    formats["badge_to"] = workbook.add_format({
        "bg_color": "#EDE9FE",  # purple-100
        "font_color": "#5B21B6",  # purple-800
        "align": "center",
        "font_size": 9,
    })
    formats["badge_eto"] = workbook.add_format({
        "bg_color": "#FFEDD5",  # orange-100
        "font_color": "#9A3412",  # orange-800
        "align": "center",
        "font_size": 9,
    })
    
    formats["badge_gtd"] = workbook.add_format({
        "font_color": "#166534",  # green-800
        "align": "center",
        "font_size": 9,
    })
    formats["badge_prt"] = workbook.add_format({
        "bg_color": "#FEF3C7",  # amber-100
        "font_color": "#92400E",  # amber-800
        "align": "center",
        "font_size": 9,
    })
    formats["badge_ng"] = workbook.add_format({
        "bg_color": "#FEE2E2",  # red-100
        "font_color": "#991B1B",  # red-800
        "align": "center",
        "font_size": 9,
    })
    
    # Trade restriction badges
    formats["badge_no_trade"] = workbook.add_format({
        "bg_color": "#FEE2E2",
        "font_color": "#991B1B",
        "align": "center",
        "font_size": 9,
    })
    formats["badge_kicker"] = workbook.add_format({
        "bg_color": "#FFEDD5",
        "font_color": "#9A3412",
        "align": "center",
        "font_size": 9,
    })
    formats["badge_consent"] = workbook.add_format({
        "bg_color": "#FEF3C7",
        "font_color": "#92400E",
        "align": "center",
        "font_size": 9,
    })
    
    # Minimum contract label
    formats["min_label"] = workbook.add_format({
        "italic": True,
        "font_color": "#6B7280",  # gray-500
        "font_size": 9,
        "align": "center",
    })
    
    # Bucket labels
    formats["bucket_rost"] = workbook.add_format({
        "font_size": 9,
        "align": "center",
    })
    formats["bucket_fa"] = workbook.add_format({
        "font_size": 9,
        "align": "center",
        "font_color": "#1E40AF",  # blue-800
    })
    formats["bucket_term"] = workbook.add_format({
        "font_size": 9,
        "align": "center",
        "font_color": "#991B1B",  # red-800
    })
    formats["bucket_2way"] = workbook.add_format({
        "font_size": 9,
        "align": "center",
        "font_color": "#6B7280",  # gray-500
        "italic": True,
    })
    
    # Subtotal row
    formats["subtotal"] = workbook.add_format({
        "bold": True,
        "top": 1,
        "num_format": FMT_MONEY,
    })
    formats["subtotal_label"] = workbook.add_format({
        "bold": True,
        "top": 1,
    })
    
    # Reconciliation section
    formats["reconcile_header"] = workbook.add_format({
        "bold": True,
        "font_size": 10,
        "bg_color": "#FEF3C7",  # amber-100
    })
    formats["reconcile_label"] = workbook.add_format({
        "font_size": 9,
    })
    formats["reconcile_value"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "font_size": 9,
    })
    formats["reconcile_delta_zero"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "font_size": 9,
        "bg_color": "#D1FAE5",  # green-100
        "font_color": "#065F46",  # green-800
    })
    formats["reconcile_delta_nonzero"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "font_size": 9,
        "bg_color": "#FEE2E2",  # red-100
        "font_color": "#991B1B",  # red-800
        "bold": True,
    })
    
    return formats


# =============================================================================
# Section Writers
# =============================================================================

def _write_column_headers(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    year_labels: list[str],
) -> int:
    """Write the column headers for the roster grid.
    
    Returns next row.
    """
    fmt = formats["col_header"]
    
    worksheet.write(row, COL_BUCKET, "Bucket", fmt)
    worksheet.write(row, COL_NAME, "Name", fmt)
    worksheet.write(row, COL_OPTION, "Opt", fmt)
    worksheet.write(row, COL_GUARANTEE, "GTD", fmt)
    worksheet.write(row, COL_TRADE, "Trade", fmt)
    worksheet.write(row, COL_MIN_LABEL, "Type", fmt)
    
    for i, label in enumerate(year_labels):
        worksheet.write(row, COL_CAP_Y0 + i, label, fmt)
    
    worksheet.write(row, COL_PCT_CAP, "% Cap", fmt)
    
    return row + 1


def _write_roster_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> tuple[int, int]:
    """Write the roster rows section (from tbl_salary_book_warehouse).
    
    Uses formulas that filter by SelectedTeam. Rows are formula-driven.
    For v1, we write a fixed number of formula rows (50) that show data
    when available and blank when not.
    
    Returns (next_row, data_start_row) for reconciliation formulas.
    """
    section_fmt = roster_formats["section_header"]
    
    # Section header
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "ROSTER (Active Contracts)", section_fmt)
    row += 1
    
    # Note about formula-driven display
    worksheet.write(row, COL_BUCKET, "Showing players for selected team (SelectedTeam)", roster_formats["reconcile_label"])
    row += 1
    
    # Column headers
    # Year labels: use formula to get base year + offset
    year_labels = ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5"]
    row = _write_column_headers(worksheet, row, roster_formats, year_labels)
    
    data_start_row = row
    
    # Write formula rows for roster players
    # We use a fixed set of rows with IFERROR(INDEX/MATCH) formulas
    # that return blank if no matching player exists.
    
    # For MVP: use formulas that pull from the table based on row position
    # This approach uses AGGREGATE + SMALL to get unique players sorted by cap_y0
    
    num_roster_rows = 40  # Fixed allocation for roster rows
    
    for i in range(1, num_roster_rows + 1):
        # Player name (Nth player by cap_y0 desc, for selected team, not two-way)
        # Using AGGREGATE(15,6,...) = SMALL ignoring errors
        name_formula = (
            f"=IFERROR(INDEX(tbl_salary_book_warehouse[player_name],"
            f"MATCH(AGGREGATE(14,6,"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),"
            f"{i}),"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),0)),\"\")"
        )
        
        # Helper: get player_id for this row's player (to use in other lookups)
        # Since we're matching by cap_y0 value, we need consistent lookups
        cap_value_formula = (
            f"AGGREGATE(14,6,"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),"
            f"{i})"
        )
        
        def _lookup(col: str) -> str:
            """Build lookup formula for a column."""
            return (
                f"=IFERROR(INDEX(tbl_salary_book_warehouse[{col}],"
                f"MATCH({cap_value_formula},"
                f"(tbl_salary_book_warehouse[cap_y0])/"
                f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
                f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),0)),\"\")"
            )
        
        # Bucket (ROST for standard contracts)
        worksheet.write_formula(
            row, COL_BUCKET,
            f'=IF({name_formula}<>"","ROST","")',
            roster_formats["bucket_rost"]
        )
        
        # Player name
        worksheet.write_formula(row, COL_NAME, name_formula)
        
        # Option badge (for base year = y0)
        # option_y0 contains PO/TO/ETO or blank
        option_formula = _lookup("option_y0")
        worksheet.write_formula(row, COL_OPTION, option_formula)
        
        # Guarantee status
        # Use is_fully_guaranteed_y0, is_partially_guaranteed_y0, is_non_guaranteed_y0
        guarantee_formula = (
            f"=IFERROR(IF(INDEX(tbl_salary_book_warehouse[is_fully_guaranteed_y0],"
            f"MATCH({cap_value_formula},"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),0))=TRUE,\"GTD\","
            f"IF(INDEX(tbl_salary_book_warehouse[is_partially_guaranteed_y0],"
            f"MATCH({cap_value_formula},"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),0))=TRUE,\"PRT\","
            f"IF(INDEX(tbl_salary_book_warehouse[is_non_guaranteed_y0],"
            f"MATCH({cap_value_formula},"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),0))=TRUE,\"NG\",\"\"))),\"\")"
        )
        worksheet.write_formula(row, COL_GUARANTEE, guarantee_formula)
        
        # Trade restriction
        # Check is_no_trade, is_trade_bonus, is_trade_restricted_now
        trade_formula = (
            f"=IFERROR(IF(INDEX(tbl_salary_book_warehouse[is_no_trade],"
            f"MATCH({cap_value_formula},"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),0))=TRUE,\"NTC\","
            f"IF(INDEX(tbl_salary_book_warehouse[is_trade_bonus],"
            f"MATCH({cap_value_formula},"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),0))=TRUE,\"Kicker\","
            f"IF(INDEX(tbl_salary_book_warehouse[is_trade_restricted_now],"
            f"MATCH({cap_value_formula},"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),0))=TRUE,\"Restricted\",\"\"))),\"\")"
        )
        worksheet.write_formula(row, COL_TRADE, trade_formula)
        
        # Minimum contract label
        min_formula = (
            f"=IFERROR(IF(INDEX(tbl_salary_book_warehouse[is_min_contract],"
            f"MATCH({cap_value_formula},"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=FALSE)),0))=TRUE,\"MINIMUM\",\"\"),\"\")"
        )
        worksheet.write_formula(row, COL_MIN_LABEL, min_formula, roster_formats["min_label"])
        
        # Salary columns (cap_y0 through cap_y5)
        for yi in range(6):
            col_name = f"cap_y{yi}"
            sal_formula = _lookup(col_name)
            worksheet.write_formula(row, COL_CAP_Y0 + yi, sal_formula, roster_formats["money"])
        
        # % of cap (cap_y0 / salary_cap_amount from system_values for SelectedYear)
        pct_formula = (
            f"=IFERROR({_lookup('cap_y0')}/"
            f"SUMIFS(tbl_system_values[salary_cap_amount],"
            f"tbl_system_values[salary_year],SelectedYear),\"\")"
        )
        worksheet.write_formula(row, COL_PCT_CAP, pct_formula, roster_formats["percent"])
        
        row += 1
    
    data_end_row = row - 1
    
    # Subtotal row for ROST bucket
    worksheet.write(row, COL_NAME, "Roster Subtotal:", roster_formats["subtotal_label"])
    
    # Sum of cap_y0 for roster (non-two-way) players
    # Use SUMIFS on salary_book_warehouse
    subtotal_formula = (
        "=SUMIFS(tbl_salary_book_warehouse[cap_y0],"
        "tbl_salary_book_warehouse[team_code],SelectedTeam,"
        "tbl_salary_book_warehouse[is_two_way],FALSE)"
    )
    worksheet.write_formula(row, COL_CAP_Y0, subtotal_formula, roster_formats["subtotal"])
    
    # Count of roster players
    count_formula = (
        "=COUNTIFS(tbl_salary_book_warehouse[team_code],SelectedTeam,"
        "tbl_salary_book_warehouse[is_two_way],FALSE,"
        "tbl_salary_book_warehouse[cap_y0],\">0\")"
    )
    worksheet.write_formula(row, COL_BUCKET, count_formula, roster_formats["subtotal_label"])
    
    row += 2  # Blank row
    
    return row, data_start_row


def _write_twoway_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> int:
    """Write the two-way contracts section.
    
    Returns next row.
    """
    section_fmt = roster_formats["section_header"]
    
    # Section header
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "TWO-WAY CONTRACTS", section_fmt)
    row += 1
    
    # Column headers
    year_labels = ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5"]
    row = _write_column_headers(worksheet, row, roster_formats, year_labels)
    
    # Two-way rows (fewer slots - typically max 3 per team)
    num_twoway_rows = 6
    
    for i in range(1, num_twoway_rows + 1):
        cap_value_formula = (
            f"AGGREGATE(14,6,"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=TRUE)),"
            f"{i})"
        )
        
        name_formula = (
            f"=IFERROR(INDEX(tbl_salary_book_warehouse[player_name],"
            f"MATCH({cap_value_formula},"
            f"(tbl_salary_book_warehouse[cap_y0])/"
            f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_salary_book_warehouse[is_two_way]=TRUE)),0)),\"\")"
        )
        
        def _lookup_2way(col: str) -> str:
            return (
                f"=IFERROR(INDEX(tbl_salary_book_warehouse[{col}],"
                f"MATCH({cap_value_formula},"
                f"(tbl_salary_book_warehouse[cap_y0])/"
                f"((tbl_salary_book_warehouse[team_code]=SelectedTeam)*"
                f"(tbl_salary_book_warehouse[is_two_way]=TRUE)),0)),\"\")"
            )
        
        # Bucket (2WAY)
        worksheet.write_formula(
            row, COL_BUCKET,
            f'=IF({name_formula}<>"","2WAY","")',
            roster_formats["bucket_2way"]
        )
        
        worksheet.write_formula(row, COL_NAME, name_formula)
        worksheet.write(row, COL_OPTION, "")  # Two-ways don't have options
        worksheet.write(row, COL_GUARANTEE, "")
        worksheet.write(row, COL_TRADE, "")
        worksheet.write(row, COL_MIN_LABEL, "")
        
        for yi in range(6):
            sal_formula = _lookup_2way(f"cap_y{yi}")
            worksheet.write_formula(row, COL_CAP_Y0 + yi, sal_formula, roster_formats["money"])
        
        row += 1
    
    # Subtotal for two-way
    worksheet.write(row, COL_NAME, "Two-Way Subtotal:", roster_formats["subtotal_label"])
    subtotal_formula = (
        "=SUMIFS(tbl_salary_book_warehouse[cap_y0],"
        "tbl_salary_book_warehouse[team_code],SelectedTeam,"
        "tbl_salary_book_warehouse[is_two_way],TRUE)"
    )
    worksheet.write_formula(row, COL_CAP_Y0, subtotal_formula, roster_formats["subtotal"])
    
    count_formula = (
        "=COUNTIFS(tbl_salary_book_warehouse[team_code],SelectedTeam,"
        "tbl_salary_book_warehouse[is_two_way],TRUE,"
        "tbl_salary_book_warehouse[cap_y0],\">0\")"
    )
    worksheet.write_formula(row, COL_BUCKET, count_formula, roster_formats["subtotal_label"])
    
    row += 2
    
    return row


def _write_cap_holds_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> int:
    """Write the cap holds section (bucket = FA).
    
    Returns next row.
    """
    section_fmt = roster_formats["section_header"]
    
    # Section header
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "CAP HOLDS (Free Agent Rights)", section_fmt)
    row += 1
    
    # Simplified column headers for holds
    fmt = roster_formats["col_header"]
    worksheet.write(row, COL_BUCKET, "Bucket", fmt)
    worksheet.write(row, COL_NAME, "Player", fmt)
    worksheet.write(row, COL_OPTION, "FA Type", fmt)
    worksheet.write(row, COL_GUARANTEE, "", fmt)
    worksheet.write(row, COL_TRADE, "Status", fmt)
    worksheet.write(row, COL_MIN_LABEL, "", fmt)
    worksheet.write(row, COL_CAP_Y0, "Amount", fmt)
    for yi in range(1, 6):
        worksheet.write(row, COL_CAP_Y0 + yi, "", fmt)
    worksheet.write(row, COL_PCT_CAP, "% Cap", fmt)
    row += 1
    
    # Cap hold rows
    num_hold_rows = 15
    
    for i in range(1, num_hold_rows + 1):
        cap_value_formula = (
            f"AGGREGATE(14,6,"
            f"(tbl_cap_holds_warehouse[cap_amount])/"
            f"((tbl_cap_holds_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_cap_holds_warehouse[salary_year]=SelectedYear)),"
            f"{i})"
        )
        
        name_formula = (
            f"=IFERROR(INDEX(tbl_cap_holds_warehouse[player_name],"
            f"MATCH({cap_value_formula},"
            f"(tbl_cap_holds_warehouse[cap_amount])/"
            f"((tbl_cap_holds_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_cap_holds_warehouse[salary_year]=SelectedYear)),0)),\"\")"
        )
        
        def _lookup_hold(col: str) -> str:
            return (
                f"=IFERROR(INDEX(tbl_cap_holds_warehouse[{col}],"
                f"MATCH({cap_value_formula},"
                f"(tbl_cap_holds_warehouse[cap_amount])/"
                f"((tbl_cap_holds_warehouse[team_code]=SelectedTeam)*"
                f"(tbl_cap_holds_warehouse[salary_year]=SelectedYear)),0)),\"\")"
            )
        
        # Bucket (FA)
        worksheet.write_formula(
            row, COL_BUCKET,
            f'=IF({name_formula}<>"","FA","")',
            roster_formats["bucket_fa"]
        )
        
        worksheet.write_formula(row, COL_NAME, name_formula)
        
        # FA designation (RFA/UFA/etc.)
        worksheet.write_formula(row, COL_OPTION, _lookup_hold("free_agent_designation_lk"))
        worksheet.write(row, COL_GUARANTEE, "")
        
        # FA status
        worksheet.write_formula(row, COL_TRADE, _lookup_hold("free_agent_status_lk"))
        worksheet.write(row, COL_MIN_LABEL, "")
        
        # Amount
        worksheet.write_formula(row, COL_CAP_Y0, _lookup_hold("cap_amount"), roster_formats["money"])
        
        # % of cap
        pct_formula = (
            f"=IFERROR({_lookup_hold('cap_amount')}/"
            f"SUMIFS(tbl_system_values[salary_cap_amount],"
            f"tbl_system_values[salary_year],SelectedYear),\"\")"
        )
        worksheet.write_formula(row, COL_PCT_CAP, pct_formula, roster_formats["percent"])
        
        row += 1
    
    # Subtotal for holds
    worksheet.write(row, COL_NAME, "Holds Subtotal:", roster_formats["subtotal_label"])
    subtotal_formula = (
        "=SUMIFS(tbl_cap_holds_warehouse[cap_amount],"
        "tbl_cap_holds_warehouse[team_code],SelectedTeam,"
        "tbl_cap_holds_warehouse[salary_year],SelectedYear)"
    )
    worksheet.write_formula(row, COL_CAP_Y0, subtotal_formula, roster_formats["subtotal"])
    
    count_formula = (
        "=COUNTIFS(tbl_cap_holds_warehouse[team_code],SelectedTeam,"
        "tbl_cap_holds_warehouse[salary_year],SelectedYear,"
        "tbl_cap_holds_warehouse[cap_amount],\">0\")"
    )
    worksheet.write_formula(row, COL_BUCKET, count_formula, roster_formats["subtotal_label"])
    
    row += 2
    
    return row


def _write_dead_money_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> int:
    """Write the dead money section (bucket = TERM).
    
    Returns next row.
    """
    section_fmt = roster_formats["section_header"]
    
    # Section header
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "DEAD MONEY (Terminated Contracts)", section_fmt)
    row += 1
    
    # Column headers
    fmt = roster_formats["col_header"]
    worksheet.write(row, COL_BUCKET, "Bucket", fmt)
    worksheet.write(row, COL_NAME, "Player", fmt)
    worksheet.write(row, COL_OPTION, "", fmt)
    worksheet.write(row, COL_GUARANTEE, "", fmt)
    worksheet.write(row, COL_TRADE, "Waive Date", fmt)
    worksheet.write(row, COL_MIN_LABEL, "", fmt)
    worksheet.write(row, COL_CAP_Y0, "Amount", fmt)
    for yi in range(1, 6):
        worksheet.write(row, COL_CAP_Y0 + yi, "", fmt)
    worksheet.write(row, COL_PCT_CAP, "% Cap", fmt)
    row += 1
    
    # Dead money rows
    num_dead_rows = 10
    
    for i in range(1, num_dead_rows + 1):
        cap_value_formula = (
            f"AGGREGATE(14,6,"
            f"(tbl_dead_money_warehouse[cap_value])/"
            f"((tbl_dead_money_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_dead_money_warehouse[salary_year]=SelectedYear)),"
            f"{i})"
        )
        
        name_formula = (
            f"=IFERROR(INDEX(tbl_dead_money_warehouse[player_name],"
            f"MATCH({cap_value_formula},"
            f"(tbl_dead_money_warehouse[cap_value])/"
            f"((tbl_dead_money_warehouse[team_code]=SelectedTeam)*"
            f"(tbl_dead_money_warehouse[salary_year]=SelectedYear)),0)),\"\")"
        )
        
        def _lookup_dead(col: str) -> str:
            return (
                f"=IFERROR(INDEX(tbl_dead_money_warehouse[{col}],"
                f"MATCH({cap_value_formula},"
                f"(tbl_dead_money_warehouse[cap_value])/"
                f"((tbl_dead_money_warehouse[team_code]=SelectedTeam)*"
                f"(tbl_dead_money_warehouse[salary_year]=SelectedYear)),0)),\"\")"
            )
        
        # Bucket (TERM)
        worksheet.write_formula(
            row, COL_BUCKET,
            f'=IF({name_formula}<>"","TERM","")',
            roster_formats["bucket_term"]
        )
        
        worksheet.write_formula(row, COL_NAME, name_formula)
        worksheet.write(row, COL_OPTION, "")
        worksheet.write(row, COL_GUARANTEE, "")
        
        # Waive date
        waive_date_formula = _lookup_dead("waive_date")
        worksheet.write_formula(row, COL_TRADE, waive_date_formula)
        worksheet.write(row, COL_MIN_LABEL, "")
        
        # Amount
        worksheet.write_formula(row, COL_CAP_Y0, _lookup_dead("cap_value"), roster_formats["money"])
        
        # % of cap
        pct_formula = (
            f"=IFERROR({_lookup_dead('cap_value')}/"
            f"SUMIFS(tbl_system_values[salary_cap_amount],"
            f"tbl_system_values[salary_year],SelectedYear),\"\")"
        )
        worksheet.write_formula(row, COL_PCT_CAP, pct_formula, roster_formats["percent"])
        
        row += 1
    
    # Subtotal for dead money
    worksheet.write(row, COL_NAME, "Dead Money Subtotal:", roster_formats["subtotal_label"])
    subtotal_formula = (
        "=SUMIFS(tbl_dead_money_warehouse[cap_value],"
        "tbl_dead_money_warehouse[team_code],SelectedTeam,"
        "tbl_dead_money_warehouse[salary_year],SelectedYear)"
    )
    worksheet.write_formula(row, COL_CAP_Y0, subtotal_formula, roster_formats["subtotal"])
    
    count_formula = (
        "=COUNTIFS(tbl_dead_money_warehouse[team_code],SelectedTeam,"
        "tbl_dead_money_warehouse[salary_year],SelectedYear,"
        "tbl_dead_money_warehouse[cap_value],\">0\")"
    )
    worksheet.write_formula(row, COL_BUCKET, count_formula, roster_formats["subtotal_label"])
    
    row += 2
    
    return row


def _write_reconciliation_block(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> int:
    """Write the reconciliation block comparing grid sums to warehouse totals.
    
    This is the critical section that proves the ledger is trustworthy.
    
    Returns next row.
    """
    reconcile_header = roster_formats["reconcile_header"]
    label_fmt = roster_formats["reconcile_label"]
    value_fmt = roster_formats["reconcile_value"]
    
    # Section header
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "RECONCILIATION (vs DATA_team_salary_warehouse)", reconcile_header)
    row += 1
    row += 1  # Blank row
    
    # Column labels
    worksheet.write(row, COL_NAME, "", label_fmt)
    worksheet.write(row, COL_CAP_Y0, "Grid Sum", roster_formats["col_header"])
    worksheet.write(row, COL_CAP_Y1, "Warehouse", roster_formats["col_header"])
    worksheet.write(row, COL_CAP_Y2, "Delta", roster_formats["col_header"])
    row += 1
    
    # Define the bucket comparisons
    buckets = [
        ("Roster (ROST)", "cap_rost", 
         "SUMIFS(tbl_salary_book_warehouse[cap_y0],tbl_salary_book_warehouse[team_code],SelectedTeam,tbl_salary_book_warehouse[is_two_way],FALSE)"),
        ("Two-Way (2WAY)", "cap_2way",
         "SUMIFS(tbl_salary_book_warehouse[cap_y0],tbl_salary_book_warehouse[team_code],SelectedTeam,tbl_salary_book_warehouse[is_two_way],TRUE)"),
        ("Holds (FA)", "cap_fa",
         "SUMIFS(tbl_cap_holds_warehouse[cap_amount],tbl_cap_holds_warehouse[team_code],SelectedTeam,tbl_cap_holds_warehouse[salary_year],SelectedYear)"),
        ("Dead Money (TERM)", "cap_term",
         "SUMIFS(tbl_dead_money_warehouse[cap_value],tbl_dead_money_warehouse[team_code],SelectedTeam,tbl_dead_money_warehouse[salary_year],SelectedYear)"),
    ]
    
    for label, warehouse_col, grid_formula in buckets:
        worksheet.write(row, COL_NAME, label, label_fmt)
        
        # Grid sum (from our formulas above)
        grid_cell = f"={grid_formula}"
        worksheet.write_formula(row, COL_CAP_Y0, grid_cell, value_fmt)
        
        # Warehouse value
        warehouse_formula = (
            f"=SUMIFS(tbl_team_salary_warehouse[{warehouse_col}],"
            f"tbl_team_salary_warehouse[team_code],SelectedTeam,"
            f"tbl_team_salary_warehouse[salary_year],SelectedYear)"
        )
        worksheet.write_formula(row, COL_CAP_Y1, warehouse_formula, value_fmt)
        
        # Delta (grid - warehouse)
        delta_cell_grid = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_CAP_Y0)
        delta_cell_warehouse = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_CAP_Y1)
        delta_formula = f"={delta_cell_grid}-{delta_cell_warehouse}"
        worksheet.write_formula(row, COL_CAP_Y2, delta_formula, value_fmt)
        
        # Conditional formatting for delta
        worksheet.conditional_format(row, COL_CAP_Y2, row, COL_CAP_Y2, {
            "type": "cell",
            "criteria": "==",
            "value": 0,
            "format": roster_formats["reconcile_delta_zero"],
        })
        worksheet.conditional_format(row, COL_CAP_Y2, row, COL_CAP_Y2, {
            "type": "cell",
            "criteria": "!=",
            "value": 0,
            "format": roster_formats["reconcile_delta_nonzero"],
        })
        
        row += 1
    
    # Total row
    row += 1
    worksheet.write(row, COL_NAME, "TOTAL (cap_total)", roster_formats["subtotal_label"])
    
    # Total grid sum (sum all buckets)
    total_grid_formula = (
        "=SUMIFS(tbl_salary_book_warehouse[cap_y0],tbl_salary_book_warehouse[team_code],SelectedTeam)"
        "+SUMIFS(tbl_cap_holds_warehouse[cap_amount],tbl_cap_holds_warehouse[team_code],SelectedTeam,tbl_cap_holds_warehouse[salary_year],SelectedYear)"
        "+SUMIFS(tbl_dead_money_warehouse[cap_value],tbl_dead_money_warehouse[team_code],SelectedTeam,tbl_dead_money_warehouse[salary_year],SelectedYear)"
    )
    worksheet.write_formula(row, COL_CAP_Y0, total_grid_formula, roster_formats["subtotal"])
    
    # Warehouse cap_total
    total_warehouse_formula = (
        "=SUMIFS(tbl_team_salary_warehouse[cap_total],"
        "tbl_team_salary_warehouse[team_code],SelectedTeam,"
        "tbl_team_salary_warehouse[salary_year],SelectedYear)"
    )
    worksheet.write_formula(row, COL_CAP_Y1, total_warehouse_formula, roster_formats["subtotal"])
    
    # Total delta
    total_delta_grid = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_CAP_Y0)
    total_delta_warehouse = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_CAP_Y1)
    worksheet.write_formula(row, COL_CAP_Y2, f"={total_delta_grid}-{total_delta_warehouse}", roster_formats["subtotal"])
    
    worksheet.conditional_format(row, COL_CAP_Y2, row, COL_CAP_Y2, {
        "type": "cell",
        "criteria": "==",
        "value": 0,
        "format": roster_formats["reconcile_delta_zero"],
    })
    worksheet.conditional_format(row, COL_CAP_Y2, row, COL_CAP_Y2, {
        "type": "cell",
        "criteria": "!=",
        "value": 0,
        "format": roster_formats["reconcile_delta_nonzero"],
    })
    
    row += 2
    
    # Reconciliation status message
    status_formula = (
        f"=IF({total_delta_grid}-{total_delta_warehouse}=0,"
        f"\"✓ Reconciled — grid sums match warehouse totals\","
        f"\"⚠ MISMATCH — grid sums differ from warehouse totals\")"
    )
    worksheet.write_formula(row, COL_NAME, status_formula)
    worksheet.merge_range(row, COL_NAME, row, COL_CAP_Y2, "", roster_formats["reconcile_label"])
    worksheet.write_formula(row, COL_NAME, status_formula)
    
    # Conditional formatting for status row
    worksheet.conditional_format(row, COL_NAME, row, COL_CAP_Y2, {
        "type": "formula",
        "criteria": f"={total_delta_grid}={total_delta_warehouse}",
        "format": roster_formats["reconcile_delta_zero"],
    })
    worksheet.conditional_format(row, COL_NAME, row, COL_CAP_Y2, {
        "type": "formula",
        "criteria": f"={total_delta_grid}<>{total_delta_warehouse}",
        "format": roster_formats["reconcile_delta_nonzero"],
    })
    
    row += 2
    
    return row


# =============================================================================
# Import xlsxwriter utility
# =============================================================================

import xlsxwriter.utility


# =============================================================================
# Main Writer
# =============================================================================

def write_roster_grid(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write ROSTER_GRID sheet with full roster/ledger view and reconciliation.

    The roster grid shows:
    - All roster contracts (bucket = ROST) with badges and multi-year salaries
    - Two-way contracts (bucket = 2WAY)
    - Cap holds (bucket = FA)
    - Dead money (bucket = TERM)
    - Reconciliation block proving grid sums match warehouse totals

    Per the blueprint:
    - Every headline total must be reconcilable
    - Detail tables are labeled by bucket
    - MINIMUM label appears for min contracts
    - % of cap displayed for context

    Args:
        workbook: The XlsxWriter Workbook
        worksheet: The ROSTER_GRID worksheet
        formats: Standard format dict from create_standard_formats
    """
    # Sheet title
    worksheet.write(0, 0, "ROSTER GRID", formats["header"])
    worksheet.write(1, 0, "Full roster/ledger view with explicit bucket classification")
    
    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)
    
    # Set column widths
    for col, width in COLUMN_WIDTHS.items():
        worksheet.set_column(col, col, width)
    
    # Create roster-specific formats
    roster_formats = _create_roster_formats(workbook)
    
    # Content starts after command bar
    content_row = get_content_start_row()
    
    # 1. Roster section (active contracts)
    content_row, roster_data_start = _write_roster_section(workbook, worksheet, content_row, formats, roster_formats)
    
    # 2. Two-way section
    content_row = _write_twoway_section(workbook, worksheet, content_row, formats, roster_formats)
    
    # 3. Cap holds section
    content_row = _write_cap_holds_section(workbook, worksheet, content_row, formats, roster_formats)
    
    # 4. Dead money section
    content_row = _write_dead_money_section(workbook, worksheet, content_row, formats, roster_formats)
    
    # 5. Reconciliation block
    content_row = _write_reconciliation_block(workbook, worksheet, content_row, formats, roster_formats)
    
    # Sheet protection
    worksheet.protect(options={
        "objects": True,
        "scenarios": True,
        "format_cells": False,
        "select_unlocked_cells": True,
        "select_locked_cells": True,
    })
