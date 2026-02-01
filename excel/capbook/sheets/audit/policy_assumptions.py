"""
Policy assumptions section + summary banner + notes.
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.worksheet import Worksheet

from .formats import (
    COL_LABEL,
    COL_WAREHOUSE,
    COL_DRILLDOWN,
    COL_DELTA,
    COL_STATUS,
    COL_NOTES,
)
from .helpers import (
    salary_book_filter_sum,
    salary_book_filter_count,
    cap_holds_sumifs,
    dead_money_sumifs,
    warehouse_sumifs,
)


def write_summary_banner(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    audit_formats: dict[str, Any],
) -> int:
    """Write the top-level reconciliation summary banner.
    
    This shows at-a-glance whether the workbook is reconciled.
    
    PASS iff all three total deltas (cap/tax/apron) are zero (tolerance < 1).
    FAIL message names which totals are mismatched and shows deltas.
    
    Returns next row.
    """
    # We'll create a merged cell that shows overall status
    # The formula checks if ALL three (cap/tax/apron) bucket deltas are zero
    
    # Calculate CAP delta = drilldown - warehouse
    cap_drilldown = (
        f"({salary_book_filter_sum('cap', is_two_way=False)})"
        f"+({salary_book_filter_sum('cap', is_two_way=True)})"
        f"+({cap_holds_sumifs('cap_amount')})"
        f"+({dead_money_sumifs('cap_value')})"
    )
    cap_warehouse = warehouse_sumifs('cap_total')
    cap_delta = f"({cap_drilldown}-{cap_warehouse})"
    
    # Calculate TAX delta = drilldown - warehouse
    tax_drilldown = (
        f"({salary_book_filter_sum('tax', is_two_way=False)})"
        f"+({salary_book_filter_sum('tax', is_two_way=True)})"
        f"+({cap_holds_sumifs('tax_amount')})"
        f"+({dead_money_sumifs('tax_value')})"
    )
    tax_warehouse = warehouse_sumifs('tax_total')
    tax_delta = f"({tax_drilldown}-{tax_warehouse})"
    
    # Calculate APRON delta = drilldown - warehouse
    apron_drilldown = (
        f"({salary_book_filter_sum('apron', is_two_way=False)})"
        f"+({salary_book_filter_sum('apron', is_two_way=True)})"
        f"+({cap_holds_sumifs('apron_amount')})"
        f"+({dead_money_sumifs('apron_value')})"
    )
    apron_warehouse = warehouse_sumifs('apron_total')
    apron_delta = f"({apron_drilldown}-{apron_warehouse})"
    
    # Check if each is within tolerance
    cap_ok = f"(ABS{cap_delta}<1)"
    tax_ok = f"(ABS{tax_delta}<1)"
    apron_ok = f"(ABS{apron_delta}<1)"
    all_ok = f"AND({cap_ok},{tax_ok},{apron_ok})"
    
    # Build mismatch detail string showing which sections failed and their deltas
    # Format: "Cap: $X, Tax: $Y, Apron: $Z" for any that mismatch
    mismatch_parts = (
        f'IF(NOT({cap_ok}),"Cap: $"&TEXT(ABS{cap_delta},"#,##0")&" ","")'
        f'&IF(NOT({tax_ok}),"Tax: $"&TEXT(ABS{tax_delta},"#,##0")&" ","")'
        f'&IF(NOT({apron_ok}),"Apron: $"&TEXT(ABS{apron_delta},"#,##0"),"")'
    )
    
    status_formula = (
        f'=IF({all_ok},'
        f'"✓ RECONCILED — All drilldown sums match warehouse totals (Cap/Tax/Apron)",'
        f'"✗ MISMATCH — "&TRIM({mismatch_parts}))'
    )
    
    worksheet.merge_range(row, COL_LABEL, row, COL_NOTES, "", audit_formats["summary_pass"])
    worksheet.write_formula(row, COL_LABEL, status_formula, audit_formats["summary_pass"])
    
    # Conditional formatting for the banner
    worksheet.conditional_format(row, COL_LABEL, row, COL_NOTES, {
        "type": "text",
        "criteria": "containing",
        "value": "✓",
        "format": audit_formats["summary_pass"],
    })
    worksheet.conditional_format(row, COL_LABEL, row, COL_NOTES, {
        "type": "text",
        "criteria": "containing",
        "value": "✗",
        "format": audit_formats["summary_fail"],
    })
    
    return row + 2


def write_policy_assumptions_section(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    audit_formats: dict[str, Any],
) -> int:
    """Write the policy assumptions section.
    
    Shows current values of policy toggles that affect totals,
    including generated fill row impacts.
    
    Returns next row.
    """
    # Section header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "POLICY ASSUMPTIONS (Current Settings)",
        audit_formats["subsection_header"]
    )
    row += 1
    
    # Policy toggles (read from named ranges)
    # NOTE: CountTwoWayInRoster/CountTwoWayInTotals were removed.
    # Two-way counting is a CBA fact (2-way counts toward cap totals, not roster).
    # The COCKPIT now shows informational 2-way readouts in PRIMARY READOUTS section.
    policies = [
        ("Roster Fill Target", "RosterFillTarget", "Generated fill rows target count"),
        ("Roster Fill Type", "RosterFillType", "Minimum salary type for fills"),
        ("Show Exists-Only Rows", "ShowExistsOnlyRows", "Display non-counting rows"),
        ("Active Plan", "ActivePlan", "Currently selected scenario"),
    ]
    
    for label, named_range, note in policies:
        worksheet.write(row, COL_LABEL, label, audit_formats["label_indent"])
        worksheet.write_formula(row, COL_WAREHOUSE, f"={named_range}", audit_formats["label"])
        worksheet.write(row, COL_NOTES, note, audit_formats["note"])
        row += 1
    
    row += 1
    
    # =========================================================================
    # Generated Fill Rows Impact (when RosterFillTarget > 0)
    # =========================================================================
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "GENERATED FILL ROWS IMPACT",
        audit_formats["subsection_header"]
    )
    row += 1
    
    # Explanation
    # NOTE: Fill amounts are mode-independent (same for Cap/Tax/Apron) because
    # minimum salary contracts count identically toward all thresholds per CBA.
    worksheet.write(
        row, COL_LABEL,
        "When RosterFillTarget > 0, generated fill rows add to totals (mode-independent):",
        audit_formats["note"]
    )
    row += 1
    
    # Current roster count (non-two-way with selected-year cap > 0)
    # Uses LET + FILTER + ROWS to match the modern formula pattern
    current_roster_formula = salary_book_filter_count(is_two_way=False)
    
    worksheet.write(row, COL_LABEL, "  Current Roster Count:", audit_formats["label_indent"])
    worksheet.write_formula(row, COL_WAREHOUSE, f"={current_roster_formula}", audit_formats["count"])
    worksheet.write(row, COL_NOTES, "Non-two-way players with SelectedYear cap > 0", audit_formats["note"])
    row += 1
    
    # Fill rows needed = MAX(0, RosterFillTarget - current_roster_count)
    fill_rows_needed_formula = f"MAX(0,RosterFillTarget-{current_roster_formula})"
    
    worksheet.write(row, COL_LABEL, "  Fill Rows Needed:", audit_formats["label_indent"])
    worksheet.write_formula(row, COL_WAREHOUSE, f"={fill_rows_needed_formula}", audit_formats["count"])
    worksheet.write(row, COL_NOTES, "= MAX(0, RosterFillTarget - Current Roster)", audit_formats["note"])
    row += 1
    
    # Fill amount per row (based on RosterFillType)
    # Mode-independent: minimum salaries count the same for cap/tax/apron thresholds
    rookie_min_formula = (
        "SUMIFS(tbl_rookie_scale[salary_year_1],"
        "tbl_rookie_scale[salary_year],SelectedYear,"
        "tbl_rookie_scale[pick_number],30)"
    )
    vet_min_formula = (
        "SUMIFS(tbl_minimum_scale[minimum_salary_amount],"
        "tbl_minimum_scale[salary_year],SelectedYear,"
        "tbl_minimum_scale[years_of_service],0)"
    )
    fill_amount_formula = (
        f'IF(RosterFillType="Rookie Min",{rookie_min_formula},'
        f'IF(RosterFillType="Vet Min",{vet_min_formula},'
        f'MIN({rookie_min_formula},{vet_min_formula})))'
    )
    
    worksheet.write(row, COL_LABEL, "  Fill Amount (per row):", audit_formats["label_indent"])
    worksheet.write_formula(row, COL_WAREHOUSE, f"={fill_amount_formula}", audit_formats["money"])
    worksheet.write_formula(
        row, COL_NOTES,
        '="Based on RosterFillType = "&RosterFillType',
        audit_formats["note"]
    )
    row += 1
    
    # Total fill impact = fill_rows_needed * fill_amount
    total_fill_formula = f"IF(RosterFillTarget>0,{fill_rows_needed_formula}*{fill_amount_formula},0)"
    
    worksheet.write(row, COL_LABEL, "  Total Fill Impact:", audit_formats["label_bold"])
    worksheet.write_formula(row, COL_WAREHOUSE, f"={total_fill_formula}", audit_formats["money_bold"])
    worksheet.write(
        row, COL_NOTES,
        "GENERATED rows add this amount to totals (policy delta, not authoritative)",
        audit_formats["note"]
    )
    
    # Conditional formatting to highlight when fill is active
    worksheet.conditional_format(row, COL_WAREHOUSE, row, COL_WAREHOUSE, {
        "type": "cell",
        "criteria": ">",
        "value": 0,
        "format": audit_formats["delta_fail"],  # Use warning format when active
    })
    row += 1
    
    # Warning note about reconciliation
    row += 1
    worksheet.write(
        row, COL_LABEL,
        "⚠ IMPORTANT: Generated fill rows are POLICY ASSUMPTIONS, not authoritative data.",
        audit_formats["note"]
    )
    row += 1
    worksheet.write(
        row, COL_LABEL,
        "  They are NOT included in the reconciliation sections above (which compare warehouse vs drilldowns).",
        audit_formats["note"]
    )
    row += 1
    worksheet.write(
        row, COL_LABEL,
        "  To disable: set RosterFillTarget = 0 in the command bar.",
        audit_formats["note"]
    )
    row += 1
    
    row += 1  # Blank row before next subsection
    
    # =========================================================================
    # Incomplete Roster Charges (explicitly excluded)
    # =========================================================================
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "INCOMPLETE ROSTER CHARGES (Not Implemented)",
        audit_formats["subsection_header"]
    )
    row += 1
    
    # Explanation of what incomplete roster charges are and why they're excluded
    incomplete_roster_notes = [
        "Per CBA: teams with fewer than 12 players (or 14 in off-season) incur a charge for each",
        "\"missing\" roster spot, equal to the minimum salary pro-rated by days (/174 in-season).",
        "",
        "❌ THIS WORKBOOK DOES NOT MODEL INCOMPLETE ROSTER CHARGES. Reasons:",
        "",
        "  1. PCMS authoritative data: If PCMS includes these charges in team_budget_snapshots,",
        "     they are already reflected in warehouse totals. Adding them again would double-count.",
        "",
        "  2. Scenario modeling covered: The Roster Fill feature (above) addresses the common",
        "     analyst use case of projecting totals with fill-to-12/14/15 assumptions.",
        "",
        "  3. Proration complexity: Incomplete roster charges depend on specific dates and days",
        "     remaining in season — information not reliably available in the current data model.",
        "",
        "  4. Rare in practice: Most teams maintain at least 12 players during the season.",
        "",
        "If incomplete roster charges are critical for your analysis:",
        "  • Check if PCMS already includes them in cap_total (compare to official league sources)",
        "  • Use Roster Fill (RosterFillTarget=12) as a proxy for scenario modeling",
        "  • For precise calculations, consult official league cap sheets",
    ]
    
    for note in incomplete_roster_notes:
        worksheet.write(row, COL_LABEL, note, audit_formats["note"])
        row += 1
    
    return row + 2


def write_notes_section(
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    audit_formats: dict[str, Any],
) -> int:
    """Write the notes and guidance section.
    
    Returns next row.
    """
    # Section header
    worksheet.merge_range(
        row, COL_LABEL, row, COL_NOTES,
        "NOTES",
        audit_formats["subsection_header"]
    )
    row += 1
    
    notes = [
        "• This sheet validates that drilldown table sums match warehouse totals",
        "• Any non-zero delta indicates a reconciliation issue that needs investigation",
        "• Row counts help verify that all expected rows are included",
        "• Plan Diff section shows ActivePlan impact vs Baseline (above)",
        "• See META sheet for validation status, timestamps, and any build errors",
        "• See BUDGET_LEDGER for the authoritative totals statement",
        "• See ROSTER_GRID for per-row drilldowns by bucket",
    ]
    
    for note in notes:
        worksheet.write(row, COL_LABEL, note, audit_formats["note"])
        row += 1
    
    return row
