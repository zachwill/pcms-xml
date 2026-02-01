from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ...named_formulas import (
    twoway_col_formula,
    twoway_derived_formula,
    twoway_salary_formula,
)
from .helpers import (
    COL_BUCKET, COL_COUNTS_TOTAL, COL_COUNTS_ROSTER, COL_NAME,
    COL_OPTION, COL_GUARANTEE, COL_TRADE, COL_MIN_LABEL,
    COL_CAP_Y0, COL_PCT_CAP,
    num_twoway_rows,
    _mode_year_label, _write_column_headers,
    _salary_book_sumproduct, _salary_book_countproduct
)


def _write_twoway_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> int:
    """Write the two-way contracts section.

    Uses Excel 365 dynamic array formulas (FILTER, SORTBY, TAKE).
    Same pattern as roster section but filters for is_two_way = TRUE.

    Returns next row.
    """
    section_fmt = roster_formats["section_header"]

    # Section header
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "TWO-WAY CONTRACTS", section_fmt)
    row += 1

    # Column headers - mode-aware year labels
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
    name_formula = twoway_col_formula("tbl_salary_book_warehouse[player_name]", num_twoway_rows)
    worksheet.write_formula(row, COL_NAME, name_formula)

    # -------------------------------------------------------------------------
    # Bucket column (2WAY for non-empty)
    # -------------------------------------------------------------------------
    bucket_formula = twoway_derived_formula(
        "tbl_salary_book_warehouse[player_name]", 'IF({result}<>"","2WAY","")', num_twoway_rows
    )
    worksheet.write_formula(row, COL_BUCKET, bucket_formula, roster_formats["bucket_2way"])

    # -------------------------------------------------------------------------
    # CountsTowardTotal (Y for 2WAY)
    # -------------------------------------------------------------------------
    ct_total_formula = twoway_derived_formula(
        "tbl_salary_book_warehouse[player_name]", 'IF({result}<>"","Y","")', num_twoway_rows
    )
    worksheet.write_formula(row, COL_COUNTS_TOTAL, ct_total_formula, roster_formats["counts_yes"])

    # -------------------------------------------------------------------------
    # CountsTowardRoster (N for 2WAY)
    # -------------------------------------------------------------------------
    ct_roster_formula = twoway_derived_formula(
        "tbl_salary_book_warehouse[player_name]", 'IF({result}<>"","N","")', num_twoway_rows
    )
    worksheet.write_formula(row, COL_COUNTS_ROSTER, ct_roster_formula, roster_formats["counts_no"])

    # -------------------------------------------------------------------------
    # Salary columns
    # -------------------------------------------------------------------------
    for yi in range(6):
        sal_formula = twoway_salary_formula(yi, num_twoway_rows)
        worksheet.write_formula(row, COL_CAP_Y0 + yi, sal_formula, roster_formats["money"])

    # Move past spill zone
    row += num_twoway_rows

    # Subtotal row
    worksheet.write(row, COL_NAME, "Two-Way Subtotal:", roster_formats["subtotal_label"])
    worksheet.write_formula(
        row,
        COL_CAP_Y0,
        f"={_salary_book_sumproduct(is_two_way='TRUE')}",
        roster_formats["subtotal"],
    )
    worksheet.write_formula(
        row,
        COL_BUCKET,
        f"={_salary_book_countproduct('TRUE')}",
        roster_formats["subtotal_label"],
    )

    row += 2  # Blank row

    return row
