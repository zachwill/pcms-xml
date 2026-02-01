from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ...named_formulas import (
    roster_col_formula,
    roster_derived_formula,
    roster_option_formula,
    roster_guarantee_formula,
    roster_salary_formula,
    roster_pct_of_cap_formula,
)
from .helpers import (
    COL_BUCKET, COL_COUNTS_TOTAL, COL_COUNTS_ROSTER, COL_NAME,
    COL_OPTION, COL_GUARANTEE, COL_TRADE, COL_MIN_LABEL,
    COL_CAP_Y0, COL_PCT_CAP,
    num_roster_rows,
    _mode_year_label, _write_column_headers,
    _salary_book_sumproduct, _salary_book_countproduct
)


def _write_roster_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> tuple[int, int]:
    """Write the roster rows section (from tbl_salary_book_warehouse).

    Uses Excel 365 dynamic array formulas (FILTER, SORTBY, TAKE, CHOOSECOLS).
    Rows are spilled from a single formula that:
    1. FILTERs to SelectedTeam + non-two-way + has amount in SelectedYear
    2. SORTBYs by SelectedYear mode-aware amount (DESC)
    3. TAKEs the first N rows (max 40)
    4. Uses CHOOSECOLS + INDEX for mode-aware column selection

    Returns (next_row, data_start_row) for reconciliation formulas.
    """
    section_fmt = roster_formats["section_header"]

    # Section header
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "ROSTER (Active Contracts)", section_fmt)
    row += 1

    # Note about formula-driven display (updated for dynamic arrays)
    worksheet.write(row, COL_BUCKET, "Dynamic array: players for SelectedTeam sorted by SelectedYear amount (uses FILTER/SORTBY)", roster_formats["reconcile_label"])
    row += 1

    # Column headers
    # Year labels: show mode + absolute year (e.g., "Cap 2025", "Tax 2025")
    year_labels = [
        _mode_year_label(0),
        _mode_year_label(1),
        _mode_year_label(2),
        _mode_year_label(3),
        _mode_year_label(4),
        _mode_year_label(5),
    ]
    row = _write_column_headers(worksheet, row, roster_formats, year_labels)

    data_start_row = row

    # -------------------------------------------------------------------------
    # Player Name column (spills down)
    # -------------------------------------------------------------------------
    name_formula = roster_col_formula("tbl_salary_book_warehouse[player_name]", num_roster_rows)
    worksheet.write_formula(row, COL_NAME, name_formula)

    # -------------------------------------------------------------------------
    # Bucket column (ROST for non-empty rows)
    # -------------------------------------------------------------------------
    bucket_formula = roster_derived_formula(
        "tbl_salary_book_warehouse[player_name]", 'IF({result}<>"","ROST","")', num_roster_rows
    )
    worksheet.write_formula(row, COL_BUCKET, bucket_formula, roster_formats["bucket_rost"])

    # -------------------------------------------------------------------------
    # CountsTowardTotal column (Y for non-empty)
    # -------------------------------------------------------------------------
    ct_total_formula = roster_derived_formula(
        "tbl_salary_book_warehouse[player_name]", 'IF({result}<>"","Y","")', num_roster_rows
    )
    worksheet.write_formula(row, COL_COUNTS_TOTAL, ct_total_formula, roster_formats["counts_yes"])

    # -------------------------------------------------------------------------
    # CountsTowardRoster column (Y for ROST)
    # -------------------------------------------------------------------------
    ct_roster_formula = roster_derived_formula(
        "tbl_salary_book_warehouse[player_name]", 'IF({result}<>"","Y","")', num_roster_rows
    )
    worksheet.write_formula(row, COL_COUNTS_ROSTER, ct_roster_formula, roster_formats["counts_yes"])

    # -------------------------------------------------------------------------
    # Option badge column (spills down)
    # -------------------------------------------------------------------------
    option_formula = roster_option_formula(num_roster_rows)
    worksheet.write_formula(row, COL_OPTION, option_formula)

    # -------------------------------------------------------------------------
    # Guarantee status column (GTD/PRT/NG)
    # -------------------------------------------------------------------------
    guarantee_formula = roster_guarantee_formula(num_roster_rows)
    worksheet.write_formula(row, COL_GUARANTEE, guarantee_formula)

    # -------------------------------------------------------------------------
    # Trade restriction column (NTC/Kicker/Restricted)
    # -------------------------------------------------------------------------
    trade_label = (
        'IF(tbl_salary_book_warehouse[is_no_trade]=TRUE,"NTC",'
        'IF(tbl_salary_book_warehouse[is_trade_bonus]=TRUE,"Kicker",'
        'IF(tbl_salary_book_warehouse[is_trade_restricted_now]=TRUE,"Restricted","")))'
    )
    trade_formula = roster_col_formula(trade_label, num_roster_rows)
    worksheet.write_formula(row, COL_TRADE, trade_formula)

    # -------------------------------------------------------------------------
    # Minimum contract label column
    # -------------------------------------------------------------------------
    min_label = 'IF(tbl_salary_book_warehouse[is_min_contract]=TRUE,"MINIMUM","")'
    min_formula = roster_col_formula(min_label, num_roster_rows)
    worksheet.write_formula(row, COL_MIN_LABEL, min_formula, roster_formats["min_label"])

    # -------------------------------------------------------------------------
    # Salary columns (cap_y0..cap_y5 or tax_y0..tax_y5 or apron_y0..apron_y5)
    # Mode-aware: use SelectedMode to pick the prefix
    # -------------------------------------------------------------------------
    for yi in range(6):
        sal_formula = roster_salary_formula(yi, num_roster_rows)
        worksheet.write_formula(row, COL_CAP_Y0 + yi, sal_formula, roster_formats["money"])

    # -------------------------------------------------------------------------
    # % of cap column (SelectedYear amount / salary_cap_amount)
    # -------------------------------------------------------------------------
    pct_formula = roster_pct_of_cap_formula(num_roster_rows)
    worksheet.write_formula(row, COL_PCT_CAP, pct_formula, roster_formats["percent"])

    # Move past spill zone (40 rows allocated)
    row += num_roster_rows

    # Subtotal row for ROST bucket (selected year)
    worksheet.write(row, COL_NAME, "Roster Subtotal:", roster_formats["subtotal_label"])

    worksheet.write_formula(
        row,
        COL_CAP_Y0,
        f"={_salary_book_sumproduct(is_two_way='FALSE')}",
        roster_formats["subtotal"],
    )

    # Count of roster players with selected-year cap > 0
    worksheet.write_formula(
        row,
        COL_BUCKET,
        f"={_salary_book_countproduct('FALSE')}",
        roster_formats["subtotal_label"],
    )

    row += 2  # Blank row

    return row, data_start_row
