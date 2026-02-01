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
    _col_letter,
)

# Trade Machine layout constants
TRADE_LANE_WIDTH = 6  # columns per lane
TRADE_SLOTS_PER_SIDE = 5  # players per side (outgoing/incoming)
LANE_IDS = ["A", "B", "C", "D"]


def write_trade_machine(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write TRADE_MACHINE sheet with 4 lanes (A-D) for side-by-side trade iteration.
    """
    sub_formats = _create_subsystem_formats(workbook)

    # Sheet title
    worksheet.write(0, 0, "TRADE MACHINE", formats["header"])
    worksheet.write(1, 0, "Lane-based trade iteration — compare up to 4 trades side-by-side")

    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)

    content_row = get_content_start_row()

    # Column widths for the 4 lanes
    for lane_idx in range(4):
        base_col = lane_idx * TRADE_LANE_WIDTH
        worksheet.set_column(base_col, base_col, 18)      # Player name / labels
        worksheet.set_column(base_col + 1, base_col + 1, 14)  # Salary / values
        worksheet.set_column(base_col + 2, base_col + 2, 14)  # Status/room values
        worksheet.set_column(base_col + 3, base_col + 3, 2)   # Spacer
        # Additional columns for overflow/notes
        worksheet.set_column(base_col + 4, base_col + 5, 10)

    # Lane headers
    lane_names = ["Lane A", "Lane B", "Lane C", "Lane D"]
    lane_formats_list = [sub_formats["lane_a"], sub_formats["lane_b"],
                         sub_formats["lane_c"], sub_formats["lane_d"]]

    for lane_idx, (lane_name, lane_fmt) in enumerate(zip(lane_names, lane_formats_list)):
        base_col = lane_idx * TRADE_LANE_WIDTH
        worksheet.merge_range(
            content_row, base_col,
            content_row, base_col + TRADE_LANE_WIDTH - 2,  # Leave spacer
            lane_name,
            lane_fmt,
        )

    content_row += 2

    # Instructions row
    worksheet.write(
        content_row, 0,
        "Select team to see status summary. Enter player names and salaries. "
        "Status shows cap position for SelectedYear from tbl_team_salary_warehouse.",
        sub_formats["note"],
    )
    content_row += 2

    # Track team cell references for each lane (needed for status formulas)
    lane_team_cells: list[str] = []

    # Write each lane (first pass: team selectors and status)
    for lane_idx in range(4):
        base_col = lane_idx * TRADE_LANE_WIDTH
        team_cell_ref = _write_trade_lane(
            workbook, worksheet, sub_formats, formats, content_row, base_col, lane_idx
        )
        lane_team_cells.append(team_cell_ref)

    # Calculate rows used by lane content
    rows_per_lane = 10 + 8 + 8 + 5 + 7 + 2  # plus spacing
    content_row += rows_per_lane + 2

    # Salary matching reference table
    worksheet.merge_range(
        content_row, 0,
        content_row, 10,
        "SALARY MATCHING REFERENCE (displayed adjacent per blueprint)",
        sub_formats["section_header"],
    )
    content_row += 2

    # Matching tiers table
    matching_tiers = [
        ("Below Tax (Expanded)", "Outgoing < ~$8M", "200% + $250K"),
        ("Below Tax (Expanded)", "Outgoing ~$8M-$33M", "100% + TPE allowance"),
        ("Below Tax (Expanded)", "Outgoing > ~$33M", "125% + $250K"),
        ("First Apron or above", "Any outgoing", "100% + $100K"),
    ]

    worksheet.write(content_row, 0, "Team Status", sub_formats["label_bold"])
    worksheet.write(content_row, 1, "Outgoing Range", sub_formats["label_bold"])
    worksheet.write(content_row, 2, "Max Incoming Formula", sub_formats["label_bold"])
    content_row += 1

    for tier_name, outgoing_basis, max_incoming in matching_tiers:
        worksheet.write(content_row, 0, tier_name, sub_formats["label"])
        worksheet.write(content_row, 1, outgoing_basis, sub_formats["label"])
        worksheet.write(content_row, 2, max_incoming, sub_formats["label"])
        content_row += 1

    content_row += 2

    # Apron gate notes
    worksheet.write(content_row, 0, "Apron Gate Notes:", sub_formats["label_bold"])
    content_row += 1
    apron_notes = [
        "• First apron teams cannot aggregate salaries in trades",
        "• First apron teams cannot take back more than 110% + $100K",
        "• Second apron teams have additional restrictions on S&T and cash",
        "• Hard cap triggered by certain sign-and-trade and exception uses",
    ]
    for note in apron_notes:
        worksheet.write(content_row, 0, note, sub_formats["note"])
        content_row += 1

    content_row += 2

    # JOURNAL PUBLISH INSTRUCTIONS
    worksheet.write(content_row, 0, "How to publish Trade to PLAN_JOURNAL:", sub_formats["label_bold"])
    content_row += 1

    publish_steps = [
        "1. Go to PLAN_JOURNAL sheet",
        "2. Add a new row with action_type = 'Trade'",
        "3. Set plan_id, enabled, salary_year, target_player as needed",
        "4. Copy the Δ Cap/Tax/Apron values from the lane's JOURNAL OUTPUT into delta_cap/delta_tax/delta_apron",
        "5. Set source = 'Trade Lane A' (or B/C/D as appropriate)",
        "Note: For multi-team trades, add one PLAN_JOURNAL row per team involved",
    ]
    for step in publish_steps:
        worksheet.write(content_row, 0, step, sub_formats["note"])
        content_row += 1

    content_row += 3

    # Team List Helper
    worksheet.write(content_row, 0, "TEAM LIST HELPER (for dropdown validation):", sub_formats["label_bold"])
    content_row += 1

    helper_row = content_row
    helper_col = 0

    team_list_formula = (
        '=IFERROR('
        'SORT(UNIQUE('
        'FILTER(tbl_team_salary_warehouse[team_code],'
        'tbl_team_salary_warehouse[salary_year]=SelectedYear)'
        ')),'
        '"(no teams)")'
    )

    worksheet.write_formula(helper_row, helper_col, team_list_formula, sub_formats["output"])

    from xlsxwriter.utility import xl_col_to_name
    helper_col_letter = xl_col_to_name(helper_col)
    team_list_max_rows = 32
    helper_end_row = helper_row + team_list_max_rows - 1
    helper_range_ref = (
        f"${helper_col_letter}${helper_row + 1}:${helper_col_letter}${helper_end_row + 1}"
    )

    workbook.define_name(
        "TradeTeamList",
        f"='TRADE_MACHINE'!{helper_range_ref}"
    )

    content_row += team_list_max_rows
    worksheet.write(
        content_row, 0,
        "↑ Dynamic array — team list for dropdown validation. Shows teams with data for SelectedYear.",
        sub_formats["note"],
    )

    _protect_sheet(worksheet)


def _write_trade_lane(
    workbook: Workbook,
    worksheet: Worksheet,
    sub_formats: dict[str, Any],
    formats: dict[str, Any],
    start_row: int,
    base_col: int,
    lane_idx: int,
) -> str:
    """
    Write a single trade lane (A/B/C/D) with team selector, status summary, and trade slots.
    """
    row = start_row
    lane_id = LANE_IDS[lane_idx]

    # Team Selector
    worksheet.write(row, base_col, "Team:", sub_formats["label_bold"])
    team_cell_row = row
    team_cell_col = base_col + 1
    worksheet.write(row, team_cell_col, "", sub_formats["input"])

    worksheet.data_validation(
        row, team_cell_col,
        row, team_cell_col,
        {
            "validate": "list",
            "source": "=TradeTeamList",
            "input_title": "Select Team",
            "input_message": "Choose a team from the list (filtered by SelectedYear).",
            "error_type": "warning",
        },
    )

    team_cell_ref = f"{_col_letter(team_cell_col)}{team_cell_row + 1}"

    workbook.define_name(
        f"TradeLane{lane_id}Team",
        f"='TRADE_MACHINE'!${_col_letter(team_cell_col)}${team_cell_row + 1}"
    )

    row += 2

    # STATUS SUMMARY
    worksheet.write(row, base_col, "STATUS SUMMARY", sub_formats["label_bold"])
    worksheet.write(row, base_col + 1, "(SelectedYear)", sub_formats["label"])
    row += 1

    def make_warehouse_lookup(column_name: str) -> str:
        return (
            f'=IFERROR(SUMIFS(tbl_team_salary_warehouse[{column_name}],'
            f'tbl_team_salary_warehouse[team_code],{team_cell_ref},'
            f'tbl_team_salary_warehouse[salary_year],SelectedYear),"")'
        )

    worksheet.write(row, base_col, "Cap Total:", sub_formats["label"])
    worksheet.write_formula(row, base_col + 1, make_warehouse_lookup("cap_total"), sub_formats["output_money"])
    row += 1

    worksheet.write(row, base_col, "Tax Total:", sub_formats["label"])
    worksheet.write_formula(row, base_col + 1, make_warehouse_lookup("tax_total"), sub_formats["output_money"])
    row += 1

    worksheet.write(row, base_col, "Apron Total:", sub_formats["label"])
    worksheet.write_formula(row, base_col + 1, make_warehouse_lookup("apron_total"), sub_formats["output_money"])
    row += 1

    worksheet.write(row, base_col, "Room (Tax):", sub_formats["label"])
    worksheet.write_formula(row, base_col + 1, make_warehouse_lookup("room_under_tax"), sub_formats["output_money"])
    row += 1

    worksheet.write(row, base_col, "Room (Apron 1):", sub_formats["label"])
    worksheet.write_formula(row, base_col + 1, make_warehouse_lookup("room_under_apron1"), sub_formats["output_money"])
    row += 1

    taxpayer_formula = (
        f'=IFERROR(IF(SUMIFS(tbl_team_salary_warehouse[is_taxpayer],'
        f'tbl_team_salary_warehouse[team_code],{team_cell_ref},'
        f'tbl_team_salary_warehouse[salary_year],SelectedYear),"Yes","No"),"")'
    )
    worksheet.write(row, base_col, "Is Taxpayer:", sub_formats["label"])
    worksheet.write_formula(row, base_col + 1, taxpayer_formula, sub_formats["output"])
    row += 1

    repeater_formula = (
        f'=IFERROR(IF(SUMIFS(tbl_team_salary_warehouse[is_repeater_taxpayer],'
        f'tbl_team_salary_warehouse[team_code],{team_cell_ref},'
        f'tbl_team_salary_warehouse[salary_year],SelectedYear),"Yes","No"),"")'
    )
    worksheet.write(row, base_col, "Repeater:", sub_formats["label"])
    worksheet.write_formula(row, base_col + 1, repeater_formula, sub_formats["output"])
    row += 1

    apron_level_formula = (
        f'=IFERROR(INDEX(tbl_team_salary_warehouse[apron_level_lk],'
        f'MATCH(1,(tbl_team_salary_warehouse[team_code]={team_cell_ref})*'
        f'(tbl_team_salary_warehouse[salary_year]=SelectedYear),0)),"")'
    )
    worksheet.write(row, base_col, "Apron Level:", sub_formats["label"])
    worksheet.write_formula(row, base_col + 1, apron_level_formula, sub_formats["output"])
    apron_level_cell = f"{_col_letter(base_col + 1)}{row + 1}"
    row += 2

    # OUTGOING
    worksheet.write(row, base_col, "OUTGOING", sub_formats["label_bold"])
    worksheet.write(row, base_col + 1, "Salary", sub_formats["label_bold"])
    row += 1

    outgoing_start_row = row
    for i in range(TRADE_SLOTS_PER_SIDE):
        worksheet.write(row, base_col, "", sub_formats["input"])
        worksheet.write(row, base_col + 1, 0, sub_formats["input_money"])
        row += 1

    outgoing_end_row = row - 1
    worksheet.write(row, base_col, "Total Out:", sub_formats["label_bold"])
    from_cell = f"{_col_letter(base_col + 1)}{outgoing_start_row + 1}"
    to_cell = f"{_col_letter(base_col + 1)}{outgoing_end_row + 1}"
    worksheet.write_formula(
        row, base_col + 1,
        f"=SUM({from_cell}:{to_cell})",
        sub_formats["total"],
    )
    outgoing_total_cell = f"{_col_letter(base_col + 1)}{row + 1}"
    row += 2

    # INCOMING
    worksheet.write(row, base_col, "INCOMING", sub_formats["label_bold"])
    worksheet.write(row, base_col + 1, "Salary", sub_formats["label_bold"])
    row += 1

    incoming_start_row = row
    for i in range(TRADE_SLOTS_PER_SIDE):
        worksheet.write(row, base_col, "", sub_formats["input"])
        worksheet.write(row, base_col + 1, 0, sub_formats["input_money"])
        row += 1

    incoming_end_row = row - 1
    worksheet.write(row, base_col, "Total In:", sub_formats["label_bold"])
    from_cell = f"{_col_letter(base_col + 1)}{incoming_start_row + 1}"
    to_cell = f"{_col_letter(base_col + 1)}{incoming_end_row + 1}"
    worksheet.write_formula(
        row, base_col + 1,
        f"=SUM({from_cell}:{to_cell})",
        sub_formats["total"],
    )
    incoming_total_cell = f"{_col_letter(base_col + 1)}{row + 1}"
    row += 2

    # Net Delta
    worksheet.write(row, base_col, "Net Delta:", sub_formats["label_bold"])
    worksheet.write_formula(
        row, base_col + 1,
        f"={incoming_total_cell}-{outgoing_total_cell}",
        sub_formats["output_money"],
    )
    row += 1

    # Max Incoming
    tpe_allowance_lookup = (
        'IFERROR(SUMIFS(tbl_system_values[tpe_dollar_allowance],'
        'tbl_system_values[salary_year],SelectedYear),7500000)'
    )

    max_incoming_formula = (
        f'=IFERROR('
        f'LET('
        f'_xlpm.out,{outgoing_total_cell},'
        f'_xlpm.apron,{apron_level_cell},'
        f'_xlpm.tpe,{tpe_allowance_lookup},'
        f'IF(OR(_xlpm.apron="BELOW_TAX",_xlpm.apron=""),'
        f'MAX(MIN(_xlpm.out*2+250000,_xlpm.out+_xlpm.tpe),_xlpm.out*1.25+250000),'
        f'_xlpm.out+100000)'
        f'),'
        f'"")'
    )

    worksheet.write(row, base_col, "Max Incoming:", sub_formats["label_bold"])
    worksheet.write_formula(row, base_col + 1, max_incoming_formula, sub_formats["output_money"])
    max_incoming_cell = f"{_col_letter(base_col + 1)}{row + 1}"
    row += 1

    # Legal?
    legal_formula = (
        f'=IF({outgoing_total_cell}=0,"",'
        f'IF({incoming_total_cell}<={max_incoming_cell},"✓ LEGAL","✗ OVER LIMIT"))'
    )

    worksheet.write(row, base_col, "Legal?:", sub_formats["label_bold"])
    worksheet.write_formula(row, base_col + 1, legal_formula, sub_formats["output"])

    legal_cell_row = row
    worksheet.conditional_format(
        legal_cell_row, base_col + 1,
        legal_cell_row, base_col + 1,
        {
            "type": "text",
            "criteria": "containing",
            "value": "LEGAL",
            "format": sub_formats["status_ok"],
        },
    )
    worksheet.conditional_format(
        legal_cell_row, base_col + 1,
        legal_cell_row, base_col + 1,
        {
            "type": "text",
            "criteria": "containing",
            "value": "OVER",
            "format": sub_formats["status_fail"],
        },
    )
    row += 1

    # Matching Rule
    matching_rule_formula = (
        f'=IF({outgoing_total_cell}=0,"",'
        f'LET('
        f'_xlpm.out,{outgoing_total_cell},'
        f'_xlpm.apron,{apron_level_cell},'
        f'_xlpm.tpe,{tpe_allowance_lookup},'
        f'_xlpm.low_break,_xlpm.tpe-250000,'
        f'_xlpm.high_break,4*(_xlpm.tpe-250000),'
        f'IF(AND(_xlpm.apron<>"BELOW_TAX",_xlpm.apron<>""),'
        f'"Apron: 100%+$100K",'
        f'IF(_xlpm.out<_xlpm.low_break,"Low: 200%+$250K",'
        f'IF(_xlpm.out>_xlpm.high_break,"High: 125%+$250K",'
        f'"Mid: 100%+TPE")))))'
    )

    worksheet.write(row, base_col, "Matching Rule:", sub_formats["label"])
    worksheet.write_formula(row, base_col + 1, matching_rule_formula, sub_formats["output"])
    row += 1

    worksheet.write(
        row, base_col,
        "Note: Apron teams cannot aggregate players",
        sub_formats["note"],
    )
    row += 2

    # JOURNAL OUTPUT
    worksheet.write(row, base_col, "JOURNAL OUTPUT", sub_formats["label_bold"])
    row += 1

    worksheet.write(row, base_col, "Δ Cap:", sub_formats["label"])
    worksheet.write_formula(
        row, base_col + 1,
        f"={incoming_total_cell}-{outgoing_total_cell}",
        sub_formats["output_money"],
    )
    row += 1

    worksheet.write(row, base_col, "Δ Tax:", sub_formats["label"])
    worksheet.write_formula(
        row, base_col + 1,
        f"={incoming_total_cell}-{outgoing_total_cell}",
        sub_formats["output_money"],
    )
    row += 1

    worksheet.write(row, base_col, "Δ Apron:", sub_formats["label"])
    worksheet.write_formula(
        row, base_col + 1,
        f"={incoming_total_cell}-{outgoing_total_cell}",
        sub_formats["output_money"],
    )
    row += 1

    worksheet.write(row, base_col, "Source:", sub_formats["label"])
    worksheet.write(row, base_col + 1, f"Trade Lane {lane_id}", sub_formats["output"])
    row += 1

    worksheet.write(
        row, base_col,
        "→ Copy to PLAN_JOURNAL",
        sub_formats["note"],
    )

    return team_cell_ref
