"""
Audit sheet formula helpers.

SUMIFS, COUNTIFS, and LET + FILTER formula builders for audit reconciliation.
"""

from __future__ import annotations


# =============================================================================
# Warehouse SUMIFS formulas
# =============================================================================

def warehouse_sumifs(column: str) -> str:
    """Build SUMIFS formula for team_salary_warehouse filtered by SelectedTeam + SelectedYear."""
    return (
        f"SUMIFS(tbl_team_salary_warehouse[{column}],"
        f"tbl_team_salary_warehouse[team_code],SelectedTeam,"
        f"tbl_team_salary_warehouse[salary_year],SelectedYear)"
    )


# =============================================================================
# Salary Book LET + FILTER patterns (modern Excel 365/2021+)
# =============================================================================

def salary_book_filter_sum(col_base: str, *, is_two_way: bool) -> str:
    """Sum selected-year amounts from salary_book_warehouse using LET + FILTER + SUM.

    Replaces the legacy SUMPRODUCT pattern with modern dynamic arrays.

    salary_book_warehouse exports relative-year columns (cap_y0..cap_y5, etc.)
    relative to MetaBaseYear. We use CHOOSE to extract the correct year column.

    Args:
        col_base: Column prefix (cap, tax, apron)
        is_two_way: Filter to two-way (True) or non-two-way (False) rows

    Returns:
        Formula string (no leading '=') using LET + FILTER + SUM
    """
    two_way_val = "TRUE" if is_two_way else "FALSE"

    # Build the year column selector using CHOOSE (ModeYearIndex = SelectedYear-MetaBaseYear+1)
    year_cols = ",".join(f"tbl_salary_book_warehouse[{col_base}_y{i}]" for i in range(6))
    year_col_expr = f"CHOOSE(ModeYearIndex,{year_cols})"

    return (
        "LET("
        "_xlpm.tbl,tbl_salary_book_warehouse,"
        "_xlpm.team_mask,_xlpm.tbl[team_code]=SelectedTeam,"
        f"_xlpm.twoway_mask,_xlpm.tbl[is_two_way]={two_way_val},"
        f"_xlpm.year_col,{year_col_expr},"
        "_xlpm.mask,_xlpm.team_mask*_xlpm.twoway_mask,"
        "IFERROR(SUM(FILTER(_xlpm.year_col,_xlpm.mask,0)),0)"
        ")"
    )


def salary_book_filter_count(*, is_two_way: bool) -> str:
    """Count salary_book rows with selected-year cap > 0 using LET + FILTER + ROWS.

    Replaces the legacy SUMPRODUCT(--, --, --) pattern with modern dynamic arrays.

    Args:
        is_two_way: Filter to two-way (True) or non-two-way (False) rows

    Returns:
        Formula string (no leading '=') using LET + FILTER + ROWS
    """
    two_way_val = "TRUE" if is_two_way else "FALSE"

    # Build the year column selector for cap using CHOOSE
    cap_year_cols = ",".join(f"tbl_salary_book_warehouse[cap_y{i}]" for i in range(6))
    cap_year_col_expr = f"CHOOSE(ModeYearIndex,{cap_year_cols})"

    return (
        "LET("
        "_xlpm.tbl,tbl_salary_book_warehouse,"
        "_xlpm.team_mask,_xlpm.tbl[team_code]=SelectedTeam,"
        f"_xlpm.twoway_mask,_xlpm.tbl[is_two_way]={two_way_val},"
        f"_xlpm.cap_col,{cap_year_col_expr},"
        "_xlpm.cap_mask,_xlpm.cap_col>0,"
        "_xlpm.mask,_xlpm.team_mask*_xlpm.twoway_mask*_xlpm.cap_mask,"
        "_xlpm.filtered,FILTER(_xlpm.tbl[player_id],_xlpm.mask,\"\"),"
        "IF(ISTEXT(_xlpm.filtered),0,ROWS(_xlpm.filtered))"
        ")"
    )


# =============================================================================
# Cap Holds SUMIFS/COUNTIFS formulas
# =============================================================================

def cap_holds_sumifs(column: str) -> str:
    """Build SUMIFS formula for cap_holds_warehouse."""
    return (
        f"SUMIFS(tbl_cap_holds_warehouse[{column}],"
        f"tbl_cap_holds_warehouse[team_code],SelectedTeam,"
        f"tbl_cap_holds_warehouse[salary_year],SelectedYear)"
    )


def cap_holds_countifs() -> str:
    """Build COUNTIFS formula for cap_holds_warehouse."""
    return (
        f"COUNTIFS(tbl_cap_holds_warehouse[team_code],SelectedTeam,"
        f"tbl_cap_holds_warehouse[salary_year],SelectedYear,"
        f'tbl_cap_holds_warehouse[cap_amount],">0")'
    )


# =============================================================================
# Dead Money SUMIFS/COUNTIFS formulas
# =============================================================================

def dead_money_sumifs(column: str) -> str:
    """Build SUMIFS formula for dead_money_warehouse."""
    return (
        f"SUMIFS(tbl_dead_money_warehouse[{column}],"
        f"tbl_dead_money_warehouse[team_code],SelectedTeam,"
        f"tbl_dead_money_warehouse[salary_year],SelectedYear)"
    )


def dead_money_countifs() -> str:
    """Build COUNTIFS formula for dead_money_warehouse."""
    return (
        f"COUNTIFS(tbl_dead_money_warehouse[team_code],SelectedTeam,"
        f"tbl_dead_money_warehouse[salary_year],SelectedYear,"
        f'tbl_dead_money_warehouse[cap_value],">0")'
    )


# =============================================================================
# Composite formulas for summary banner
# =============================================================================

def build_total_drilldown_formula(col_base: str, cap_col: str, tax_col: str, apron_col: str) -> str:
    """Build total drilldown sum formula for a given mode (cap/tax/apron).
    
    Args:
        col_base: Column prefix for salary_book (cap, tax, apron)
        cap_col: Column name in cap_holds_warehouse
        tax_col: Column name in dead_money_warehouse
        apron_col: Not used directly, kept for signature consistency
    
    Returns:
        Formula computing: salary_book(non-2way) + salary_book(2way) + cap_holds + dead_money
    """
    return (
        f"({salary_book_filter_sum(col_base, is_two_way=False)})"
        f"+({salary_book_filter_sum(col_base, is_two_way=True)})"
        f"+({cap_holds_sumifs(cap_col)})"
        f"+({dead_money_sumifs(tax_col)})"
    )
