from __future__ import annotations

from typing import Any

import xlsxwriter.utility

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from .helpers import (
    COL_BUCKET, COL_NAME, COL_CAP_Y0, COL_CAP_Y1, COL_CAP_Y2, COL_PCT_CAP,
    _salary_book_sumproduct
)


def _write_reconciliation_block(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> int:
    """Write the reconciliation block comparing grid sums to warehouse totals.

    This is the critical section that proves the ledger is trustworthy.
    Reconciliation is mode-aware: compares cap/tax/apron based on SelectedMode.

    Returns next row.
    """
    reconcile_header = roster_formats["reconcile_header"]
    label_fmt = roster_formats["reconcile_label"]
    value_fmt = roster_formats["reconcile_value"]

    # Section header - mode-aware
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "", reconcile_header)
    worksheet.write_formula(
        row, COL_BUCKET,
        '="RECONCILIATION ("&SelectedMode&" mode vs DATA_team_salary_warehouse)"',
        reconcile_header
    )
    row += 1
    row += 1  # Blank row

    # Column labels
    worksheet.write(row, COL_NAME, "", label_fmt)
    worksheet.write(row, COL_CAP_Y0, "Grid Sum", roster_formats["col_header"])
    worksheet.write(row, COL_CAP_Y1, "Warehouse", roster_formats["col_header"])
    worksheet.write(row, COL_CAP_Y2, "Delta", roster_formats["col_header"])
    row += 1

    # Define the bucket comparisons - mode-aware
    # Grid formulas use _salary_book_sumproduct which is already mode-aware
    # Warehouse lookups need to use the mode-appropriate column

    # Mode-aware SUMIFS helper for cap_holds
    cap_holds_mode_sumif = (
        'IF(SelectedMode="Cap",'
        'SUMIFS(tbl_cap_holds_warehouse[cap_amount],tbl_cap_holds_warehouse[team_code],SelectedTeam,tbl_cap_holds_warehouse[salary_year],SelectedYear),'
        'IF(SelectedMode="Tax",'
        'SUMIFS(tbl_cap_holds_warehouse[tax_amount],tbl_cap_holds_warehouse[team_code],SelectedTeam,tbl_cap_holds_warehouse[salary_year],SelectedYear),'
        'SUMIFS(tbl_cap_holds_warehouse[apron_amount],tbl_cap_holds_warehouse[team_code],SelectedTeam,tbl_cap_holds_warehouse[salary_year],SelectedYear)))'
    )

    # Mode-aware SUMIFS helper for dead_money
    dead_money_mode_sumif = (
        'IF(SelectedMode="Cap",'
        'SUMIFS(tbl_dead_money_warehouse[cap_value],tbl_dead_money_warehouse[team_code],SelectedTeam,tbl_dead_money_warehouse[salary_year],SelectedYear),'
        'IF(SelectedMode="Tax",'
        'SUMIFS(tbl_dead_money_warehouse[tax_value],tbl_dead_money_warehouse[team_code],SelectedTeam,tbl_dead_money_warehouse[salary_year],SelectedYear),'
        'SUMIFS(tbl_dead_money_warehouse[apron_value],tbl_dead_money_warehouse[team_code],SelectedTeam,tbl_dead_money_warehouse[salary_year],SelectedYear)))'
    )

    # Mode-aware warehouse bucket column lookup
    # For each bucket, we pick cap_*/tax_*/apron_* based on SelectedMode
    def warehouse_bucket_formula(bucket: str) -> str:
        """Generate mode-aware SUMIFS for a warehouse bucket."""
        return (
            f'IF(SelectedMode="Cap",'
            f'SUMIFS(tbl_team_salary_warehouse[cap_{bucket}],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear),'
            f'IF(SelectedMode="Tax",'
            f'SUMIFS(tbl_team_salary_warehouse[tax_{bucket}],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear),'
            f'SUMIFS(tbl_team_salary_warehouse[apron_{bucket}],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear)))'
        )

    buckets = [
        (
            "Roster (ROST)",
            "rost",
            _salary_book_sumproduct(is_two_way="FALSE"),
        ),
        (
            "Two-Way (2WAY)",
            "2way",
            _salary_book_sumproduct(is_two_way="TRUE"),
        ),
        (
            "Holds (FA)",
            "fa",
            cap_holds_mode_sumif,
        ),
        (
            "Dead Money (TERM)",
            "term",
            dead_money_mode_sumif,
        ),
    ]

    for label, bucket_suffix, grid_formula in buckets:
        worksheet.write(row, COL_NAME, label, label_fmt)

        # Grid sum (from our formulas above - already mode-aware)
        grid_cell = f"={grid_formula}"
        worksheet.write_formula(row, COL_CAP_Y0, grid_cell, value_fmt)

        # Warehouse value - mode-aware bucket lookup
        warehouse_formula = f"={warehouse_bucket_formula(bucket_suffix)}"
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
    worksheet.write(row, COL_NAME, "TOTAL SALARY:", roster_formats["subtotal_label"])

    # Grid total = SUM(Grid Sum column)
    grid_sum_range = f"{xlsxwriter.utility.xl_rowcol_to_cell(row - len(buckets) - 1, COL_CAP_Y0)}:{xlsxwriter.utility.xl_rowcol_to_cell(row - 2, COL_CAP_Y0)}"
    worksheet.write_formula(row, COL_CAP_Y0, f"=SUM({grid_sum_range})", roster_formats["subtotal"])

    # Warehouse total - mode-aware lookup for cap_total/tax_total/apron_total
    # (These are the authoritative headline totals per the data contract.)
    total_warehouse_formula = (
        'IF(SelectedMode="Cap",'
        'SUMIFS(tbl_team_salary_warehouse[cap_total],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear),'
        'IF(SelectedMode="Tax",'
        'SUMIFS(tbl_team_salary_warehouse[tax_total],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear),'
        'SUMIFS(tbl_team_salary_warehouse[apron_total],tbl_team_salary_warehouse[team_code],SelectedTeam,tbl_team_salary_warehouse[salary_year],SelectedYear)))'
    )
    worksheet.write_formula(row, COL_CAP_Y1, f"={total_warehouse_formula}", roster_formats["subtotal"])

    # Delta (grid - warehouse)
    delta_cell_grid = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_CAP_Y0)
    delta_cell_warehouse = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_CAP_Y1)
    delta_formula = f"={delta_cell_grid}-{delta_cell_warehouse}"
    worksheet.write_formula(row, COL_CAP_Y2, delta_formula, roster_formats["subtotal"])

    # Conditional formatting for total delta
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

    return row
