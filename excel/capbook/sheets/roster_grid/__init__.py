from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from .formats import _create_roster_formats
from .helpers import (
    COLUMN_WIDTHS,
    num_roster_rows,
    _apply_badge_conditional_formatting
)
from .roster_section import _write_roster_section
from .twoway_section import _write_twoway_section
from .cap_holds_section import _write_cap_holds_section
from .dead_money_section import _write_dead_money_section
from .generated_section import _write_generated_section
from .exists_only_section import _write_exists_only_section
from .reconciliation import _write_reconciliation_block

from ..command_bar import (
    write_command_bar_readonly,
    get_content_start_row,
)


def write_roster_grid(
    workbook: Workbook,
    worksheet: Worksheet,
    formats: dict[str, Any],
) -> None:
    """
    Write ROSTER_GRID sheet with full roster/ledger view and reconciliation.

    The roster grid shows:
    - All roster contracts (bucket = ROST) with badges and multi-year salaries
    - Two-way contracts (bucket = 2WAY)
    - Cap holds (bucket = FA)
    - Dead money (bucket = TERM)
    - EXISTS_ONLY section (non-counting rows with future-year amounts)
    - Reconciliation block proving grid sums match warehouse totals

    Per the blueprint:
    - Every headline total must be reconcilable
    - Detail tables are labeled by bucket
    - MINIMUM label appears for min contracts
    - % of cap displayed for context
    - EXISTS_ONLY rows are clearly labeled as non-counting (Ct$=N, CtR=N)

    Args:
        workbook: The XlsxWriter Workbook
        worksheet: The ROSTER_GRID worksheet
        formats: Standard format dict from create_standard_formats
    """
    # Sheet title
    worksheet.write(0, 0, "ROSTER GRID", formats["header"])
    worksheet.write(1, 0, "Full roster/ledger view with explicit bucket classification")

    # Write read-only command bar
    write_command_bar_readonly(workbook, worksheet, formats)

    # Set column widths
    for col, width in COLUMN_WIDTHS.items():
        worksheet.set_column(col, col, width)

    # Create roster-specific formats
    roster_formats = _create_roster_formats(workbook)

    # Content starts after command bar
    content_row = get_content_start_row()

    # 1. Roster section (active contracts)
    content_row, roster_data_start = _write_roster_section(workbook, worksheet, content_row, formats, roster_formats)

    # Calculate roster data end row for conditional formatting
    roster_data_end = roster_data_start + num_roster_rows - 1

    # 2. Two-way section
    content_row = _write_twoway_section(workbook, worksheet, content_row, formats, roster_formats)

    # 3. Cap holds section
    content_row = _write_cap_holds_section(workbook, worksheet, content_row, formats, roster_formats)

    # 4. Dead money section
    content_row = _write_dead_money_section(workbook, worksheet, content_row, formats, roster_formats)

    # 5. GENERATED section (roster fill assumptions)
    # Creates fill rows when RosterFillTarget is 12/14/15
    # Controlled by RosterFillTarget toggle (0 = disabled)
    content_row = _write_generated_section(workbook, worksheet, content_row, formats, roster_formats)

    # 6. EXISTS_ONLY section (non-counting rows for analyst reference)
    # Shows players with $0 in SelectedYear but future-year amounts
    # Controlled by ShowExistsOnlyRows toggle (hidden when "No")
    content_row = _write_exists_only_section(workbook, worksheet, content_row, formats, roster_formats)

    # 7. Reconciliation block
    content_row = _write_reconciliation_block(workbook, worksheet, content_row, formats, roster_formats)

    # 8. Apply badge conditional formatting to roster section
    # Colors option/guarantee/trade columns based on cell values
    _apply_badge_conditional_formatting(
        worksheet, roster_formats, roster_data_start, roster_data_end
    )

    # Sheet protection
    worksheet.protect(options={
        "objects": True,
        "scenarios": True,
        "format_cells": False,
        "select_unlocked_cells": True,
        "select_locked_cells": True,
    })
