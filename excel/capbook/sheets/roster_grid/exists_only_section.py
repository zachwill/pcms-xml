from __future__ import annotations

from typing import Any

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from .helpers import (
    COL_BUCKET, COL_COUNTS_TOTAL, COL_COUNTS_ROSTER, COL_NAME,
    COL_OPTION, COL_GUARANTEE, COL_TRADE, COL_MIN_LABEL,
    COL_CAP_Y0, COL_PCT_CAP,
    num_exists_rows
)


def _write_exists_only_section(
    workbook: Workbook,
    worksheet: Worksheet,
    row: int,
    formats: dict[str, Any],
    roster_formats: dict[str, Any],
) -> int:
    """Write the EXISTS_ONLY section (non-counting rows for analyst reference).

    This section shows players who:
    - Belong to SelectedTeam
    - Have $0 in SelectedYear (across all modes: cap/tax/apron all zero)
    - But have non-zero amounts in a future year

    These rows "exist" in the salary book but do NOT count toward current year totals.
    They're useful for planning context (e.g., future-year commitments, option years).

    The section is controlled by ShowExistsOnlyRows toggle:
    - When "No" (default): shows a collapsed message explaining the section is hidden
    - When "Yes": shows the full listing of exists-only rows

    Per the blueprint (mental-models-and-design-principles.md):
    - EXISTS_ONLY rows are labeled as "visible artifacts that do not count (for reference only)"
    - Ct$ = N, CtR = N (never counted)

    Uses Excel 365 dynamic arrays: LET, FILTER, SORTBY, TAKE, BYROW (or MAP for per-row computation).
    The future_total is computed per-player as the sum of future-year amounts (any mode).

    Returns next row.
    """
    section_fmt = roster_formats["section_header_exists_only"]

    # Section header with explanatory text
    worksheet.merge_range(
        row, COL_BUCKET, row, COL_PCT_CAP,
        "EXISTS_ONLY (Future-Year Contracts - does NOT count in SelectedYear)",
        section_fmt
    )
    row += 1

    # Explanatory note
    note_fmt = workbook.add_format({
        "italic": True,
        "font_size": 9,
        "font_color": "#6B7280",  # gray-500
    })
    worksheet.merge_range(row, COL_BUCKET, row, COL_PCT_CAP, "", note_fmt)
    worksheet.write(
        row, COL_BUCKET,
        "Players with $0 this year but future-year amounts. For analyst reference only - excluded from totals.",
        note_fmt
    )
    row += 1

    # Note about dynamic arrays
    worksheet.write(row, COL_BUCKET, "Dynamic array: EXISTS_ONLY players filtered by future-year amounts (uses LET/FILTER/SORTBY)", roster_formats["reconcile_label"])
    row += 1

    # Column headers (only shown when ShowExistsOnlyRows = "Yes")
    fmt = roster_formats["col_header"]
    hidden_text_fmt = workbook.add_format({
        "italic": True,
        "font_color": "#9CA3AF",  # gray-400
        "font_size": 9,
    })

    # Write conditional header row
    # When ShowExistsOnlyRows = "Yes", show column headers; otherwise show toggle hint
    worksheet.write_formula(
        row, COL_BUCKET,
        '=IF(ShowExistsOnlyRows="Yes","Bucket","Set ShowExistsOnlyRows=Yes to display")',
        fmt
    )
    worksheet.write_formula(row, COL_COUNTS_TOTAL, '=IF(ShowExistsOnlyRows="Yes","Ct$","")', fmt)
    worksheet.write_formula(row, COL_COUNTS_ROSTER, '=IF(ShowExistsOnlyRows="Yes","CtR","")', fmt)
    worksheet.write_formula(row, COL_NAME, '=IF(ShowExistsOnlyRows="Yes","Name","")', fmt)
    worksheet.write_formula(row, COL_OPTION, '=IF(ShowExistsOnlyRows="Yes","","")', fmt)
    worksheet.write_formula(row, COL_GUARANTEE, '=IF(ShowExistsOnlyRows="Yes","","")', fmt)
    worksheet.write_formula(row, COL_TRADE, '=IF(ShowExistsOnlyRows="Yes","","")', fmt)
    worksheet.write_formula(row, COL_MIN_LABEL, '=IF(ShowExistsOnlyRows="Yes","Future Total","")', fmt)

    # Year column headers (show year when active)
    for yi in range(6):
        worksheet.write_formula(
            row, COL_CAP_Y0 + yi,
            f'=IF(ShowExistsOnlyRows="Yes",SelectedMode&" "&(MetaBaseYear+{yi}),"")',
            fmt
        )
    worksheet.write_formula(row, COL_PCT_CAP, '=IF(ShowExistsOnlyRows="Yes","Note","")', fmt)
    row += 1

    # =========================================================================
    # Dynamic Array Formula: LET + FILTER + SORTBY for EXISTS_ONLY rows
    # =========================================================================
    #
    # Design: We use a single spilling formula per column that:
    # 1. Computes per-row "current year amount" (all modes must be zero)
    # 2. Computes per-row "future total" (sum of future years in any mode)
    # 3. FILTERs to SelectedTeam + current=0 + future>0
    # 4. SORTBYs by future_total (DESC) - biggest future commitments first
    # 5. TAKEs first N rows

    # -------------------------------------------------------------------------
    # LET prefix for EXISTS_ONLY filtering
    # -------------------------------------------------------------------------

    def exists_only_let_prefix() -> str:
        """Return LET prefix for EXISTS_ONLY filtering (computes current and future amounts)."""
        # Current year amounts per mode (using CHOOSE with (SelectedYear-MetaBaseYear+1))
        cap_curr = ",".join(f"tbl_salary_book_warehouse[cap_y{i}]" for i in range(6))
        tax_curr = ",".join(f"tbl_salary_book_warehouse[tax_y{i}]" for i in range(6))
        apron_curr = ",".join(f"tbl_salary_book_warehouse[apron_y{i}]" for i in range(6))

        # Future year sums per mode (CHOOSE returns sum of years after selected)
        # For each starting index, sum remaining years
        def future_choose(prefix: str) -> str:
            sums = []
            for start_idx in range(6):
                if start_idx >= 5:
                    sums.append("0")  # Year 5 has no future
                else:
                    cols = "+".join(f"tbl_salary_book_warehouse[{prefix}_y{j}]" for j in range(start_idx + 1, 6))
                    sums.append(f"({cols})")
            return f"CHOOSE((SelectedYear-MetaBaseYear+1),{','.join(sums)})"

        return (
            # Current year amounts per mode
            f"_xlpm.curr_cap,CHOOSE((SelectedYear-MetaBaseYear+1),{cap_curr}),"
            f"_xlpm.curr_tax,CHOOSE((SelectedYear-MetaBaseYear+1),{tax_curr}),"
            f"_xlpm.curr_apron,CHOOSE((SelectedYear-MetaBaseYear+1),{apron_curr}),"
            # Future year sums per mode
            f"_xlpm.future_cap,{future_choose('cap')},"
            f"_xlpm.future_tax,{future_choose('tax')},"
            f"_xlpm.future_apron,{future_choose('apron')},"
            # Combined future total (any mode) - used for filter criterion
            "_xlpm.future_total,_xlpm.future_cap+_xlpm.future_tax+_xlpm.future_apron,"
            # Mode-aware future sum - used for sorting/display
            '_xlpm.future_mode,IF(SelectedMode="Cap",_xlpm.future_cap,IF(SelectedMode="Tax",_xlpm.future_tax,_xlpm.future_apron)),'
            # Filter condition: team match AND all current = 0 AND future > 0
            "_xlpm.filter_cond,(tbl_salary_book_warehouse[team_code]=SelectedTeam)*(_xlpm.curr_cap=0)*(_xlpm.curr_tax=0)*(_xlpm.curr_apron=0)*(_xlpm.future_total>0),"
        )

    # -------------------------------------------------------------------------
    # Player Name column (spills down)
    # -------------------------------------------------------------------------
    # When ShowExistsOnlyRows="No", returns empty array; otherwise spills names
    name_formula = (
        '=IF(ShowExistsOnlyRows<>"Yes","",LET('
        + exists_only_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_salary_book_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sort_key,FILTER(_xlpm.future_mode,_xlpm.filter_cond,0),"
        + f"IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sort_key,-1),{num_exists_rows}),\"\")))"
    )
    worksheet.write_formula(row, COL_NAME, name_formula)

    # -------------------------------------------------------------------------
    # Bucket column (EXISTS for non-empty rows)
    # -------------------------------------------------------------------------
    bucket_formula = (
        '=IF(ShowExistsOnlyRows<>"Yes","",LET('
        + exists_only_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_salary_book_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sort_key,FILTER(_xlpm.future_mode,_xlpm.filter_cond,0),"
        + f"_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sort_key,-1),{num_exists_rows}),\"\"),"
        + 'IF(_xlpm.names<>"","EXISTS","")))'
    )
    worksheet.write_formula(row, COL_BUCKET, bucket_formula, roster_formats["bucket_exists_only"])

    # -------------------------------------------------------------------------
    # CountsTowardTotal column (N for EXISTS_ONLY - never counts)
    # -------------------------------------------------------------------------
    ct_total_formula = (
        '=IF(ShowExistsOnlyRows<>"Yes","",LET('
        + exists_only_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_salary_book_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sort_key,FILTER(_xlpm.future_mode,_xlpm.filter_cond,0),"
        + f"_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sort_key,-1),{num_exists_rows}),\"\"),"
        + 'IF(_xlpm.names<>"","N","")))'
    )
    worksheet.write_formula(row, COL_COUNTS_TOTAL, ct_total_formula, roster_formats["counts_no"])

    # -------------------------------------------------------------------------
    # CountsTowardRoster column (N for EXISTS_ONLY - never counts)
    # -------------------------------------------------------------------------
    ct_roster_formula = (
        '=IF(ShowExistsOnlyRows<>"Yes","",LET('
        + exists_only_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_salary_book_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sort_key,FILTER(_xlpm.future_mode,_xlpm.filter_cond,0),"
        + f"_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sort_key,-1),{num_exists_rows}),\"\"),"
        + 'IF(_xlpm.names<>"","N","")))'
    )
    worksheet.write_formula(row, COL_COUNTS_ROSTER, ct_roster_formula, roster_formats["counts_no"])

    # Option/Guarantee/Trade - empty for EXISTS_ONLY (these are future contracts)
    worksheet.write(row, COL_OPTION, "")
    worksheet.write(row, COL_GUARANTEE, "")
    worksheet.write(row, COL_TRADE, "")

    # -------------------------------------------------------------------------
    # Future Total column (shows mode-aware future sum for context)
    # -------------------------------------------------------------------------
    future_total_formula = (
        '=IF(ShowExistsOnlyRows<>"Yes","",LET('
        + exists_only_let_prefix()
        + "_xlpm.filtered,FILTER(_xlpm.future_mode,_xlpm.filter_cond,\"\"),"
        + "_xlpm.sort_key,FILTER(_xlpm.future_mode,_xlpm.filter_cond,0),"
        + f"IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sort_key,-1),{num_exists_rows}),\"\")))"
    )
    worksheet.write_formula(row, COL_MIN_LABEL, future_total_formula, roster_formats["money"])

    # -------------------------------------------------------------------------
    # Salary columns - show all years (mode-aware) so analyst can see future money
    # -------------------------------------------------------------------------
    for yi in range(6):
        sal_formula = (
            '=IF(ShowExistsOnlyRows<>"Yes","",LET('
            + exists_only_let_prefix()
            + f'_xlpm.year_col,IF(SelectedMode="Cap",tbl_salary_book_warehouse[cap_y{yi}],'
            + f'IF(SelectedMode="Tax",tbl_salary_book_warehouse[tax_y{yi}],'
            + f"tbl_salary_book_warehouse[apron_y{yi}])),"
            + "_xlpm.filtered,FILTER(_xlpm.year_col,_xlpm.filter_cond,\"\"),"
            + "_xlpm.sort_key,FILTER(_xlpm.future_mode,_xlpm.filter_cond,0),"
            + f"IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sort_key,-1),{num_exists_rows}),\"\")))"
        )
        worksheet.write_formula(row, COL_CAP_Y0 + yi, sal_formula, roster_formats["money"])

    # -------------------------------------------------------------------------
    # Note column - display "Future $" for non-empty rows
    # -------------------------------------------------------------------------
    note_formula = (
        '=IF(ShowExistsOnlyRows<>"Yes","",LET('
        + exists_only_let_prefix()
        + "_xlpm.filtered,FILTER(tbl_salary_book_warehouse[player_name],_xlpm.filter_cond,\"\"),"
        + "_xlpm.sort_key,FILTER(_xlpm.future_mode,_xlpm.filter_cond,0),"
        + f"_xlpm.names,IFNA(TAKE(SORTBY(_xlpm.filtered,_xlpm.sort_key,-1),{num_exists_rows}),\"\"),"
        + 'IF(_xlpm.names<>"","Future $","")))'
    )
    worksheet.write_formula(row, COL_PCT_CAP, note_formula, hidden_text_fmt)

    # Move past spill zone
    row += num_exists_rows

    # -------------------------------------------------------------------------
    # Count of exists-only rows (informational only, not part of totals)
    # -------------------------------------------------------------------------
    # Using LET + SUM(FILTER) pattern instead of SUMPRODUCT
    count_label_formula = '=IF(ShowExistsOnlyRows="Yes","Exists-Only Count:","")'
    worksheet.write_formula(row, COL_NAME, count_label_formula, roster_formats["subtotal_label"])

    # Count formula using LET + ROWS(FILTER)
    count_value_formula = (
        '=IF(ShowExistsOnlyRows<>"Yes","",LET('
        + exists_only_let_prefix()
        + 'IFERROR(ROWS(FILTER(tbl_salary_book_warehouse[player_name],_xlpm.filter_cond)),0)))'
    )
    worksheet.write_formula(row, COL_BUCKET, count_value_formula, roster_formats["subtotal_label"])

    row += 2

    return row
