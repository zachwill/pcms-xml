"""
AUDIT_AND_RECONCILE sheet writer.

This sheet is the "prevent 'your number is wrong' fights" layer.
Per the blueprint (excel-cap-book-blueprint.md), it must include:
- Totals reconciliation (snapshot vs counting rows vs derived totals)
- Contributing rows drilldowns for each headline readout
- Assumptions applied (fill rows, toggles, overrides)
- Plan diff (baseline vs plan) and journal step summary

This v1 implementation focuses on:
1. Selected team/year totals from DATA_team_salary_warehouse
2. Row counts + basic sums from drilldown tables
3. Visible delta (even if it's not 0 yet)
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ..xlsx import FMT_MONEY


# Layout constants
COL_LABEL = 0
COL_VALUE = 1
COL_UNIT = 2
COL_DELTA = 3
COL_STATUS = 4


def _sumifs_formula(table: str, data_col: str) -> str:
    """Build SUMIFS formula to look up a value from a table.

    Uses SelectedTeam and SelectedYear to filter.
    """
    return (
        f"=SUMIFS({table}[{data_col}],"
        f"{table}[team_code],SelectedTeam,"
        f"{table}[salary_year],SelectedYear)"
    )


def _countifs_formula(table: str) -> str:
    """Build COUNTIFS formula to count rows matching team/year."""
    return (
        f"=COUNTIFS({table}[team_code],SelectedTeam,"
        f"{table}[salary_year],SelectedYear)"
    )


def write_audit_and_reconcile(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
    build_meta: dict[str, Any],
) -> None:
    """
    Write AUDIT_AND_RECONCILE sheet with reconciliation tables.

    The audit sheet shows:
    1. Authoritative totals from DATA_team_salary_warehouse
    2. Drilldown sums from contributing tables (salary_book_yearly, cap_holds, dead_money)
    3. Deltas and reconciliation status

    Args:
        workbook: The XlsxWriter Workbook
        worksheet: The AUDIT_AND_RECONCILE worksheet
        formats: Standard format dict from create_standard_formats
        build_meta: Build metadata (base_year, as_of_date, etc.)
    """
    # Column widths
    worksheet.set_column(COL_LABEL, COL_LABEL, 32)
    worksheet.set_column(COL_VALUE, COL_VALUE, 18)
    worksheet.set_column(COL_UNIT, COL_UNIT, 20)
    worksheet.set_column(COL_DELTA, COL_DELTA, 18)
    worksheet.set_column(COL_STATUS, COL_STATUS, 12)

    # Formats
    money_fmt = workbook.add_format({"num_format": FMT_MONEY, "bold": True})
    delta_ok_fmt = workbook.add_format(
        {"num_format": FMT_MONEY, "bold": True, "font_color": "#16A34A"}
    )
    delta_bad_fmt = workbook.add_format(
        {"num_format": FMT_MONEY, "bold": True, "font_color": "#EF4444"}
    )
    count_fmt = workbook.add_format({"bold": True})
    label_fmt = workbook.add_format({"bold": False})
    subheader_fmt = workbook.add_format({"bold": True, "underline": True})

    row = 0

    # Sheet title
    worksheet.write(row, 0, "AUDIT & RECONCILE", formats["header"])
    row += 1
    worksheet.write(row, 0, "Reconciliation and explainability layer")
    row += 2

    # Context reference
    worksheet.write(row, COL_LABEL, "Context:", subheader_fmt)
    row += 1
    worksheet.write(row, COL_LABEL, "Selected Team:", label_fmt)
    worksheet.write_formula(row, COL_VALUE, "=SelectedTeam")
    row += 1
    worksheet.write(row, COL_LABEL, "Selected Year:", label_fmt)
    worksheet.write_formula(row, COL_VALUE, "=SelectedYear")
    row += 2

    # =========================================================================
    # SECTION 1: Authoritative Totals (from team_salary_warehouse)
    # =========================================================================
    section1_start = row
    worksheet.write(row, COL_LABEL, "1. AUTHORITATIVE TOTALS", formats["header"])
    worksheet.write(row, COL_VALUE, "Value", formats["header"])
    worksheet.write(row, COL_UNIT, "Source", formats["header"])
    row += 1
    worksheet.write(
        row, COL_LABEL, "(from DATA_team_salary_warehouse)", label_fmt
    )
    row += 1

    # Cap totals by bucket
    cap_rows = [
        ("cap_total", "Cap Total"),
        ("cap_rost", "Cap - Roster (ROST)"),
        ("cap_fa", "Cap - FA Holds (FA)"),
        ("cap_term", "Cap - Terminations (TERM)"),
        ("cap_2way", "Cap - Two-Way (2WAY)"),
    ]
    for col_name, label in cap_rows:
        worksheet.write(row, COL_LABEL, label, label_fmt)
        worksheet.write_formula(
            row,
            COL_VALUE,
            _sumifs_formula("tbl_team_salary_warehouse", col_name),
            money_fmt,
        )
        worksheet.write(row, COL_UNIT, "tbl_team_salary_warehouse", label_fmt)
        row += 1

    row += 1

    # Tax totals by bucket
    tax_rows = [
        ("tax_total", "Tax Total"),
        ("tax_rost", "Tax - Roster (ROST)"),
        ("tax_fa", "Tax - FA Holds (FA)"),
        ("tax_term", "Tax - Terminations (TERM)"),
        ("tax_2way", "Tax - Two-Way (2WAY)"),
    ]
    for col_name, label in tax_rows:
        worksheet.write(row, COL_LABEL, label, label_fmt)
        worksheet.write_formula(
            row,
            COL_VALUE,
            _sumifs_formula("tbl_team_salary_warehouse", col_name),
            money_fmt,
        )
        worksheet.write(row, COL_UNIT, "tbl_team_salary_warehouse", label_fmt)
        row += 1

    row += 1

    # Roster counts
    count_rows = [
        ("roster_row_count", "Roster Row Count"),
        ("two_way_row_count", "Two-Way Row Count"),
    ]
    for col_name, label in count_rows:
        worksheet.write(row, COL_LABEL, label, label_fmt)
        worksheet.write_formula(
            row,
            COL_VALUE,
            _sumifs_formula("tbl_team_salary_warehouse", col_name),
            count_fmt,
        )
        worksheet.write(row, COL_UNIT, "tbl_team_salary_warehouse", label_fmt)
        row += 1

    row += 2

    # =========================================================================
    # SECTION 2: Drilldown Table Counts & Sums
    # =========================================================================
    worksheet.write(row, COL_LABEL, "2. DRILLDOWN TABLES", formats["header"])
    worksheet.write(row, COL_VALUE, "Row Count", formats["header"])
    worksheet.write(row, COL_UNIT, "Sum (cap_amount)", formats["header"])
    row += 1
    worksheet.write(
        row, COL_LABEL, "(contributing rows from DATA_* tables)", label_fmt
    )
    row += 1

    # Salary book yearly - main roster/contract rows
    worksheet.write(row, COL_LABEL, "salary_book_yearly (contracts)", label_fmt)
    worksheet.write_formula(
        row,
        COL_VALUE,
        _countifs_formula("tbl_salary_book_yearly"),
        count_fmt,
    )
    worksheet.write_formula(
        row,
        COL_UNIT,
        _sumifs_formula("tbl_salary_book_yearly", "cap_amount"),
        money_fmt,
    )
    row += 1

    # Cap holds warehouse
    worksheet.write(row, COL_LABEL, "cap_holds_warehouse (FA holds)", label_fmt)
    worksheet.write_formula(
        row,
        COL_VALUE,
        _countifs_formula("tbl_cap_holds_warehouse"),
        count_fmt,
    )
    worksheet.write_formula(
        row,
        COL_UNIT,
        _sumifs_formula("tbl_cap_holds_warehouse", "cap_amount"),
        money_fmt,
    )
    row += 1

    # Dead money warehouse
    worksheet.write(row, COL_LABEL, "dead_money_warehouse (terminations)", label_fmt)
    worksheet.write_formula(
        row,
        COL_VALUE,
        _countifs_formula("tbl_dead_money_warehouse"),
        count_fmt,
    )
    worksheet.write_formula(
        row,
        COL_UNIT,
        # Note: dead money uses cap_value not cap_amount
        _sumifs_formula("tbl_dead_money_warehouse", "cap_value"),
        money_fmt,
    )
    row += 1

    # Exceptions warehouse
    worksheet.write(row, COL_LABEL, "exceptions_warehouse (TPEs)", label_fmt)
    worksheet.write_formula(
        row,
        COL_VALUE,
        _countifs_formula("tbl_exceptions_warehouse"),
        count_fmt,
    )
    worksheet.write_formula(
        row,
        COL_UNIT,
        _sumifs_formula("tbl_exceptions_warehouse", "remaining_amount"),
        money_fmt,
    )
    row += 1

    row += 2

    # =========================================================================
    # SECTION 3: Reconciliation Checks
    # =========================================================================
    worksheet.write(row, COL_LABEL, "3. RECONCILIATION CHECKS", formats["header"])
    worksheet.write(row, COL_VALUE, "Calculated", formats["header"])
    worksheet.write(row, COL_UNIT, "Authoritative", formats["header"])
    worksheet.write(row, COL_DELTA, "Delta", formats["header"])
    worksheet.write(row, COL_STATUS, "Status", formats["header"])
    row += 1
    worksheet.write(
        row, COL_LABEL, "(comparing drilldown sums to authoritative totals)", label_fmt
    )
    row += 1

    # Store cell refs for formulas
    check_start_row = row

    # Check 1: cap_total = cap_rost + cap_fa + cap_term + cap_2way
    worksheet.write(row, COL_LABEL, "Cap buckets sum to total", label_fmt)

    # Calculated = sum of bucket columns
    calc_formula = (
        f"={_sumifs_formula('tbl_team_salary_warehouse', 'cap_rost')}"
        f"+{_sumifs_formula('tbl_team_salary_warehouse', 'cap_fa')}"
        f"+{_sumifs_formula('tbl_team_salary_warehouse', 'cap_term')}"
        f"+{_sumifs_formula('tbl_team_salary_warehouse', 'cap_2way')}"
    ).replace("==", "=")
    # Fix the double equals from concatenation
    calc_formula = calc_formula.replace("=+", "+").replace("==", "=")
    # Simpler approach: use cell values
    worksheet.write_formula(
        row,
        COL_VALUE,
        f"=SUMIFS(tbl_team_salary_warehouse[cap_rost],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear)"
        f"+SUMIFS(tbl_team_salary_warehouse[cap_fa],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear)"
        f"+SUMIFS(tbl_team_salary_warehouse[cap_term],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear)"
        f"+SUMIFS(tbl_team_salary_warehouse[cap_2way],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear)",
        money_fmt,
    )

    # Authoritative = cap_total
    worksheet.write_formula(
        row,
        COL_UNIT,
        _sumifs_formula("tbl_team_salary_warehouse", "cap_total"),
        money_fmt,
    )

    # Delta = calculated - authoritative
    # Use cell refs for clarity: B(row+1) - C(row+1)
    delta_cell = f"B{row + 1}-C{row + 1}"
    worksheet.write_formula(
        row,
        COL_DELTA,
        f"={delta_cell}",
        money_fmt,
    )

    # Status = OK if delta == 0
    worksheet.write_formula(
        row,
        COL_STATUS,
        f'=IF(ABS(D{row + 1})<1,"✓ OK","✗ DIFF")',
    )
    # Conditional formatting for delta column
    worksheet.conditional_format(
        row,
        COL_DELTA,
        row,
        COL_DELTA,
        {"type": "cell", "criteria": "==", "value": 0, "format": delta_ok_fmt},
    )
    worksheet.conditional_format(
        row,
        COL_DELTA,
        row,
        COL_DELTA,
        {"type": "cell", "criteria": "!=", "value": 0, "format": delta_bad_fmt},
    )
    row += 1

    # Check 2: tax buckets sum to total
    worksheet.write(row, COL_LABEL, "Tax buckets sum to total", label_fmt)
    worksheet.write_formula(
        row,
        COL_VALUE,
        f"=SUMIFS(tbl_team_salary_warehouse[tax_rost],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear)"
        f"+SUMIFS(tbl_team_salary_warehouse[tax_fa],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear)"
        f"+SUMIFS(tbl_team_salary_warehouse[tax_term],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear)"
        f"+SUMIFS(tbl_team_salary_warehouse[tax_2way],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear)",
        money_fmt,
    )
    worksheet.write_formula(
        row,
        COL_UNIT,
        _sumifs_formula("tbl_team_salary_warehouse", "tax_total"),
        money_fmt,
    )
    worksheet.write_formula(
        row,
        COL_DELTA,
        f"=B{row + 1}-C{row + 1}",
        money_fmt,
    )
    worksheet.write_formula(
        row,
        COL_STATUS,
        f'=IF(ABS(D{row + 1})<1,"✓ OK","✗ DIFF")',
    )
    worksheet.conditional_format(
        row,
        COL_DELTA,
        row,
        COL_DELTA,
        {"type": "cell", "criteria": "==", "value": 0, "format": delta_ok_fmt},
    )
    worksheet.conditional_format(
        row,
        COL_DELTA,
        row,
        COL_DELTA,
        {"type": "cell", "criteria": "!=", "value": 0, "format": delta_bad_fmt},
    )
    row += 2

    # =========================================================================
    # SECTION 4: Notes / Future Work
    # =========================================================================
    worksheet.write(row, COL_LABEL, "4. NOTES", formats["header"])
    row += 1
    worksheet.write(
        row,
        COL_LABEL,
        "• Drilldown sums may differ from bucket totals due to classification logic",
    )
    row += 1
    worksheet.write(
        row,
        COL_LABEL,
        "• Full row-level reconciliation (each drilldown row → bucket) coming later",
    )
    row += 1
    worksheet.write(
        row,
        COL_LABEL,
        "• Plan diffs (baseline vs scenario) will appear here once Plan Journal is active",
    )
    row += 1
    worksheet.write(
        row,
        COL_LABEL,
        "• See META sheet for validation status and any errors",
    )
