from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from .helpers import (
    COL_BUCKET, COL_COUNTS_TOTAL, COL_COUNTS_ROSTER, COL_NAME,
    COL_OPTION, COL_GUARANTEE, COL_TRADE, COL_MIN_LABEL,
    COL_CAP_Y0, COL_PCT_CAP,
    num_roster_rows,
    _mode_year_label, _write_column_headers,
    roster_let_prefix,
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
    name_formula = (
        "=LET("
        + roster_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_salary_book_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"  # Need mode_amt for sorting
        + "IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_roster_rows) + "),\"\"))"
    )
    worksheet.write_formula(row, COL_NAME, name_formula)

    # -------------------------------------------------------------------------
    # Bucket column (ROST for non-empty rows)
    # -------------------------------------------------------------------------
    # Since we can't easily reference the spilled name column, we replicate the filter
    bucket_formula = (
        "=LET("
        + roster_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_salary_book_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_roster_rows) + "),\"\"),"
        + 'IF(_xlpm.names<>"","ROST",""))'
    )
    worksheet.write_formula(row, COL_BUCKET, bucket_formula, roster_formats["bucket_rost"])

    # -------------------------------------------------------------------------
    # CountsTowardTotal column (Y for non-empty)
    # -------------------------------------------------------------------------
    ct_total_formula = (
        "=LET("
        + roster_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_salary_book_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_roster_rows) + "),\"\"),"
        + 'IF(_xlpm.names<>"","Y",""))'
    )
    worksheet.write_formula(row, COL_COUNTS_TOTAL, ct_total_formula, roster_formats["counts_yes"])

    # -------------------------------------------------------------------------
    # CountsTowardRoster column (Y for ROST)
    # -------------------------------------------------------------------------
    ct_roster_formula = (
        "=LET("
        + roster_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_salary_book_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_roster_rows) + "),\"\"),"
        + 'IF(_xlpm.names<>"","Y",""))'
    )
    worksheet.write_formula(row, COL_COUNTS_ROSTER, ct_roster_formula, roster_formats["counts_yes"])

    # -------------------------------------------------------------------------
    # Option badge column (spills down)
    # -------------------------------------------------------------------------
    # Uses CHOOSE to select the right option_y* column for SelectedYear
    opt_choose = ",".join(f"tbl_salary_book_warehouse[option_y{i}]" for i in range(6))
    option_formula = (
        "=LET("
        + roster_let_prefix()
        + f"_xlpm.opt_col,CHOOSE((SelectedYear-MetaBaseYear+1),{opt_choose}),"
        + "_xlpm.filtered,FILTER(_xlpm.opt_col,_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_roster_rows) + "),\"\"))"
    )
    worksheet.write_formula(row, COL_OPTION, option_formula)

    # -------------------------------------------------------------------------
    # Guarantee status column (GTD/PRT/NG)
    # -------------------------------------------------------------------------
    # Needs to check is_fully_guaranteed, is_partially_guaranteed, is_non_guaranteed for SelectedYear
    gtd_full_choose = ",".join(f"tbl_salary_book_warehouse[is_fully_guaranteed_y{i}]" for i in range(6))
    gtd_part_choose = ",".join(f"tbl_salary_book_warehouse[is_partially_guaranteed_y{i}]" for i in range(6))
    gtd_non_choose = ",".join(f"tbl_salary_book_warehouse[is_non_guaranteed_y{i}]" for i in range(6))
    guarantee_formula = (
        "=LET("
        + roster_let_prefix()
        + f"_xlpm.gtd_full,CHOOSE((SelectedYear-MetaBaseYear+1),{gtd_full_choose}),"
        + f"_xlpm.gtd_part,CHOOSE((SelectedYear-MetaBaseYear+1),{gtd_part_choose}),"
        + f"_xlpm.gtd_non,CHOOSE((SelectedYear-MetaBaseYear+1),{gtd_non_choose}),"
        + '_xlpm.gtd_label,IF(_xlpm.gtd_full=TRUE,"GTD",IF(_xlpm.gtd_part=TRUE,"PRT",IF(_xlpm.gtd_non=TRUE,"NG",""))),'
        + "_xlpm.filtered,FILTER(_xlpm.gtd_label,_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_roster_rows) + "),\"\"))"
    )
    worksheet.write_formula(row, COL_GUARANTEE, guarantee_formula)

    # -------------------------------------------------------------------------
    # Trade restriction column (NTC/Kicker/Restricted)
    # -------------------------------------------------------------------------
    trade_formula = (
        "=LET("
        + roster_let_prefix()
        + '_xlpm.trade_label,IF(tbl_salary_book_warehouse[is_no_trade]=TRUE,"NTC",'
        + 'IF(tbl_salary_book_warehouse[is_trade_bonus]=TRUE,"Kicker",'
        + 'IF(tbl_salary_book_warehouse[is_trade_restricted_now]=TRUE,"Restricted",""))),'
        + "_xlpm.filtered,FILTER(_xlpm.trade_label,_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_roster_rows) + "),\"\"))"
    )
    worksheet.write_formula(row, COL_TRADE, trade_formula)

    # -------------------------------------------------------------------------
    # Minimum contract label column
    # -------------------------------------------------------------------------
    min_formula = (
        "=LET("
        + roster_let_prefix()
        + '_xlpm.min_label,IF(tbl_salary_book_warehouse[is_min_contract]=TRUE,"MINIMUM",""),' 
        + "_xlpm.filtered,FILTER(_xlpm.min_label,_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_roster_rows) + "),\"\"))"
    )
    worksheet.write_formula(row, COL_MIN_LABEL, min_formula, roster_formats["min_label"])

    # -------------------------------------------------------------------------
    # Salary columns (cap_y0..cap_y5 or tax_y0..tax_y5 or apron_y0..apron_y5)
    # Mode-aware: use SelectedMode to pick the prefix
    # -------------------------------------------------------------------------
    for yi in range(6):
        sal_formula = (
            "=LET("
            + roster_let_prefix()
            + f'_xlpm.year_col,IF(SelectedMode="Cap",tbl_salary_book_warehouse[cap_y{yi}],'
            + f'IF(SelectedMode="Tax",tbl_salary_book_warehouse[tax_y{yi}],'
            + f"tbl_salary_book_warehouse[apron_y{yi}])),"
            + "_xlpm.filtered,FILTER(_xlpm.year_col,_xlpm.filter_cond,\"\"),"
            + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
            + "IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_roster_rows) + "),\"\"))"
        )
        worksheet.write_formula(row, COL_CAP_Y0 + yi, sal_formula, roster_formats["money"])

    # -------------------------------------------------------------------------
    # % of cap column (SelectedYear amount / salary_cap_amount)
    # -------------------------------------------------------------------------
    pct_formula = (
        "=LET("
        + roster_let_prefix()
        + "_xlpm.filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "_xlpm.sorted_amt,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_roster_rows) + "),\"\"),"
        + "_xlpm.cap_limit,SUMIFS(tbl_system_values[salary_cap_amount],tbl_system_values[salary_year],SelectedYear),"
        + 'IF(_xlpm.sorted_amt="","",_xlpm.sorted_amt/_xlpm.cap_limit))'
    )
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
