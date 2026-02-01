"""
Audit sheet formats.

Shared format definitions used across audit reconciliation sections.
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook

from ...xlsx import FMT_MONEY


# =============================================================================
# Layout Constants
# =============================================================================

COL_LABEL = 0
COL_WAREHOUSE = 1  # Authoritative (warehouse) value
COL_DRILLDOWN = 2  # Calculated from drilldown tables
COL_DELTA = 3      # Difference
COL_STATUS = 4     # Status indicator (✓ / ✗)
COL_NOTES = 5      # Notes/context

# Column widths
COLUMN_WIDTHS = {
    COL_LABEL: 32,
    COL_WAREHOUSE: 16,
    COL_DRILLDOWN: 16,
    COL_DELTA: 14,
    COL_STATUS: 10,
    COL_NOTES: 40,
}


# =============================================================================
# Format Helpers
# =============================================================================

def create_audit_formats(workbook: Workbook) -> dict[str, Any]:
    """Create formats specific to the audit sheet."""
    formats = {}
    
    # Section headers
    formats["section_header"] = workbook.add_format({
        "bold": True,
        "font_size": 11,
        "bg_color": "#1E3A5F",  # Dark blue
        "font_color": "#FFFFFF",
        "bottom": 2,
    })
    
    # Subsection headers
    formats["subsection_header"] = workbook.add_format({
        "bold": True,
        "font_size": 10,
        "bg_color": "#E5E7EB",  # gray-200
        "bottom": 1,
    })
    
    # Column headers
    formats["col_header"] = workbook.add_format({
        "bold": True,
        "font_size": 9,
        "bg_color": "#F3F4F6",  # gray-100
        "align": "center",
        "bottom": 1,
    })
    
    # Row labels
    formats["label"] = workbook.add_format({"font_size": 10})
    formats["label_indent"] = workbook.add_format({"font_size": 10, "indent": 1})
    formats["label_bold"] = workbook.add_format({"bold": True, "font_size": 10})
    
    # Money formats
    formats["money"] = workbook.add_format({"num_format": FMT_MONEY})
    formats["money_bold"] = workbook.add_format({"num_format": FMT_MONEY, "bold": True})
    formats["money_total"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "bold": True,
        "top": 1,
        "bottom": 2,
        "bg_color": "#F3F4F6",
    })
    
    # Count format (for row counts)
    formats["count"] = workbook.add_format({"align": "center"})
    formats["count_bold"] = workbook.add_format({"align": "center", "bold": True})
    
    # Delta formats
    formats["delta_ok"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "bg_color": "#D1FAE5",  # green-100
        "font_color": "#065F46",  # green-800
    })
    formats["delta_fail"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "bg_color": "#FEE2E2",  # red-100
        "font_color": "#991B1B",  # red-800
        "bold": True,
    })
    
    # Status indicators
    formats["status_ok"] = workbook.add_format({
        "align": "center",
        "font_color": "#065F46",
        "bold": True,
    })
    formats["status_fail"] = workbook.add_format({
        "align": "center",
        "font_color": "#991B1B",
        "bold": True,
    })
    
    # Notes
    formats["note"] = workbook.add_format({
        "font_size": 9,
        "font_color": "#6B7280",
        "italic": True,
    })
    
    # Summary box formats
    formats["summary_pass"] = workbook.add_format({
        "bold": True,
        "font_size": 11,
        "bg_color": "#D1FAE5",
        "font_color": "#065F46",
        "align": "center",
        "valign": "vcenter",
        "border": 2,
        "border_color": "#065F46",
    })
    formats["summary_fail"] = workbook.add_format({
        "bold": True,
        "font_size": 11,
        "bg_color": "#FEE2E2",
        "font_color": "#991B1B",
        "align": "center",
        "valign": "vcenter",
        "border": 2,
        "border_color": "#991B1B",
    })
    
    return formats


def write_column_headers(
    worksheet,
    row: int,
    formats: dict[str, Any],
    headers: list[str],
) -> int:
    """Write column headers.
    
    Returns next row.
    """
    fmt = formats["col_header"]
    for col, header in enumerate(headers):
        worksheet.write(row, col, header, fmt)
    return row + 1
