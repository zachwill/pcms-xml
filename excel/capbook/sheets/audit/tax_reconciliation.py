"""
Tax amount reconciliation section.
"""

from __future__ import annotations

from typing import Any

import xlsxwriter.utility

from xlsxwriter.worksheet import Worksheet

from .formats import (
    COL_LABEL,
    COL_WAREHOUSE,
    COL_DRILLDOWN,
    COL_DELTA,
    COL_STATUS,
    COL_NOTES,
    write_column_headers,
)
from .helpers import (
    warehouse_sumifs,
    salary_book_filter_sum,
    cap_holds_sumifs,
    dead_money_sumifs,
)


def write_tax_reconciliation_section(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    audit_formats: dict[str, Any],
) -> int:
    """Write the tax amount reconciliation section.
    
    Similar to cap but uses tax columns.
    
    Returns next row.
    """
    # Section header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "TAX AMOUNT RECONCILIATION",
        audit_formats["section_header"]
    )
    row += 1
    
    # Column headers
    headers = ["Bucket", "Warehouse", "Drilldown", "Delta", "Status", "Notes"]
    row = write_column_headers(worksheet, row, audit_formats, headers)
    
    # Tax bucket rows. salary_book_warehouse provides tax_y*, cap_holds_warehouse provides tax_amount,
    # and dead_money_warehouse provides tax_value.
    buckets = [
        ("Roster (ROST)", "tax_rost", salary_book_filter_sum("tax", is_two_way=False)),
        ("Two-Way (2WAY)", "tax_2way", salary_book_filter_sum("tax", is_two_way=True)),
        ("FA Holds (FA)", "tax_fa", cap_holds_sumifs("tax_amount")),
        ("Dead Money (TERM)", "tax_term", dead_money_sumifs("tax_value")),
    ]
    
    for label, warehouse_col, drilldown_formula in buckets:
        worksheet.write(row, COL_LABEL, label, audit_formats["label_indent"])
        worksheet.write_formula(row, COL_WAREHOUSE, f"={warehouse_sumifs(warehouse_col)}", audit_formats["money"])
        worksheet.write_formula(row, COL_DRILLDOWN, f"={drilldown_formula}", audit_formats["money"])
        
        warehouse_cell = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_WAREHOUSE)
        drilldown_cell = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_DRILLDOWN)
        worksheet.write_formula(row, COL_DELTA, f"={drilldown_cell}-{warehouse_cell}", audit_formats["money"])
        
        delta_ref = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_DELTA)
        worksheet.write_formula(row, COL_STATUS, f'=IF(ABS({delta_ref})<1,"✓","✗")')
        
        worksheet.conditional_format(row, COL_DELTA, row, COL_DELTA, {
            "type": "cell", "criteria": "==", "value": 0, "format": audit_formats["delta_ok"],
        })
        worksheet.conditional_format(row, COL_DELTA, row, COL_DELTA, {
            "type": "cell", "criteria": "!=", "value": 0, "format": audit_formats["delta_fail"],
        })
        worksheet.conditional_format(row, COL_STATUS, row, COL_STATUS, {
            "type": "text", "criteria": "containing", "value": "✓", "format": audit_formats["status_ok"],
        })
        worksheet.conditional_format(row, COL_STATUS, row, COL_STATUS, {
            "type": "text", "criteria": "containing", "value": "✗", "format": audit_formats["status_fail"],
        })
        
        row += 1
    
    # Total row
    row += 1
    worksheet.write(row, COL_LABEL, "TAX TOTAL", audit_formats["label_bold"])
    worksheet.write_formula(row, COL_WAREHOUSE, f"={warehouse_sumifs('tax_total')}", audit_formats["money_total"])
    
    drilldown_total = (
        f"={salary_book_filter_sum('tax', is_two_way=False)}"
        f"+{salary_book_filter_sum('tax', is_two_way=True)}"
        f"+{cap_holds_sumifs('tax_amount')}"
        f"+{dead_money_sumifs('tax_value')}"
    )
    worksheet.write_formula(row, COL_DRILLDOWN, drilldown_total, audit_formats["money_total"])
    
    warehouse_cell = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_WAREHOUSE)
    drilldown_cell = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_DRILLDOWN)
    worksheet.write_formula(row, COL_DELTA, f"={drilldown_cell}-{warehouse_cell}", audit_formats["money_total"])
    
    delta_ref = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_DELTA)
    worksheet.write_formula(row, COL_STATUS, f'=IF(ABS({delta_ref})<1,"✓","✗")')
    
    worksheet.conditional_format(row, COL_DELTA, row, COL_DELTA, {
        "type": "cell", "criteria": "==", "value": 0, "format": audit_formats["delta_ok"],
    })
    worksheet.conditional_format(row, COL_DELTA, row, COL_DELTA, {
        "type": "cell", "criteria": "!=", "value": 0, "format": audit_formats["delta_fail"],
    })
    worksheet.conditional_format(row, COL_STATUS, row, COL_STATUS, {
        "type": "text", "criteria": "containing", "value": "✓", "format": audit_formats["status_ok"],
    })
    worksheet.conditional_format(row, COL_STATUS, row, COL_STATUS, {
        "type": "text", "criteria": "containing", "value": "✗", "format": audit_formats["status_fail"],
    })
    
    return row + 2
