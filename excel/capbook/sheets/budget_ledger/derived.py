"""
Derived section writer for BUDGET_LEDGER.

Writes derived totals (snapshot + plan + policy) and room/over analysis.
"""

from __future__ import annotations

from typing import Any

import xlsxwriter.utility

from xlsxwriter.worksheet import Worksheet

from .constants import COL_LABEL, COL_CAP, COL_TAX, COL_APRON, COL_NOTES
from .helpers import system_sumifs, write_column_headers


def write_derived_section(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    budget_formats: dict[str, Any],
    snapshot_total_row: int,
    plan_delta_total_row: int,
    policy_delta_total_row: int,
) -> tuple[int, int]:
    """Write the derived totals section (snapshot + plan deltas + policy deltas).
    
    This shows the "if you execute this plan with these assumptions" state.
    
    Returns (next_row, derived_total_row).
    """
    # Section header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "DERIVED TOTALS (Snapshot + Plan + Policy)",
        budget_formats["section_header"]
    )
    row += 1
    
    # Column headers
    row = write_column_headers(worksheet, row, budget_formats)
    
    # Derived total = snapshot + plan delta + policy delta
    snapshot_cap = xlsxwriter.utility.xl_rowcol_to_cell(snapshot_total_row, COL_CAP)
    snapshot_tax = xlsxwriter.utility.xl_rowcol_to_cell(snapshot_total_row, COL_TAX)
    snapshot_apron = xlsxwriter.utility.xl_rowcol_to_cell(snapshot_total_row, COL_APRON)
    
    plan_cap = xlsxwriter.utility.xl_rowcol_to_cell(plan_delta_total_row, COL_CAP)
    plan_tax = xlsxwriter.utility.xl_rowcol_to_cell(plan_delta_total_row, COL_TAX)
    plan_apron = xlsxwriter.utility.xl_rowcol_to_cell(plan_delta_total_row, COL_APRON)
    
    policy_cap = xlsxwriter.utility.xl_rowcol_to_cell(policy_delta_total_row, COL_CAP)
    policy_tax = xlsxwriter.utility.xl_rowcol_to_cell(policy_delta_total_row, COL_TAX)
    policy_apron = xlsxwriter.utility.xl_rowcol_to_cell(policy_delta_total_row, COL_APRON)
    
    worksheet.write(row, COL_LABEL, "DERIVED TOTAL", budget_formats["label_bold"])
    worksheet.write_formula(row, COL_CAP, f"={snapshot_cap}+{plan_cap}+{policy_cap}", budget_formats["money_total"])
    worksheet.write_formula(row, COL_TAX, f"={snapshot_tax}+{plan_tax}+{policy_tax}", budget_formats["money_total"])
    worksheet.write_formula(row, COL_APRON, f"={snapshot_apron}+{plan_apron}+{policy_apron}", budget_formats["money_total"])
    worksheet.write(row, COL_NOTES, "Projected total: Snapshot + Plan + Policy assumptions", budget_formats["note"])
    
    derived_total_row = row
    row += 2
    
    # Room calculations
    worksheet.write(row, COL_LABEL, "Room/Over Analysis:", budget_formats["subsection_header"])
    worksheet.merge_range(row, COL_LABEL, row, COL_NOTES, "Room/Over Analysis:", budget_formats["subsection_header"])
    row += 1
    
    derived_cap_cell = xlsxwriter.utility.xl_rowcol_to_cell(derived_total_row, COL_CAP)
    derived_tax_cell = xlsxwriter.utility.xl_rowcol_to_cell(derived_total_row, COL_TAX)
    derived_apron_cell = xlsxwriter.utility.xl_rowcol_to_cell(derived_total_row, COL_APRON)
    
    # Cap room
    worksheet.write(row, COL_LABEL, "Cap Room (+) / Over Cap (-)", budget_formats["label_indent"])
    cap_room_formula = f"={system_sumifs('salary_cap_amount')}-{derived_cap_cell}"
    worksheet.write_formula(row, COL_CAP, cap_room_formula, budget_formats["money"])
    worksheet.write(row, COL_NOTES, "Positive = room; Negative = over cap", budget_formats["note"])
    
    # Conditional formatting for room
    worksheet.conditional_format(row, COL_CAP, row, COL_CAP, {
        "type": "cell",
        "criteria": ">=",
        "value": 0,
        "format": budget_formats["room_positive"],
    })
    worksheet.conditional_format(row, COL_CAP, row, COL_CAP, {
        "type": "cell",
        "criteria": "<",
        "value": 0,
        "format": budget_formats["room_negative"],
    })
    row += 1
    
    # Tax room
    worksheet.write(row, COL_LABEL, "Room Under Tax Line", budget_formats["label_indent"])
    tax_room_formula = f"={system_sumifs('tax_level_amount')}-{derived_tax_cell}"
    worksheet.write_formula(row, COL_TAX, tax_room_formula, budget_formats["money"])
    worksheet.write(row, COL_NOTES, "Positive = not taxpayer; Negative = over tax", budget_formats["note"])
    
    worksheet.conditional_format(row, COL_TAX, row, COL_TAX, {
        "type": "cell",
        "criteria": ">=",
        "value": 0,
        "format": budget_formats["room_positive"],
    })
    worksheet.conditional_format(row, COL_TAX, row, COL_TAX, {
        "type": "cell",
        "criteria": "<",
        "value": 0,
        "format": budget_formats["room_negative"],
    })
    row += 1
    
    # First apron room
    worksheet.write(row, COL_LABEL, "Room Under First Apron", budget_formats["label_indent"])
    apron1_room_formula = f"={system_sumifs('tax_apron_amount')}-{derived_apron_cell}"
    worksheet.write_formula(row, COL_APRON, apron1_room_formula, budget_formats["money"])
    worksheet.write(row, COL_NOTES, "Positive = below apron; Negative = over apron", budget_formats["note"])
    
    worksheet.conditional_format(row, COL_APRON, row, COL_APRON, {
        "type": "cell",
        "criteria": ">=",
        "value": 0,
        "format": budget_formats["room_positive"],
    })
    worksheet.conditional_format(row, COL_APRON, row, COL_APRON, {
        "type": "cell",
        "criteria": "<",
        "value": 0,
        "format": budget_formats["room_negative"],
    })
    row += 1
    
    # Second apron room
    worksheet.write(row, COL_LABEL, "Room Under Second Apron", budget_formats["label_indent"])
    apron2_room_formula = f"={system_sumifs('tax_apron2_amount')}-{derived_apron_cell}"
    worksheet.write_formula(row, COL_APRON, apron2_room_formula, budget_formats["money"])
    worksheet.write(row, COL_NOTES, "Positive = below apron 2; Negative = over", budget_formats["note"])
    
    worksheet.conditional_format(row, COL_APRON, row, COL_APRON, {
        "type": "cell",
        "criteria": ">=",
        "value": 0,
        "format": budget_formats["room_positive"],
    })
    worksheet.conditional_format(row, COL_APRON, row, COL_APRON, {
        "type": "cell",
        "criteria": "<",
        "value": 0,
        "format": budget_formats["room_negative"],
    })
    row += 2
    
    return row, derived_total_row
