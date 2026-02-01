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

# Signings table columns
SIG_COL_PLAYER = 0
SIG_COL_SIGNING_TYPE = 1
SIG_COL_EXCEPTION = 2
SIG_COL_YEARS = 3
SIG_COL_YEAR1 = 4
SIG_COL_YEAR2 = 5
SIG_COL_YEAR3 = 6
SIG_COL_YEAR4 = 7
SIG_COL_NOTES = 8
SIG_COL_DELTA_CAP = 9
SIG_COL_DELTA_TAX = 10
SIG_COL_DELTA_APRON = 11

SIG_NUM_ROWS = 10  # Number of input slots


def write_signings_and_exceptions(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write SIGNINGS_AND_EXCEPTIONS sheet with signing input table.
    """
    sub_formats = _create_subsystem_formats(workbook)

    # Sheet title
    worksheet.write(0, 0, "SIGNINGS & EXCEPTIONS", formats["header"])
    worksheet.write(1, 0, "Record signings and track exception usage — SelectedYear deltas computed automatically")

    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)

    content_row = get_content_start_row()

    # Column widths
    worksheet.set_column(SIG_COL_PLAYER, SIG_COL_PLAYER, 22)
    worksheet.set_column(SIG_COL_SIGNING_TYPE, SIG_COL_SIGNING_TYPE, 14)
    worksheet.set_column(SIG_COL_EXCEPTION, SIG_COL_EXCEPTION, 18)
    worksheet.set_column(SIG_COL_YEARS, SIG_COL_YEARS, 8)
    worksheet.set_column(SIG_COL_YEAR1, SIG_COL_YEAR4, 12)
    worksheet.set_column(SIG_COL_NOTES, SIG_COL_NOTES, 25)
    # Delta columns
    worksheet.set_column(SIG_COL_DELTA_CAP, SIG_COL_DELTA_CAP, 12)
    worksheet.set_column(SIG_COL_DELTA_TAX, SIG_COL_DELTA_TAX, 12)
    worksheet.set_column(SIG_COL_DELTA_APRON, SIG_COL_DELTA_APRON, 12)

    # Section header: Signings Input
    worksheet.merge_range(
        content_row, SIG_COL_PLAYER,
        content_row, SIG_COL_DELTA_APRON,
        "SIGNINGS INPUT (tbl_signings_input) — SelectedYear deltas auto-computed",
        sub_formats["section_header"],
    )
    content_row += 1

    # Instructions
    worksheet.write(
        content_row, SIG_COL_PLAYER,
        "Enter prospective signings. Delta columns show SelectedYear impact. "
        "Copy Journal Output rows into PLAN_JOURNAL to record in plan.",
        sub_formats["note"],
    )
    content_row += 2

    # Table columns
    signing_columns = [
        "player_name",
        "signing_type",
        "exception_used",
        "years",
        "year_1_salary",
        "year_2_salary",
        "year_3_salary",
        "year_4_salary",
        "notes",
        "delta_cap",
        "delta_tax",
        "delta_apron",
    ]

    # Empty input rows
    table_start_row = content_row
    initial_data = []
    for _ in range(SIG_NUM_ROWS):
        row_data = {col: "" for col in signing_columns}
        row_data["years"] = ""
        row_data["year_1_salary"] = 0
        row_data["year_2_salary"] = 0
        row_data["year_3_salary"] = 0
        row_data["year_4_salary"] = 0
        row_data["delta_cap"] = 0
        row_data["delta_tax"] = 0
        row_data["delta_apron"] = 0
        initial_data.append(row_data)

    table_end_row = table_start_row + len(initial_data)

    # Build data matrix
    data_matrix = [[row_dict.get(col, "") for col in signing_columns] for row_dict in initial_data]

    delta_formula = (
        '=IFERROR(CHOOSE(ModeYearIndex,[@year_1_salary],[@year_2_salary],[@year_3_salary],[@year_4_salary]),0)'
    )

    # Column definitions
    column_defs = [
        {"header": "player_name", "format": formats["input"]},
        {"header": "signing_type", "format": formats["input"]},
        {"header": "exception_used", "format": formats["input"]},
        {"header": "years", "format": formats["input_int"]},
        {"header": "year_1_salary", "format": formats["input_money"]},
        {"header": "year_2_salary", "format": formats["input_money"]},
        {"header": "year_3_salary", "format": formats["input_money"]},
        {"header": "year_4_salary", "format": formats["input_money"]},
        {"header": "notes", "format": formats["input"]},
        {"header": "delta_cap", "format": sub_formats["output_money"], "formula": delta_formula},
        {"header": "delta_tax", "format": sub_formats["output_money"], "formula": delta_formula},
        {"header": "delta_apron", "format": sub_formats["output_money"], "formula": delta_formula},
    ]

    worksheet.add_table(
        table_start_row,
        SIG_COL_PLAYER,
        table_end_row,
        SIG_COL_DELTA_APRON,
        {
            "name": "tbl_signings_input",
            "columns": column_defs,
            "data": data_matrix,
            "style": "Table Style Light 9",
        },
    )

    # Data validation: signing_type
    signing_types = ["Cap Room", "MLE (Full)", "MLE (Taxpayer)", "MLE (Room)", "BAE", "Minimum", "TPE", "Other"]
    worksheet.data_validation(
        table_start_row + 1,
        SIG_COL_SIGNING_TYPE,
        table_end_row,
        SIG_COL_SIGNING_TYPE,
        {
            "validate": "list",
            "source": signing_types,
            "input_title": "Signing Type",
            "input_message": "How is this player being signed?",
        },
    )

    content_row = table_end_row + 3

    # Editable zone note
    worksheet.write(
        content_row, SIG_COL_PLAYER,
        "📝 EDITABLE ZONE: Yellow cells are unlocked for editing. "
        "Blue delta columns (Δ Cap/Tax/Apron) are formula-driven based on SelectedYear.",
        sub_formats["note"],
    )
    content_row += 2

    # Totals row
    worksheet.write(content_row, SIG_COL_PLAYER, "YEAR TOTALS:", sub_formats["label_bold"])
    for year_col in [SIG_COL_YEAR1, SIG_COL_YEAR2, SIG_COL_YEAR3, SIG_COL_YEAR4]:
        worksheet.write_formula(
            content_row, year_col,
            f"=SUBTOTAL(109,tbl_signings_input[{signing_columns[year_col]}])",
            sub_formats["total"],
        )
    content_row += 3

    # JOURNAL OUTPUT BLOCK
    worksheet.merge_range(
        content_row, SIG_COL_PLAYER,
        content_row, SIG_COL_NOTES,
        "JOURNAL OUTPUT (copy into PLAN_JOURNAL to record in plan)",
        sub_formats["section_header"],
    )
    content_row += 1

    worksheet.write(
        content_row, SIG_COL_PLAYER,
        "Total signing deltas for SelectedYear. Copy the values below into a new PLAN_JOURNAL row.",
        sub_formats["note"],
    )
    content_row += 2

    journal_label_col = SIG_COL_PLAYER
    journal_value_col = SIG_COL_SIGNING_TYPE

    worksheet.write(content_row, journal_label_col, "Selected Year:", sub_formats["label_bold"])
    worksheet.write_formula(content_row, journal_value_col, "=SelectedYear", sub_formats["output"])
    content_row += 1

    worksheet.write(content_row, journal_label_col, "Signings Count:", sub_formats["label_bold"])
    worksheet.write_formula(
        content_row, journal_value_col,
        '=COUNTA(tbl_signings_input[player_name])',
        sub_formats["output"],
    )
    content_row += 2

    worksheet.write(content_row, journal_label_col, "TOTAL DELTAS", sub_formats["label_bold"])
    worksheet.write(content_row, journal_value_col, "(for SelectedYear)", sub_formats["label"])
    content_row += 1

    worksheet.write(content_row, journal_label_col, "Δ Cap:", sub_formats["label"])
    worksheet.write_formula(
        content_row, journal_value_col,
        "=SUBTOTAL(109,tbl_signings_input[delta_cap])",
        sub_formats["total"],
    )
    content_row += 1

    worksheet.write(content_row, journal_label_col, "Δ Tax:", sub_formats["label"])
    worksheet.write_formula(
        content_row, journal_value_col,
        "=SUBTOTAL(109,tbl_signings_input[delta_tax])",
        sub_formats["total"],
    )
    content_row += 1

    worksheet.write(content_row, journal_label_col, "Δ Apron:", sub_formats["label"])
    worksheet.write_formula(
        content_row, journal_value_col,
        "=SUBTOTAL(109,tbl_signings_input[delta_apron])",
        sub_formats["total"],
    )
    content_row += 2

    worksheet.write(content_row, journal_label_col, "Source:", sub_formats["label_bold"])
    worksheet.write(content_row, journal_value_col, "Signings (SIGNINGS_AND_EXCEPTIONS)", sub_formats["output"])
    content_row += 2

    # Manual publish instructions
    worksheet.write(content_row, journal_label_col, "How to publish to PLAN_JOURNAL:", sub_formats["label_bold"])
    content_row += 1

    publish_steps = [
        "1. Go to PLAN_JOURNAL sheet",
        "2. Add a new row with action_type = 'Sign (Exception)' or appropriate type",
        "3. Set plan_id, enabled, salary_year, target_player as needed",
        "4. Copy the Δ Cap/Tax/Apron values above into delta_cap/delta_tax/delta_apron columns",
        "5. Set source = 'Signings (SIGNINGS_AND_EXCEPTIONS)'",
    ]
    for step in publish_steps:
        worksheet.write(content_row, journal_label_col, step, sub_formats["note"])
        content_row += 1

    content_row += 2

    # EXCEPTION INVENTORY SECTION
    worksheet.merge_range(
        content_row, SIG_COL_PLAYER,
        content_row, SIG_COL_NOTES,
        "EXCEPTION INVENTORY (filtered by SelectedTeam from tbl_exceptions_warehouse)",
        sub_formats["section_header"],
    )
    content_row += 1

    worksheet.write(
        content_row, SIG_COL_PLAYER,
        "Shows available exceptions for the selected team. Use for exception_used validation in signings above.",
        sub_formats["note"],
    )
    content_row += 2

    exc_headers = [
        "Year",
        "Exception Type",
        "TPE Player",
        "Original Amt",
        "Remaining Amt",
        "Effective",
        "Expiration",
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

    content_row += 15
    worksheet.write(
        content_row, SIG_COL_PLAYER,
        "↑ Dynamic array — results spill automatically. 'None' shown if no exceptions for team. "
        "Amounts in dollars; dates as yyyy-mm-dd.",
        sub_formats["note"],
    )
    content_row += 2

    # EXCEPTION_USED VALIDATION HELPER
    worksheet.merge_range(
        content_row, SIG_COL_PLAYER,
        content_row, SIG_COL_NOTES,
        "EXCEPTION DROPDOWN LIST (helper for exception_used validation)",
        sub_formats["section_header"],
    )
    content_row += 1

    worksheet.write(
        content_row, SIG_COL_PLAYER,
        "Dynamic list of available exceptions for SelectedTeam. Used as dropdown source for exception_used column above.",
        sub_formats["note"],
    )
    content_row += 2

    worksheet.write(content_row, SIG_COL_PLAYER, "Available Exceptions:", sub_formats["label_bold"])
    content_row += 1

    helper_row = content_row
    helper_col = SIG_COL_PLAYER

    exception_helper_formula = (
        '=IFERROR('
        'SORT('
        'FILTER('
        'IF('
        'LEN(tbl_exceptions_warehouse[trade_exception_player_name])>0,'
        '"TPE: "&tbl_exceptions_warehouse[trade_exception_player_name]&" ($"&TEXT(tbl_exceptions_warehouse[remaining_amount],"#,##0")&")",'
        'tbl_exceptions_warehouse[exception_type_name]&" ($"&TEXT(tbl_exceptions_warehouse[remaining_amount],"#,##0")&")"'
        '),'
        '(tbl_exceptions_warehouse[team_code]=SelectedTeam)*(NOT(tbl_exceptions_warehouse[is_expired]))'
        '),'
        '1,1'
        '),'
        '"(none available)")'
    )

    worksheet.write_formula(helper_row, helper_col, exception_helper_formula, sub_formats["output"])

    exception_helper_start_row = helper_row
    exception_list_max_rows = 15
    content_row = helper_row + exception_list_max_rows

    worksheet.write(
        content_row, SIG_COL_PLAYER,
        "↑ Dynamic array — available exceptions for dropdown. Shows '(none available)' if no valid exceptions.",
        sub_formats["note"],
    )
    content_row += 2

    from xlsxwriter.utility import xl_col_to_name

    helper_col_letter = xl_col_to_name(helper_col)
    helper_end_row = exception_helper_start_row + exception_list_max_rows - 1
    helper_range_ref = (
        f"${helper_col_letter}${exception_helper_start_row + 1}:"
        f"${helper_col_letter}${helper_end_row + 1}"
    )

    workbook.define_name(
        "ExceptionUsedList",
        f"='SIGNINGS_AND_EXCEPTIONS'!{helper_range_ref}"
    )

    worksheet.data_validation(
        table_start_row + 1,
        SIG_COL_EXCEPTION,
        table_end_row,
        SIG_COL_EXCEPTION,
        {
            "validate": "list",
            "source": "=ExceptionUsedList",
            "input_title": "Exception Used",
            "input_message": "Select the exception being used for this signing (filtered by SelectedTeam).",
            "error_title": "Invalid Exception",
            "error_message": "Please select from the available exceptions list, or leave blank.",
            "error_type": "warning",
        },
    )

    # Hard-cap trigger notes
    worksheet.write(content_row, SIG_COL_PLAYER, "Hard-Cap Trigger Notes:", sub_formats["label_bold"])
    content_row += 1

    trigger_notes = [
        "• Using the Non-Taxpayer MLE triggers hard cap at first apron",
        "• Sign-and-trade for incoming player triggers hard cap at first apron",
        "• BAE usage triggers hard cap at first apron",
        "• Room MLE does NOT trigger hard cap",
    ]
    for note in trigger_notes:
        worksheet.write(content_row, SIG_COL_PLAYER, note, sub_formats["note"])
        content_row += 1

    _protect_sheet(worksheet)
