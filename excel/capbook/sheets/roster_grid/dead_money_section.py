from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from .helpers import (
    COL_BUCKET, COL_COUNTS_TOTAL, COL_COUNTS_ROSTER, COL_NAME,
    COL_CAP_Y0, COL_PCT_CAP,
    num_dead_rows,
    _mode_year_label, _write_column_headers,
    dead_money_let_prefix
)


def _write_dead_money_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> int:
    """Write the dead money section (from tbl_dead_money_warehouse).

    Returns next row.
    """
    section_fmt = roster_formats["section_header"]

    # Section header
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "DEAD MONEY (Terminated Contracts)", section_fmt)
    row += 1

    # Column headers
    year_labels = [
        _mode_year_label(0),
        _mode_year_label(1),
        _mode_year_label(2),
        _mode_year_label(3),
        _mode_year_label(4),
        _mode_year_label(5),
    ]
    row = _write_column_headers(worksheet, row, roster_formats, year_labels)

    # -------------------------------------------------------------------------
    # Player Name column
    # -------------------------------------------------------------------------
    name_formula = (
        "=LET("
        + dead_money_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_dead_money_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_dead_rows) + "),\"\"))"
    )
    worksheet.write_formula(row, COL_NAME, name_formula)

    # -------------------------------------------------------------------------
    # Bucket column (TERM)
    # -------------------------------------------------------------------------
    bucket_formula = (
        "=LET("
        + dead_money_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_dead_money_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_dead_rows) + "),\"\"),"
        + 'IF(_xlpm.names<>"","TERM",""))'
    )
    worksheet.write_formula(row, COL_BUCKET, bucket_formula, roster_formats["bucket_term"])

    # -------------------------------------------------------------------------
    # CountsTowardTotal (Y for TERM)
    # -------------------------------------------------------------------------
    ct_total_formula = (
        "=LET("
        + dead_money_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_dead_money_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_dead_rows) + "),\"\"),"
        + 'IF(_xlpm.names<>"","Y",""))'
    )
    worksheet.write_formula(row, COL_COUNTS_TOTAL, ct_total_formula, roster_formats["counts_yes"])

    # -------------------------------------------------------------------------
    # CountsTowardRoster (N for TERM)
    # -------------------------------------------------------------------------
    ct_roster_formula = (
        "=LET("
        + dead_money_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_dead_money_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_dead_rows) + "),\"\"),"
        + 'IF(_xlpm.names<>"","N",""))'
    )
    worksheet.write_formula(row, COL_COUNTS_ROSTER, ct_roster_formula, roster_formats["counts_no"])

    # -------------------------------------------------------------------------
    # Salary columns
    # -------------------------------------------------------------------------
    for yi in range(6):
        sal_formula = (
            "=LET("
            + dead_money_let_prefix()
            + f"_xlpm.year_col,tbl_dead_money_warehouse[cap_y{yi}],"
            + "_xlpm.filtered,FILTER(_xlpm.year_col,_xlpm.filter_cond,\"\"),"
            + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
            + "IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_dead_rows) + "),\"\"))"
        )
        worksheet.write_formula(row, COL_CAP_Y0 + yi, sal_formula, roster_formats["money"])

    # Move past spill zone
    row += num_dead_rows

    # Subtotal row
    worksheet.write(row, COL_NAME, "Dead Money Subtotal:", roster_formats["subtotal_label"])
    
    cap_choose = ",".join(f"tbl_dead_money_warehouse[cap_y{i}]" for i in range(6))
    mode_amt = f"CHOOSE(SelectedYear-MetaBaseYear+1,{cap_choose})"
    sum_formula = f"=SUMPRODUCT((tbl_dead_money_warehouse[team_code]=SelectedTeam)*({mode_amt}))"
    
    worksheet.write_formula(row, COL_CAP_Y0, sum_formula, roster_formats["subtotal"])

    row += 2  # Blank row

    return row
