from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from .helpers import (
    COL_BUCKET, COL_COUNTS_TOTAL, COL_COUNTS_ROSTER, COL_NAME,
    COL_CAP_Y0, COL_PCT_CAP,
    num_hold_rows,
    _mode_year_label, _write_column_headers,
    cap_holds_let_prefix
)


def _write_cap_holds_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> int:
    """Write the cap holds section (from tbl_cap_holds_warehouse).

    Returns next row.
    """
    section_fmt = roster_formats["section_header"]

    # Section header
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "CAP HOLDS (Free Agent Rights)", section_fmt)
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
        + cap_holds_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_cap_holds_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_hold_rows) + "),\"\"))"
    )
    worksheet.write_formula(row, COL_NAME, name_formula)

    # -------------------------------------------------------------------------
    # Bucket column (FA)
    # -------------------------------------------------------------------------
    bucket_formula = (
        "=LET("
        + cap_holds_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_cap_holds_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_hold_rows) + "),\"\"),"
        + 'IF(_xlpm.names<>"","FA",""))'
    )
    worksheet.write_formula(row, COL_BUCKET, bucket_formula, roster_formats["bucket_fa"])

    # -------------------------------------------------------------------------
    # CountsTowardTotal (Y for FA)
    # -------------------------------------------------------------------------
    ct_total_formula = (
        "=LET("
        + cap_holds_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_cap_holds_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_hold_rows) + "),\"\"),"
        + 'IF(_xlpm.names<>"","Y",""))'
    )
    worksheet.write_formula(row, COL_COUNTS_TOTAL, ct_total_formula, roster_formats["counts_yes"])

    # -------------------------------------------------------------------------
    # CountsTowardRoster (N for FA)
    # -------------------------------------------------------------------------
    ct_roster_formula = (
        "=LET("
        + cap_holds_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_cap_holds_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
        + "_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_hold_rows) + "),\"\"),"
        + 'IF(_xlpm.names<>"","N",""))'
    )
    worksheet.write_formula(row, COL_COUNTS_ROSTER, ct_roster_formula, roster_formats["counts_no"])

    # -------------------------------------------------------------------------
    # Salary columns (cap holds only have cap_y* but we display in all modes)
    # -------------------------------------------------------------------------
    for yi in range(6):
        sal_formula = (
            "=LET("
            + cap_holds_let_prefix()
            + f"_xlpm.year_col,tbl_cap_holds_warehouse[cap_y{yi}],"
            + "_xlpm.filtered,FILTER(_xlpm.year_col,_xlpm.filter_cond,\"\"),"
            + "_xlpm.sorted_filtered,FILTER(_xlpm.mode_amt,_xlpm.filter_cond,0),"
            + "IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sorted_filtered,-1)," + str(num_hold_rows) + "),\"\"))"
        )
        worksheet.write_formula(row, COL_CAP_Y0 + yi, sal_formula, roster_formats["money"])

    # Move past spill zone
    row += num_hold_rows

    # Subtotal row
    worksheet.write(row, COL_NAME, "Cap Holds Subtotal:", roster_formats["subtotal_label"])
    
    cap_choose = ",".join(f"tbl_cap_holds_warehouse[cap_y{i}]" for i in range(6))
    mode_amt = f"CHOOSE(SelectedYear-MetaBaseYear+1,{cap_choose})"
    sum_formula = f"=SUMPRODUCT((tbl_cap_holds_warehouse[team_code]=SelectedTeam)*({mode_amt}))"
    
    worksheet.write_formula(row, COL_CAP_Y0, sum_formula, roster_formats["subtotal"])

    row += 2  # Blank row

    return row
