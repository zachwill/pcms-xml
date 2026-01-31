"""
TEAM_COCKPIT sheet writer with command bar inputs.

This module implements the cockpit command bar with workbook-defined names:
- SelectedTeam
- SelectedYear
- AsOfDate
- SelectedMode

Per the blueprint (excel-cap-book-blueprint.md), the command bar is the
workbook's "operating context" and should be consistent across all sheets.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from ..xlsx import define_named_cell


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

    Args:
        workbook: The XlsxWriter Workbook (needed for define_name)
        worksheet: The TEAM_COCKPIT worksheet
        formats: Standard format dict from create_standard_formats
        build_meta: Build metadata (base_year, as_of_date, etc.)
        team_codes: Optional list of team codes for validation (used by next task)
    """
    # Column widths
    worksheet.set_column(COL_LABEL, COL_LABEL, 20)
    worksheet.set_column(COL_INPUT, COL_INPUT, 15)
    worksheet.set_column(2, 2, 15)
    worksheet.set_column(3, 3, 15)

    # Sheet title
    worksheet.write(0, 0, "TEAM COCKPIT", formats["header"])
    worksheet.write(1, 0, "Primary flight display for team cap position")

    # Command bar section header
    worksheet.write(COMMAND_BAR_START_ROW, 0, "COMMAND BAR", formats["header"])

    # --- Team input ---
    worksheet.write(ROW_TEAM, COL_LABEL, "Team:")
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
    worksheet.write(ROW_YEAR, COL_LABEL, "Salary Year:")
    base_year = build_meta.get("base_year", 2025)
    worksheet.write(ROW_YEAR, COL_INPUT, base_year)
    define_named_cell(workbook, "SelectedYear", "TEAM_COCKPIT", ROW_YEAR, COL_INPUT)

    # --- As-Of Date input ---
    worksheet.write(ROW_AS_OF, COL_LABEL, "As-Of Date:")
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
    worksheet.write(ROW_MODE, COL_LABEL, "Mode:")
    worksheet.write(ROW_MODE, COL_INPUT, "Cap")  # Default to Cap mode
    define_named_cell(workbook, "SelectedMode", "TEAM_COCKPIT", ROW_MODE, COL_INPUT)

    # Primary readouts section (placeholder for future implementation)
    worksheet.write(9, 0, "PRIMARY READOUTS", formats["header"])
    worksheet.write(10, 0, "Cap Position:")
    worksheet.write(10, 1, "(TBD)")
    worksheet.write(11, 0, "Tax Position:")
    worksheet.write(11, 1, "(TBD)")
    worksheet.write(12, 0, "Room Under Apron 1:")
    worksheet.write(12, 1, "(TBD)")
    worksheet.write(13, 0, "Room Under Apron 2:")
    worksheet.write(13, 1, "(TBD)")
    worksheet.write(14, 0, "Roster Count:")
    worksheet.write(14, 1, "(TBD)")
    worksheet.write(15, 0, "Repeater Status:")
    worksheet.write(15, 1, "(TBD)")


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
