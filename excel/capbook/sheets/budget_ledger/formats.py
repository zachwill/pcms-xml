"""
Format definitions for the BUDGET_LEDGER sheet.
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook

from ...xlsx import FMT_MONEY


def create_budget_formats(workbook: Workbook) -> dict[str, Any]:
    """Create formats specific to the budget ledger."""
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
    formats["label"] = workbook.add_format({
        "font_size": 10,
    })
    formats["label_indent"] = workbook.add_format({
        "font_size": 10,
        "indent": 1,
    })
    formats["label_bold"] = workbook.add_format({
        "bold": True,
        "font_size": 10,
    })
    
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
    
    # Delta formats (for plan adjustments)
    formats["delta_zero"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "font_color": "#9CA3AF",  # gray-400 (muted)
        "italic": True,
    })
    formats["delta_positive"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "font_color": "#DC2626",  # red-600 (increasing cost)
    })
    formats["delta_negative"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "font_color": "#059669",  # green-600 (savings)
    })
    
    # Threshold context
    formats["threshold_label"] = workbook.add_format({
        "font_size": 9,
        "font_color": "#6B7280",  # gray-500
        "italic": True,
    })
    formats["threshold_value"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "font_size": 9,
        "font_color": "#6B7280",
    })
    
    # Room/Over indicators
    formats["room_positive"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "font_color": "#059669",  # green-600
        "bold": True,
    })
    formats["room_negative"] = workbook.add_format({
        "num_format": FMT_MONEY,
        "font_color": "#DC2626",  # red-600
        "bold": True,
    })
    
    # Verification section
    formats["verify_ok"] = workbook.add_format({
        "bg_color": "#D1FAE5",  # green-100
        "font_color": "#065F46",  # green-800
        "bold": True,
    })
    formats["verify_fail"] = workbook.add_format({
        "bg_color": "#FEE2E2",  # red-100
        "font_color": "#991B1B",  # red-800
        "bold": True,
    })
    
    # Notes
    formats["note"] = workbook.add_format({
        "font_size": 9,
        "font_color": "#6B7280",
        "italic": True,
    })
    
    return formats
