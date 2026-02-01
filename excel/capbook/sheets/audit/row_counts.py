"""
Row counts reconciliation section.
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
    salary_book_filter_count,
    cap_holds_countifs,
    dead_money_countifs,
)


def write_row_counts_section(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    audit_formats: dict[str, Any],
) -> int:
    """Write the row counts reconciliation section.
    
    Compares warehouse row counts against drilldown table counts.
    
    Returns next row.
    """
    # Section header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "ROW COUNTS",
        audit_formats["section_header"]
    )
    row += 1
    
    # Column headers
    headers = ["Category", "Warehouse", "Drilldown", "Delta", "Status", "Notes"]
    row = write_column_headers(worksheet, row, audit_formats, headers)
    
    # Row count comparisons
    counts = [
        ("Roster contracts", "roster_row_count", salary_book_filter_count(is_two_way=False),
         "Players with selected-year cap > 0, is_two_way=FALSE"),
        ("Two-way contracts", "two_way_row_count", salary_book_filter_count(is_two_way=True),
         "Players with selected-year cap > 0, is_two_way=TRUE"),
        ("FA holds", None, cap_holds_countifs(), "cap_holds_warehouse for year"),
        ("Dead money entries", None, dead_money_countifs(), "dead_money_warehouse for year"),
    ]
    
    for label, warehouse_col, drilldown_formula, note in counts:
        worksheet.write(row, COL_LABEL, label, audit_formats["label_indent"])
        
        # Warehouse value (if available)
        if warehouse_col:
            worksheet.write_formula(
                row, COL_WAREHOUSE, f"={warehouse_sumifs(warehouse_col)}", 
                audit_formats["count"]
            )
        else:
            worksheet.write(row, COL_WAREHOUSE, "—", audit_formats["count"])
        
        # Drilldown count
        worksheet.write_formula(row, COL_DRILLDOWN, f"={drilldown_formula}", audit_formats["count"])
        
        # Delta (only if warehouse column exists)
        if warehouse_col:
            warehouse_cell = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_WAREHOUSE)
            drilldown_cell = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_DRILLDOWN)
            worksheet.write_formula(row, COL_DELTA, f"={drilldown_cell}-{warehouse_cell}", audit_formats["count"])
            
            delta_ref = xlsxwriter.utility.xl_rowcol_to_cell(row, COL_DELTA)
            worksheet.write_formula(row, COL_STATUS, f'=IF({delta_ref}=0,"✓","✗")')
            
            worksheet.conditional_format(row, COL_STATUS, row, COL_STATUS, {
                "type": "text", "criteria": "containing", "value": "✓", "format": audit_formats["status_ok"],
            })
            worksheet.conditional_format(row, COL_STATUS, row, COL_STATUS, {
                "type": "text", "criteria": "containing", "value": "✗", "format": audit_formats["status_fail"],
            })
        else:
            worksheet.write(row, COL_DELTA, "—", audit_formats["count"])
            worksheet.write(row, COL_STATUS, "—", audit_formats["count"])
        
        worksheet.write(row, COL_NOTES, note, audit_formats["note"])
        row += 1
    
    return row + 2
