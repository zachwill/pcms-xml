"""
Apron amount reconciliation section.
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


def write_apron_reconciliation_section(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    audit_formats: dict[str, Any],
) -> int:
    """Write the apron amount reconciliation section.
    
    Similar to cap/tax but uses apron columns.
    
    Returns next row.
    """
    # Section header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "APRON AMOUNT RECONCILIATION",
        audit_formats["section_header"]
    )
    row += 1
    
    # Column headers
    headers = ["Bucket", "Warehouse", "Drilldown", "Delta", "Status", "Source Tables"]
    row = write_column_headers(worksheet, row, audit_formats, headers)
    
    # Apron bucket rows. salary_book_warehouse provides apron_y*, cap_holds_warehouse provides apron_amount,
    # and dead_money_warehouse provides apron_value.
    buckets = [
        ("Roster (ROST)", "apron_rost", salary_book_filter_sum("apron", is_two_way=False),
         "tbl_salary_book_warehouse (selected-year apron; is_two_way=FALSE)"),
        ("Two-Way (2WAY)", "apron_2way", salary_book_filter_sum("apron", is_two_way=True),
         "tbl_salary_book_warehouse (selected-year apron; is_two_way=TRUE)"),
        ("FA Holds (FA)", "apron_fa", cap_holds_sumifs("apron_amount"),
         "tbl_cap_holds_warehouse"),
        ("Dead Money (TERM)", "apron_term", dead_money_sumifs("apron_value"),
         "tbl_dead_money_warehouse"),
    ]
    
    for label, warehouse_col, drilldown_formula, source_note in buckets:
        worksheet.write(row, COL_LABEL, label, audit_formats["label_indent"])
        
        # Warehouse value
        warehouse_formula = f"={warehouse_sumifs(warehouse_col)}"
        worksheet.write_formula(row, COL_WAREHOUSE, warehouse_formula, audit_formats["money"])
        
        # Drilldown sum
        worksheet.write_formula(row, COL_DRILLDOWN, f"={drilldown_formula}", audit_formats["money"])
        
        # Delta = drilldown - warehouse
        warehouse_cell = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_WAREHOUSE)
        drilldown_cell = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_DRILLDOWN)
        delta_formula = f"={drilldown_cell}-{warehouse_cell}"
        worksheet.write_formula(row, COL_DELTA, delta_formula, audit_formats["money"])
        
        # Status
        delta_ref = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_DELTA)
        status_formula = f'=IF(ABS({delta_ref})<1,"✓","✗")'
        worksheet.write_formula(row, COL_STATUS, status_formula)
        
        # Conditional formatting for delta
        worksheet.conditional_format(row, COL_DELTA, row, COL_DELTA, {
            "type": "cell", "criteria": "==", "value": 0, "format": audit_formats["delta_ok"],
        })
        worksheet.conditional_format(row, COL_DELTA, row, COL_DELTA, {
            "type": "cell", "criteria": "!=", "value": 0, "format": audit_formats["delta_fail"],
        })
        
        # Conditional formatting for status
        worksheet.conditional_format(row, COL_STATUS, row, COL_STATUS, {
            "type": "text", "criteria": "containing", "value": "✓", "format": audit_formats["status_ok"],
        })
        worksheet.conditional_format(row, COL_STATUS, row, COL_STATUS, {
            "type": "text", "criteria": "containing", "value": "✗", "format": audit_formats["status_fail"],
        })
        
        worksheet.write(row, COL_NOTES, source_note, audit_formats["note"])
        row += 1
    
    # Total row
    row += 1
    worksheet.write(row, COL_LABEL, "APRON TOTAL", audit_formats["label_bold"])
    worksheet.write_formula(row, COL_WAREHOUSE, f"={warehouse_sumifs('apron_total')}", audit_formats["money_total"])
    
    drilldown_total = (
        f"={salary_book_filter_sum('apron', is_two_way=False)}"
        f"+{salary_book_filter_sum('apron', is_two_way=True)}"
        f"+{cap_holds_sumifs('apron_amount')}"
        f"+{dead_money_sumifs('apron_value')}"
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
