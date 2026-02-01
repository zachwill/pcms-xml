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

# Waive table columns
WV_COL_PLAYER = 0
WV_COL_WAIVE_DATE = 1
WV_COL_YEARS_REMAINING = 2
WV_COL_REMAINING_GTD = 3
WV_COL_GIVEBACK = 4
WV_COL_STRETCH = 5
WV_COL_NET_OWED = 6
WV_COL_DEAD_Y1 = 7
WV_COL_DEAD_Y2 = 8
WV_COL_DEAD_Y3 = 9
WV_COL_DELTA_CAP = 10
WV_COL_DELTA_TAX = 11
WV_COL_DELTA_APRON = 12
WV_COL_NOTES = 13

WV_NUM_ROWS = 8  # Number of input slots


def write_waive_buyout_stretch(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write WAIVE_BUYOUT_STRETCH sheet with dead money modeling inputs.
    """
    sub_formats = _create_subsystem_formats(workbook)

    # Sheet title
    worksheet.write(0, 0, "WAIVE / BUYOUT / STRETCH", formats["header"])
    worksheet.write(1, 0, "Model dead money scenarios — formulas auto-compute net owed, dead money distribution, and SelectedYear deltas")

    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)

    content_row = get_content_start_row()

    # Column widths
    worksheet.set_column(WV_COL_PLAYER, WV_COL_PLAYER, 22)
    worksheet.set_column(WV_COL_WAIVE_DATE, WV_COL_WAIVE_DATE, 12)
    worksheet.set_column(WV_COL_YEARS_REMAINING, WV_COL_YEARS_REMAINING, 10)
    worksheet.set_column(WV_COL_REMAINING_GTD, WV_COL_REMAINING_GTD, 14)
    worksheet.set_column(WV_COL_GIVEBACK, WV_COL_GIVEBACK, 12)
    worksheet.set_column(WV_COL_STRETCH, WV_COL_STRETCH, 10)
    worksheet.set_column(WV_COL_NET_OWED, WV_COL_NET_OWED, 12)
    worksheet.set_column(WV_COL_DEAD_Y1, WV_COL_DEAD_Y3, 12)
    worksheet.set_column(WV_COL_DELTA_CAP, WV_COL_DELTA_APRON, 12)
    worksheet.set_column(WV_COL_NOTES, WV_COL_NOTES, 20)

    # Section header
    worksheet.merge_range(
        content_row, WV_COL_PLAYER,
        content_row, WV_COL_NOTES,
        "WAIVE/BUYOUT INPUT (tbl_waive_input) — formulas auto-compute net owed + dead money + SelectedYear deltas",
        sub_formats["section_header"],
    )
    content_row += 1

    worksheet.write(
        content_row, WV_COL_PLAYER,
        "Yellow = input cells. Blue = formula-driven. Net Owed = Remaining GTD - Giveback. "
        "Stretch spreads over (2 × years remaining + 1) years.",
        sub_formats["note"],
    )
    content_row += 2

    # Table columns
    waive_columns = [
        "player_name",
        "waive_date",
        "years_remaining",
        "remaining_gtd",
        "giveback",
        "stretch",
        "net_owed",
        "dead_year_1",
        "dead_year_2",
        "dead_year_3",
        "delta_cap",
        "delta_tax",
        "delta_apron",
        "notes",
    ]

    # Empty input rows
    table_start_row = content_row
    initial_data = []
    for _ in range(WV_NUM_ROWS):
        initial_data.append({
            "player_name": "",
            "waive_date": "",
            "years_remaining": 1,
            "remaining_gtd": 0,
            "giveback": 0,
            "stretch": "No",
            "net_owed": 0,
            "dead_year_1": 0,
            "dead_year_2": 0,
            "dead_year_3": 0,
            "delta_cap": 0,
            "delta_tax": 0,
            "delta_apron": 0,
            "notes": "",
        })

    table_end_row = table_start_row + len(initial_data)

    # Build data matrix
    data_matrix = [[row_dict.get(col, "") for col in waive_columns] for row_dict in initial_data]

    net_owed_formula = '=[@remaining_gtd]-[@giveback]'

    dead_y1_formula = (
        '=IF([@stretch]="Yes",'
        'ROUND([@net_owed]/MIN(2*[@years_remaining]+1,5),0),'
        '[@net_owed])'
    )

    dead_y2_formula = (
        '=IF(AND([@stretch]="Yes",MIN(2*[@years_remaining]+1,5)>=2),'
        'ROUND([@net_owed]/MIN(2*[@years_remaining]+1,5),0),'
        '0)'
    )

    dead_y3_formula = (
        '=IF(AND([@stretch]="Yes",MIN(2*[@years_remaining]+1,5)>=3),'
        'ROUND([@net_owed]/MIN(2*[@years_remaining]+1,5),0),'
        '0)'
    )

    delta_formula = (
        '=IFERROR(CHOOSE(ModeYearIndex,[@dead_year_1],[@dead_year_2],[@dead_year_3]),0)'
    )

    # Column definitions
    column_defs = [
        {"header": "player_name", "format": formats["input"]},
        {"header": "waive_date", "format": formats["input_date"]},
        {"header": "years_remaining", "format": formats["input_int"]},
        {"header": "remaining_gtd", "format": formats["input_money"]},
        {"header": "giveback", "format": formats["input_money"]},
        {"header": "stretch", "format": formats["input"]},
        {"header": "net_owed", "format": sub_formats["output_money"], "formula": net_owed_formula},
        {"header": "dead_year_1", "format": sub_formats["output_money"], "formula": dead_y1_formula},
        {"header": "dead_year_2", "format": sub_formats["output_money"], "formula": dead_y2_formula},
        {"header": "dead_year_3", "format": sub_formats["output_money"], "formula": dead_y3_formula},
        {"header": "delta_cap", "format": sub_formats["output_money"], "formula": delta_formula},
        {"header": "delta_tax", "format": sub_formats["output_money"], "formula": delta_formula},
        {"header": "delta_apron", "format": sub_formats["output_money"], "formula": delta_formula},
        {"header": "notes", "format": formats["input"]},
    ]

    worksheet.add_table(
        table_start_row,
        WV_COL_PLAYER,
        table_end_row,
        WV_COL_NOTES,
        {
            "name": "tbl_waive_input",
            "columns": column_defs,
            "data": data_matrix,
            "style": "Table Style Light 9",
        },
    )

    # Data validation: stretch toggle
    worksheet.data_validation(
        table_start_row + 1,
        WV_COL_STRETCH,
        table_end_row,
        WV_COL_STRETCH,
        {
            "validate": "list",
            "source": ["Yes", "No"],
            "input_title": "Stretch Provision",
            "input_message": "Apply stretch provision to spread dead money?",
        },
    )

    # Data validation: years_remaining
    worksheet.data_validation(
        table_start_row + 1,
        WV_COL_YEARS_REMAINING,
        table_end_row,
        WV_COL_YEARS_REMAINING,
        {
            "validate": "integer",
            "criteria": "between",
            "minimum": 1,
            "maximum": 5,
            "input_title": "Years Remaining",
            "input_message": "How many years remain on the contract (1-5)?",
        },
    )

    content_row = table_end_row + 3

    # Editable zone note
    worksheet.write(
        content_row, WV_COL_PLAYER,
        "📝 EDITABLE ZONE: Yellow cells (input) are unlocked. Blue cells (net_owed, dead_year_*, delta_*) "
        "are formula-driven and locked.",
        sub_formats["note"],
    )
    content_row += 2

    # Totals row
    worksheet.write(content_row, WV_COL_PLAYER, "TOTALS:", sub_formats["label_bold"])
    for col in [WV_COL_REMAINING_GTD, WV_COL_GIVEBACK, WV_COL_NET_OWED,
                WV_COL_DEAD_Y1, WV_COL_DEAD_Y2, WV_COL_DEAD_Y3,
                WV_COL_DELTA_CAP, WV_COL_DELTA_TAX, WV_COL_DELTA_APRON]:
        col_name = waive_columns[col]
        worksheet.write_formula(
            content_row, col,
            f"=SUBTOTAL(109,tbl_waive_input[{col_name}])",
            sub_formats["total"],
        )
    content_row += 3

    # JOURNAL OUTPUT BLOCK
    worksheet.merge_range(
        content_row, WV_COL_PLAYER,
        content_row, WV_COL_STRETCH,
        "JOURNAL OUTPUT (copy into PLAN_JOURNAL to record in plan)",
        sub_formats["section_header"],
    )
    content_row += 1

    worksheet.write(
        content_row, WV_COL_PLAYER,
        "Total waive/buyout deltas for SelectedYear. Copy values into a new PLAN_JOURNAL row.",
        sub_formats["note"],
    )
    content_row += 2

    journal_label_col = WV_COL_PLAYER
    journal_value_col = WV_COL_WAIVE_DATE

    worksheet.write(content_row, journal_label_col, "Selected Year:", sub_formats["label_bold"])
    worksheet.write_formula(content_row, journal_value_col, "=SelectedYear", sub_formats["output"])
    content_row += 1

    worksheet.write(content_row, journal_label_col, "Waive Count:", sub_formats["label_bold"])
    worksheet.write_formula(
        content_row, journal_value_col,
        '=COUNTA(tbl_waive_input[player_name])',
        sub_formats["output"],
    )
    content_row += 2

    worksheet.write(content_row, journal_label_col, "TOTAL DELTAS", sub_formats["label_bold"])
    worksheet.write(content_row, journal_value_col, "(for SelectedYear)", sub_formats["label"])
    content_row += 1

    worksheet.write(content_row, journal_label_col, "Δ Cap:", sub_formats["label"])
    worksheet.write_formula(
        content_row, journal_value_col,
        "=SUBTOTAL(109,tbl_waive_input[delta_cap])",
        sub_formats["total"],
    )
    content_row += 1

    worksheet.write(content_row, journal_label_col, "Δ Tax:", sub_formats["label"])
    worksheet.write_formula(
        content_row, journal_value_col,
        "=SUBTOTAL(109,tbl_waive_input[delta_tax])",
        sub_formats["total"],
    )
    content_row += 1

    worksheet.write(content_row, journal_label_col, "Δ Apron:", sub_formats["label"])
    worksheet.write_formula(
        content_row, journal_value_col,
        "=SUBTOTAL(109,tbl_waive_input[delta_apron])",
        sub_formats["total"],
    )
    content_row += 2

    worksheet.write(content_row, journal_label_col, "Source:", sub_formats["label_bold"])
    worksheet.write(content_row, journal_value_col, "Waive/Buyout (WAIVE_BUYOUT_STRETCH)", sub_formats["output"])
    content_row += 2

    # Manual publish instructions
    worksheet.write(content_row, journal_label_col, "How to publish to PLAN_JOURNAL:", sub_formats["label_bold"])
    content_row += 1

    publish_steps = [
        "1. Go to PLAN_JOURNAL sheet",
        "2. Add a new row with action_type = 'Waive' or 'Buyout' or 'Stretch'",
        "3. Set plan_id, enabled, salary_year, target_player as needed",
        "4. Copy the Δ Cap/Tax/Apron values above into delta_cap/delta_tax/delta_apron columns",
        "5. Set source = 'Waive/Buyout (WAIVE_BUYOUT_STRETCH)'",
    ]
    for step in publish_steps:
        worksheet.write(content_row, journal_label_col, step, sub_formats["note"])
        content_row += 1

    content_row += 2

    # STRETCH PROVISION REFERENCE
    worksheet.write(content_row, WV_COL_PLAYER, "Stretch Provision Rules:", sub_formats["label_bold"])
    content_row += 1

    stretch_notes = [
        "• Stretch spreads remaining guaranteed over (2 × years remaining + 1) seasons",
        "• Example: 2 years remaining → spread over 5 seasons (only first 3 shown in table)",
        "• Stretch must be elected within specific window after waiver",
        "• Cannot stretch mid-season signings in same season",
        "• Set-off: if player signs elsewhere, new salary may offset dead money",
    ]
    for note in stretch_notes:
        worksheet.write(content_row, WV_COL_PLAYER, note, sub_formats["note"])
        content_row += 1

    content_row += 2

    # FORMULA REFERENCE
    worksheet.write(content_row, WV_COL_PLAYER, "Formula Reference:", sub_formats["label_bold"])
    content_row += 1

    formula_notes = [
        "• net_owed = LET(gtd, remaining_gtd, give, giveback, gtd - give)",
        "• If stretch='No': dead_year_1 = net_owed, dead_year_2/3 = 0",
        "• If stretch='Yes': LET computes period = MIN(2×years+1, 5), per_year = net/period",
        "• delta_cap/tax/apron = LET(idx, ModeYearIndex, INDEX(dead_years, 1, idx))",
        "• ModeYearIndex = SelectedYear - MetaBaseYear + 1 (values 1..6)",
        "• Dead money counts identically toward cap, tax, and apron per CBA",
    ]
    for note in formula_notes:
        worksheet.write(content_row, WV_COL_PLAYER, note, sub_formats["note"])
        content_row += 1

    _protect_sheet(worksheet)
