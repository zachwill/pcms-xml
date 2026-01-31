"""
TEAM_COCKPIT sheet writer with command bar inputs and primary readouts.

This module implements the cockpit command bar with workbook-defined names:
- SelectedTeam
- SelectedYear
- AsOfDate
- SelectedMode

And the primary readouts section driven by DATA_team_salary_warehouse:
- Cap position (space or over-cap)
- Tax position (room or over-tax)
- Room under Apron 1
- Room under Apron 2
- Roster count (NBA) + two-way count
- Repeater Status

Per the blueprint (excel-cap-book-blueprint.md), the command bar is the
workbook's "operating context" and should be consistent across all sheets.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ..xlsx import define_named_cell, FMT_MONEY


# Command bar layout constants
# Row positions (0-indexed)
COMMAND_BAR_START_ROW = 3
ROW_TEAM = 4
ROW_YEAR = 5
ROW_AS_OF = 6
ROW_MODE = 7

# Column positions
COL_LABEL = 0
COL_INPUT = 1
COL_VALUE = 1  # Readout value column
COL_UNIT = 2  # Readout unit/description column

# Primary readouts section
READOUTS_START_ROW = 9
ROW_CAP_POSITION = 10
ROW_TAX_POSITION = 11
ROW_APRON1_ROOM = 12
ROW_APRON2_ROOM = 13
ROW_ROSTER_COUNT = 14
ROW_REPEATER_STATUS = 15
ROW_CAP_TOTAL = 16
ROW_TAX_TOTAL = 17


def _sumifs_formula(data_col: str) -> str:
    """Build SUMIFS formula to look up a value from tbl_team_salary_warehouse.

    Uses SelectedTeam and SelectedYear to filter.
    SUMIFS works well for numeric values with two-column lookup.
    """
    return (
        f"=SUMIFS(tbl_team_salary_warehouse[{data_col}],"
        f"tbl_team_salary_warehouse[team_code],SelectedTeam,"
        f"tbl_team_salary_warehouse[salary_year],SelectedYear)"
    )


def _if_formula(data_col: str) -> str:
    """Build INDEX/MATCH formula for boolean/text values from tbl_team_salary_warehouse.

    For booleans like is_repeater_taxpayer, we convert to display text.
    """
    # Use SUMPRODUCT with INDEX to get single value (works for text/bool)
    return (
        f"=IFERROR(INDEX(tbl_team_salary_warehouse[{data_col}],"
        f"MATCH(1,(tbl_team_salary_warehouse[team_code]=SelectedTeam)*"
        f"(tbl_team_salary_warehouse[salary_year]=SelectedYear),0)),\"\")"
    )


def write_team_cockpit_with_command_bar(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
    build_meta: dict[str, Any],
    team_codes: list[str] | None = None,
) -> None:
    """
    Write TEAM_COCKPIT sheet with command bar inputs and defined names.

    The command bar provides the workbook's operating context:
    - SelectedTeam: the active team code
    - SelectedYear: the base salary year
    - AsOfDate: the as-of date for the snapshot
    - SelectedMode: display mode (Cap / Tax / Apron)

    The primary readouts section shows key metrics from DATA_team_salary_warehouse:
    - Cap position, Tax position, Apron room, Roster counts, Repeater status

    Args:
        workbook: The XlsxWriter Workbook (needed for define_name)
        worksheet: The TEAM_COCKPIT worksheet
        formats: Standard format dict from create_standard_formats
        build_meta: Build metadata (base_year, as_of_date, etc.)
        team_codes: Optional list of team codes for validation dropdown
    """
    # Column widths
    worksheet.set_column(COL_LABEL, COL_LABEL, 22)
    worksheet.set_column(COL_INPUT, COL_INPUT, 18)
    worksheet.set_column(COL_UNIT, COL_UNIT, 30)
    worksheet.set_column(3, 3, 15)

    # Money format for readouts
    money_fmt = workbook.add_format({"num_format": FMT_MONEY, "bold": True})
    # Text format for labels
    label_fmt = workbook.add_format({"bold": False})
    # Positive room format (green)
    room_positive_fmt = workbook.add_format(
        {"num_format": FMT_MONEY, "bold": True, "font_color": "#16A34A"}
    )
    # Negative room format (red)
    room_negative_fmt = workbook.add_format(
        {"num_format": FMT_MONEY, "bold": True, "font_color": "#EF4444"}
    )

    # Sheet title
    worksheet.write(0, 0, "TEAM COCKPIT", formats["header"])
    worksheet.write(1, 0, "Primary flight display for team cap position")

    # Command bar section header
    worksheet.write(COMMAND_BAR_START_ROW, 0, "COMMAND BAR", formats["header"])

    # --- Team input ---
    worksheet.write(ROW_TEAM, COL_LABEL, "Team:", label_fmt)
    # Default to first team code if available, otherwise placeholder
    default_team = team_codes[0] if team_codes else "LAL"
    worksheet.write(ROW_TEAM, COL_INPUT, default_team)
    define_named_cell(workbook, "SelectedTeam", "TEAM_COCKPIT", ROW_TEAM, COL_INPUT)

    # Add data validation dropdown for team selection if we have team codes
    if team_codes:
        worksheet.data_validation(
            ROW_TEAM,
            COL_INPUT,
            ROW_TEAM,
            COL_INPUT,
            {
                "validate": "list",
                "source": team_codes,
                "input_title": "Select Team",
                "input_message": "Choose a team from the dropdown",
                "error_title": "Invalid Team",
                "error_message": "Please select a valid team code from the list",
            },
        )

    # --- Year input ---
    worksheet.write(ROW_YEAR, COL_LABEL, "Salary Year:", label_fmt)
    base_year = build_meta.get("base_year", 2025)
    worksheet.write(ROW_YEAR, COL_INPUT, base_year)
    define_named_cell(workbook, "SelectedYear", "TEAM_COCKPIT", ROW_YEAR, COL_INPUT)

    # Add year validation dropdown
    year_list = [base_year + i for i in range(6)]
    worksheet.data_validation(
        ROW_YEAR,
        COL_INPUT,
        ROW_YEAR,
        COL_INPUT,
        {
            "validate": "list",
            "source": year_list,
            "input_title": "Select Year",
            "input_message": "Choose a salary year",
        },
    )

    # --- As-Of Date input ---
    worksheet.write(ROW_AS_OF, COL_LABEL, "As-Of Date:", label_fmt)
    as_of_str = build_meta.get("as_of_date", "")
    # Write as a date if possible, otherwise string
    if as_of_str:
        try:
            as_of_date = date.fromisoformat(as_of_str)
            date_format = workbook.add_format({"num_format": "yyyy-mm-dd"})
            worksheet.write_datetime(ROW_AS_OF, COL_INPUT, as_of_date, date_format)
        except ValueError:
            worksheet.write(ROW_AS_OF, COL_INPUT, as_of_str)
    else:
        worksheet.write(ROW_AS_OF, COL_INPUT, "")
    define_named_cell(workbook, "AsOfDate", "TEAM_COCKPIT", ROW_AS_OF, COL_INPUT)

    # --- Mode input ---
    worksheet.write(ROW_MODE, COL_LABEL, "Mode:", label_fmt)
    worksheet.write(ROW_MODE, COL_INPUT, "Cap")  # Default to Cap mode
    define_named_cell(workbook, "SelectedMode", "TEAM_COCKPIT", ROW_MODE, COL_INPUT)

    # Mode validation dropdown
    worksheet.data_validation(
        ROW_MODE,
        COL_INPUT,
        ROW_MODE,
        COL_INPUT,
        {
            "validate": "list",
            "source": ["Cap", "Tax", "Apron"],
            "input_title": "Select Mode",
            "input_message": "Choose display mode",
        },
    )

    # =========================================================================
    # PRIMARY READOUTS SECTION
    # These are driven by formulas referencing DATA_team_salary_warehouse
    # =========================================================================
    worksheet.write(READOUTS_START_ROW, 0, "PRIMARY READOUTS", formats["header"])
    worksheet.write(
        READOUTS_START_ROW, COL_UNIT, "(values update when Team/Year changes)"
    )

    # --- Cap Position ---
    # over_cap is positive when team is over the cap (no room)
    # We display as "Over Cap" or "Cap Room" with appropriate sign
    worksheet.write(ROW_CAP_POSITION, COL_LABEL, "Cap Position:", label_fmt)
    worksheet.write_formula(
        ROW_CAP_POSITION, COL_VALUE, _sumifs_formula("over_cap"), money_fmt
    )
    # Descriptive text: "over cap" if positive, "cap room" if negative (flipped sign)
    worksheet.write_formula(
        ROW_CAP_POSITION,
        COL_UNIT,
        f'=IF({_sumifs_formula("over_cap")}>0,"over cap","cap room")',
    )

    # --- Tax Position ---
    # room_under_tax: positive = room, negative = over tax line
    worksheet.write(ROW_TAX_POSITION, COL_LABEL, "Tax Position:", label_fmt)
    worksheet.write_formula(
        ROW_TAX_POSITION, COL_VALUE, _sumifs_formula("room_under_tax"), money_fmt
    )
    worksheet.write_formula(
        ROW_TAX_POSITION,
        COL_UNIT,
        f'=IF({_sumifs_formula("room_under_tax")}>0,"under tax line","over tax line")',
    )

    # --- Room Under Apron 1 ---
    worksheet.write(ROW_APRON1_ROOM, COL_LABEL, "Room Under Apron 1:", label_fmt)
    worksheet.write_formula(
        ROW_APRON1_ROOM, COL_VALUE, _sumifs_formula("room_under_apron1"), money_fmt
    )
    worksheet.write_formula(
        ROW_APRON1_ROOM,
        COL_UNIT,
        f'=IF({_sumifs_formula("room_under_apron1")}>0,"under 1st apron","at/above 1st apron")',
    )

    # --- Room Under Apron 2 ---
    worksheet.write(ROW_APRON2_ROOM, COL_LABEL, "Room Under Apron 2:", label_fmt)
    worksheet.write_formula(
        ROW_APRON2_ROOM, COL_VALUE, _sumifs_formula("room_under_apron2"), money_fmt
    )
    worksheet.write_formula(
        ROW_APRON2_ROOM,
        COL_UNIT,
        f'=IF({_sumifs_formula("room_under_apron2")}>0,"under 2nd apron","at/above 2nd apron")',
    )

    # --- Roster Count ---
    # Shows both NBA roster count and two-way count
    worksheet.write(ROW_ROSTER_COUNT, COL_LABEL, "Roster Count:", label_fmt)
    worksheet.write_formula(
        ROW_ROSTER_COUNT,
        COL_VALUE,
        _sumifs_formula("roster_row_count"),
        workbook.add_format({"bold": True}),
    )
    # Show two-way count in description
    worksheet.write_formula(
        ROW_ROSTER_COUNT,
        COL_UNIT,
        f'="NBA roster + "&{_sumifs_formula("two_way_row_count")}&" two-way"',
    )

    # --- Repeater Status ---
    worksheet.write(ROW_REPEATER_STATUS, COL_LABEL, "Repeater Status:", label_fmt)
    # is_repeater_taxpayer is a boolean; convert to display
    worksheet.write_formula(
        ROW_REPEATER_STATUS,
        COL_VALUE,
        f'=IF({_if_formula("is_repeater_taxpayer")}=TRUE,"YES","NO")',
        workbook.add_format({"bold": True}),
    )
    worksheet.write(
        ROW_REPEATER_STATUS, COL_UNIT, "(repeater taxpayer if TRUE)", label_fmt
    )

    # --- Cap Total (for reference) ---
    worksheet.write(ROW_CAP_TOTAL, COL_LABEL, "Cap Total:", label_fmt)
    worksheet.write_formula(
        ROW_CAP_TOTAL, COL_VALUE, _sumifs_formula("cap_total"), money_fmt
    )
    worksheet.write_formula(
        ROW_CAP_TOTAL,
        COL_UNIT,
        f'="vs cap of "&TEXT({_sumifs_formula("salary_cap_amount")},"$#,##0")',
    )

    # --- Tax Total (for reference) ---
    worksheet.write(ROW_TAX_TOTAL, COL_LABEL, "Tax Total:", label_fmt)
    worksheet.write_formula(
        ROW_TAX_TOTAL, COL_VALUE, _sumifs_formula("tax_total"), money_fmt
    )
    worksheet.write_formula(
        ROW_TAX_TOTAL,
        COL_UNIT,
        f'="vs tax line of "&TEXT({_sumifs_formula("tax_level_amount")},"$#,##0")',
    )


def get_command_bar_cell_refs() -> dict[str, tuple[int, int]]:
    """Return cell positions (row, col) for command bar inputs.

    Useful for other sheets that need to reference these cells.
    """
    return {
        "SelectedTeam": (ROW_TEAM, COL_INPUT),
        "SelectedYear": (ROW_YEAR, COL_INPUT),
        "AsOfDate": (ROW_AS_OF, COL_INPUT),
        "SelectedMode": (ROW_MODE, COL_INPUT),
    }
