from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ..command_bar import (
    write_command_bar_readonly,
    get_content_start_row,
)
from .utils import (
    _create_subsystem_formats,
    _protect_sheet,
)


def write_assets(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write ASSETS sheet with exception and draft pick inventory.
    """
    sub_formats = _create_subsystem_formats(workbook)

    # Sheet title
    worksheet.write(0, 0, "ASSETS", formats["header"])
    worksheet.write(1, 0, "Exception/TPE and draft pick inventory for selected team")

    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)

    content_row = get_content_start_row()

    # Column widths
    worksheet.set_column(0, 0, 10)
    worksheet.set_column(1, 1, 22)
    worksheet.set_column(2, 2, 22)
    worksheet.set_column(3, 3, 16)
    worksheet.set_column(4, 4, 40)
    worksheet.set_column(5, 5, 14)
    worksheet.set_column(6, 6, 14)
    worksheet.set_column(7, 7, 14)

    # EXCEPTIONS SECTION
    worksheet.merge_range(
        content_row, 0,
        content_row, 7,
        "EXCEPTIONS & TPEs (filtered by SelectedTeam from tbl_exceptions_warehouse)",
        sub_formats["section_header"],
    )
    content_row += 1

    worksheet.write(
        content_row, 0,
        "Shows tradeable player exceptions (TPEs), MLE, BAE, and other exceptions for the selected team.",
        sub_formats["note"],
    )
    content_row += 2

    exc_headers = [
        "Year",
        "Exception Type",
        "TPE Player",
        "Original Amount",
        "Remaining Amount",
        "Effective Date",
        "Expiration Date",
        "Status",
    ]
    for i, header in enumerate(exc_headers):
        worksheet.write(content_row, i, header, sub_formats["label_bold"])
    content_row += 1

    exc_filter_formula = (
        '=IFERROR('
        'FILTER('
        'CHOOSE({1,2,3,4,5,6,7,8},'
        'tbl_exceptions_warehouse[salary_year],'
        'tbl_exceptions_warehouse[exception_type_name],'
        'tbl_exceptions_warehouse[trade_exception_player_name],'
        'tbl_exceptions_warehouse[original_amount],'
        'tbl_exceptions_warehouse[remaining_amount],'
        'tbl_exceptions_warehouse[effective_date],'
        'tbl_exceptions_warehouse[expiration_date],'
        'IF(tbl_exceptions_warehouse[is_expired],"Expired","Active")),'
        'tbl_exceptions_warehouse[team_code]=SelectedTeam'
        '),'
        '"None")'
    )

    worksheet.write_formula(content_row, 0, exc_filter_formula, sub_formats["output"])

    exc_data_start_row = content_row
    content_row += 20

    worksheet.write(
        content_row, 0,
        "↑ Dynamic array formula — results spill automatically. 'None' shown if no exceptions for selected team.",
        sub_formats["note"],
    )
    content_row += 2

    worksheet.write(content_row, 0, "Common Exception Types:", sub_formats["label_bold"])
    content_row += 1

    exception_types = [
        ("TPE", "Traded Player Exception — absorb player up to exception amount"),
        ("MLE (Non-Taxpayer)", "Mid-Level Exception for under-tax teams (~$12.9M)"),
        ("MLE (Taxpayer)", "Taxpayer Mid-Level Exception (~$5M)"),
        ("MLE (Room)", "Room Mid-Level Exception for cap-room teams (~$8M)"),
        ("BAE", "Bi-Annual Exception (~$4.7M, available every other year)"),
    ]
    for exc_name, exc_desc in exception_types:
        worksheet.write(content_row, 0, f"• {exc_name}:", sub_formats["label"])
        worksheet.write(content_row, 2, exc_desc, sub_formats["note"])
        content_row += 1

    content_row += 2

    # DRAFT PICKS SECTION
    worksheet.merge_range(
        content_row, 0,
        content_row, 7,
        "DRAFT PICKS (filtered by SelectedTeam from tbl_draft_picks_warehouse)",
        sub_formats["section_header"],
    )
    content_row += 1

    worksheet.write(
        content_row, 0,
        "Shows owned picks and picks owed. Sorted by year, round, slot. Review flags highlighted.",
        sub_formats["note"],
    )
    content_row += 2

    pick_headers = [
        "Year",
        "Round",
        "Slot",
        "Type",
        "Description",
        "Conditional?",
        "Swap?",
        "Needs Review",
    ]
    for i, header in enumerate(pick_headers):
        worksheet.write(content_row, i, header, sub_formats["label_bold"])
    content_row += 1

    pick_filter_formula = (
        '=IFERROR('
        'SORT('
        'FILTER('
        'CHOOSE({1,2,3,4,5,6,7,8},'
        'tbl_draft_picks_warehouse[draft_year],'
        'tbl_draft_picks_warehouse[draft_round],'
        'tbl_draft_picks_warehouse[asset_slot],'
        'tbl_draft_picks_warehouse[asset_type],'
        'tbl_draft_picks_warehouse[raw_fragment],'
        'IF(tbl_draft_picks_warehouse[is_conditional_text],"Yes",""),'
        'IF(tbl_draft_picks_warehouse[is_swap_text],"Yes",""),'
        'IF(tbl_draft_picks_warehouse[needs_review],"⚠ REVIEW","")),'
        'tbl_draft_picks_warehouse[team_code]=SelectedTeam),'
        '{1,2,3},{1,1,1}),'
        '"None")'
    )

    worksheet.write_formula(content_row, 0, pick_filter_formula, sub_formats["output"])

    pick_data_start_row = content_row
    content_row += 30

    worksheet.conditional_format(
        pick_data_start_row, 7,
        pick_data_start_row + 29, 7,
        {
            "type": "text",
            "criteria": "containing",
            "value": "REVIEW",
            "format": sub_formats["status_fail"],
        },
    )

    worksheet.write(
        content_row, 0,
        "↑ Dynamic array formula — results spill automatically. 'None' shown if no picks for selected team.",
        sub_formats["note"],
    )
    content_row += 2

    asset_type_legend = [
        ("OWN", "Team's own pick"),
        ("TO", "Pick owed to another team"),
        ("HAS", "Pick acquired from another team"),
        ("MAY_HAVE", "Conditional pick (may acquire)"),
        ("OTHER", "Other/complex arrangement"),
    ]
    worksheet.write(content_row, 0, "Asset Type Legend:", sub_formats["label_bold"])
    content_row += 1
    for type_code, type_desc in asset_type_legend:
        worksheet.write(content_row, 0, f"• {type_code}:", sub_formats["label"])
        worksheet.write(content_row, 2, type_desc, sub_formats["note"])
        content_row += 1

    content_row += 1

    worksheet.write(content_row, 0, "Pick Trading Rules:", sub_formats["label_bold"])
    content_row += 1

    pick_notes = [
        "• Stepien Rule: teams must keep a 1st-round pick in at least every other year",
        "• Pick swaps count as 'conveying' a pick for Stepien purposes",
        "• Protections convert: e.g., 'Top-10 protected' → conveys if outside top 10",
        "• Second-round picks can be traded freely",
    ]
    for note in pick_notes:
        worksheet.write(content_row, 0, note, sub_formats["note"])
        content_row += 1

    _protect_sheet(worksheet)
