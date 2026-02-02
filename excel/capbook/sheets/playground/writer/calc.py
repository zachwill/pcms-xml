"""PLAYGROUND sheet CALC block writers."""

from __future__ import annotations

from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet

from .. import formulas
from ..layout import YEAR_OFFSETS, col_letter


def write_calc_sheet(workbook: Workbook, calc_worksheet: Worksheet) -> None:
    """Write the CALC worksheet formulas + defined names."""

    # Simple grid: each year offset gets its own row; each metric gets its own column.
    #
    #   Row:  off (0..3)
    #   Cols:
    #     B=RosterCount
    #     C=CapTotal
    #     D=TaxTotal
    #     E=ApronTotal
    #     F=DeadMoney
    #     G=RookieFillCount (fill-to-12)
    #     H=VetFillCount (fill-to-14)
    #     I=ProrationFactor (base year only)
    #     J=RookieMin (YOS 0)
    #     K=VetMin (YOS 2)
    #     L=RookieFillAmount
    #     M=VetFillAmount
    #     N=FillAmount
    #     O=CapTotalFilled
    #     P=TaxTotalFilled
    #     Q=ApronTotalFilled
    #     R=TaxPayment

    calc_worksheet.write(0, 1, "ScnRosterCount")
    calc_worksheet.write(0, 2, "ScnCapTotal")
    calc_worksheet.write(0, 3, "ScnTaxTotal")
    calc_worksheet.write(0, 4, "ScnApronTotal")
    calc_worksheet.write(0, 5, "ScnDeadMoney")

    calc_worksheet.write(0, 6, "ScnRookieFillCount")
    calc_worksheet.write(0, 7, "ScnVetFillCount")
    calc_worksheet.write(0, 8, "ScnProrationFactor")

    calc_worksheet.write(0, 9, "ScnRookieMin")
    calc_worksheet.write(0, 10, "ScnVetMin")

    calc_worksheet.write(0, 11, "ScnRookieFillAmount")
    calc_worksheet.write(0, 12, "ScnVetFillAmount")
    calc_worksheet.write(0, 13, "ScnFillAmount")

    calc_worksheet.write(0, 14, "ScnCapTotalFilled")
    calc_worksheet.write(0, 15, "ScnTaxTotalFilled")
    calc_worksheet.write(0, 16, "ScnApronTotalFilled")
    calc_worksheet.write(0, 17, "ScnTaxPayment")

    def _define_calc_name(name: str, row0: int, col0: int, formula: str) -> None:
        # Write the scalar formula into CALC.
        calc_worksheet.write_formula(row0, col0, formula)
        # Define name as a pure cell reference.
        colA = col_letter(col0)
        workbook.define_name(name, f"=CALC!${colA}${row0 + 1}")

    for off in YEAR_OFFSETS:
        year_expr = f"MetaBaseYear+{off}" if off else "MetaBaseYear"
        r0 = 1 + off

        # Base scenario metrics
        _define_calc_name(f"ScnRosterCount{off}", r0, 1, formulas.scenario_roster_count(year_expr=year_expr))
        _define_calc_name(f"ScnCapTotal{off}", r0, 2, formulas.scenario_team_total(year_expr=year_expr, year_offset=off))
        _define_calc_name(f"ScnTaxTotal{off}", r0, 3, formulas.scenario_tax_total(year_expr=year_expr, year_offset=off))
        _define_calc_name(f"ScnApronTotal{off}", r0, 4, formulas.scenario_apron_total(year_expr=year_expr, year_offset=off))
        _define_calc_name(f"ScnDeadMoney{off}", r0, 5, formulas.scenario_dead_money(year_expr=year_expr))

        # Roster fill semantics:
        # - fill-to-12 at rookie min (YOS 0)
        # - fill-to-14 at vet min (YOS 2)
        _define_calc_name(f"ScnRookieFillCount{off}", r0, 6, f"=MAX(0,12-ScnRosterCount{off})")
        _define_calc_name(f"ScnVetFillCount{off}", r0, 7, f"=MAX(0,14-ScnRosterCount{off})-ScnRookieFillCount{off}")

        # Base-year-only fill proration: days_remaining / days_in_season.
        if off == 0:
            _define_calc_name(
                f"ScnProrationFactor{off}",
                r0,
                8,
                "=LET("  # noqa: ISC003
                "_xlpm.y,MetaBaseYear,"
                "_xlpm.asof,DATEVALUE(MetaAsOfDate),"
                "_xlpm.end,IFERROR(XLOOKUP(_xlpm.y,tbl_system_values[salary_year],tbl_system_values[season_end_at]),0),"
                "_xlpm.d,IFERROR(XLOOKUP(_xlpm.y,tbl_system_values[salary_year],tbl_system_values[days_in_season]),0),"
                "_xlpm.rem,MAX(0,MIN(_xlpm.d,INT(_xlpm.end-_xlpm.asof+1))),"
                "IF(OR(_xlpm.end=0,_xlpm.d=0),1,_xlpm.rem/_xlpm.d)"
                ")",
            )
        else:
            _define_calc_name(f"ScnProrationFactor{off}", r0, 8, "=1")

        # Minimum salaries
        _define_calc_name(
            f"ScnRookieMin{off}",
            r0,
            9,
            f"=XLOOKUP(({year_expr})&0,tbl_minimum_scale[salary_year]&tbl_minimum_scale[years_of_service],tbl_minimum_scale[minimum_salary_amount])",
        )
        _define_calc_name(
            f"ScnVetMin{off}",
            r0,
            10,
            f"=XLOOKUP(({year_expr})&2,tbl_minimum_scale[salary_year]&tbl_minimum_scale[years_of_service],tbl_minimum_scale[minimum_salary_amount])",
        )

        # Fill amounts
        _define_calc_name(
            f"ScnRookieFillAmount{off}",
            r0,
            11,
            f"=ScnRookieFillCount{off}*ScnRookieMin{off}*ScnProrationFactor{off}",
        )
        _define_calc_name(
            f"ScnVetFillAmount{off}",
            r0,
            12,
            f"=ScnVetFillCount{off}*ScnVetMin{off}*ScnProrationFactor{off}",
        )
        _define_calc_name(f"ScnFillAmount{off}", r0, 13, f"=ScnRookieFillAmount{off}+ScnVetFillAmount{off}")

        # Filled totals (layer-aware)
        _define_calc_name(f"ScnCapTotalFilled{off}", r0, 14, f"=ScnCapTotal{off}+ScnFillAmount{off}")
        _define_calc_name(f"ScnTaxTotalFilled{off}", r0, 15, f"=ScnTaxTotal{off}+ScnFillAmount{off}")
        _define_calc_name(f"ScnApronTotalFilled{off}", r0, 16, f"=ScnApronTotal{off}+ScnFillAmount{off}")

        # Luxury tax payment (progressive via tbl_tax_rates)
        _define_calc_name(
            f"ScnTaxPayment{off}",
            r0,
            17,
            "=LET("  # noqa: ISC003
            f"_xlpm.y,{year_expr},"
            "_xlpm.taxLvl,IFERROR(XLOOKUP(_xlpm.y,tbl_system_values[salary_year],tbl_system_values[tax_level_amount]),0),"
            f"_xlpm.over,MAX(0,ScnTaxTotalFilled{off}-_xlpm.taxLvl),"
            "_xlpm.isRep,IFERROR(XLOOKUP(SelectedTeam&_xlpm.y,tbl_team_salary_warehouse[team_code]&tbl_team_salary_warehouse[salary_year],tbl_team_salary_warehouse[is_repeater_taxpayer],FALSE),FALSE),"
            "_xlpm.lower,IF(_xlpm.over=0,0,MAXIFS(tbl_tax_rates[lower_limit],tbl_tax_rates[salary_year],_xlpm.y,tbl_tax_rates[lower_limit],\"<=\"&_xlpm.over)),"
            "_xlpm.key,_xlpm.y&\"|\"&_xlpm.lower,"
            "_xlpm.rate,IF(_xlpm.over=0,0,XLOOKUP(_xlpm.key,tbl_tax_rates[salary_year]&\"|\"&tbl_tax_rates[lower_limit],IF(_xlpm.isRep,tbl_tax_rates[tax_rate_repeater],tbl_tax_rates[tax_rate_non_repeater]),0)),"
            "_xlpm.base,IF(_xlpm.over=0,0,XLOOKUP(_xlpm.key,tbl_tax_rates[salary_year]&\"|\"&tbl_tax_rates[lower_limit],IF(_xlpm.isRep,tbl_tax_rates[base_charge_repeater],tbl_tax_rates[base_charge_non_repeater]),0)),"
            "IF(_xlpm.over=0,0,_xlpm.base+(_xlpm.over-_xlpm.lower)*_xlpm.rate)"
            ")",
        )
