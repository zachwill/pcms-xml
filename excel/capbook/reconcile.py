"""
Lightweight reconciliation checks for workbook data integrity.

The goal is to verify that totals match drilldown sums at build time,
so the workbook META can report a reconciliation status.

Per mental-models-and-design-principles.md:
  "All displayed totals must be sourced from (or reconcile to)
   the authoritative counting ledger."

Reconciliation v1 checks:
- For each team/year in team_salary_warehouse:
  - cap_total should equal cap_rost + cap_fa + cap_term + cap_2way
  - tax_total should equal tax_rost + tax_fa + tax_term + tax_2way
  - apron_total should equal apron_rost + apron_fa + apron_term + apron_2way

Reconciliation v2 checks (drilldowns vs team totals):
- For each team/year:
  - warehouse cap_total should equal sum of drilldowns:
      salary_book_yearly[cap_amount] + cap_holds_warehouse[cap_amount] + dead_money_warehouse[cap_value]
  - warehouse tax_total should equal sum of drilldowns:
      salary_book_yearly[tax_amount] + cap_holds_warehouse[tax_amount] + dead_money_warehouse[tax_value]
  - warehouse apron_total should equal sum of drilldowns:
      salary_book_yearly[apron_amount] + cap_holds_warehouse[apron_amount] + dead_money_warehouse[apron_value]
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ReconcileCheck:
    """Result of a single reconciliation check."""

    team_code: str
    salary_year: int
    check_name: str  # e.g., "cap_total", "tax_total", "apron_total"
    expected: int  # headline total
    actual: int  # sum of bucket components
    delta: int  # expected - actual
    passed: bool  # True if delta == 0


@dataclass
class ReconcileSummary:
    """Summary of all reconciliation checks."""

    passed: bool = True
    total_checks: int = 0
    passed_checks: int = 0
    failed_checks: int = 0
    failures: list[ReconcileCheck] = field(default_factory=list)
    sample_checks: list[ReconcileCheck] = field(default_factory=list)

    def add_check(self, check: ReconcileCheck) -> None:
        """Add a check result to the summary."""
        self.total_checks += 1
        if check.passed:
            self.passed_checks += 1
        else:
            self.failed_checks += 1
            self.passed = False
            self.failures.append(check)

        # Keep a sample of checks for display (first 5 + any failures)
        if len(self.sample_checks) < 5 or not check.passed:
            self.sample_checks.append(check)

    def as_dict(self) -> dict[str, Any]:
        """Return summary as dict suitable for META."""
        return {
            "reconcile_passed": self.passed,
            "reconcile_total_checks": self.total_checks,
            "reconcile_passed_checks": self.passed_checks,
            "reconcile_failed_checks": self.failed_checks,
            "reconcile_failures": [
                {
                    "team_code": f.team_code,
                    "salary_year": f.salary_year,
                    "check": f.check_name,
                    "expected": f.expected,
                    "actual": f.actual,
                    "delta": f.delta,
                }
                for f in self.failures[:10]  # limit to 10 failures
            ],
            "reconcile_sample_checks": [
                {
                    "team_code": c.team_code,
                    "salary_year": c.salary_year,
                    "check": c.check_name,
                    "passed": c.passed,
                }
                for c in self.sample_checks[:5]  # just a sample
            ],
        }


def reconcile_team_salary_warehouse(
    team_salary_rows: list[dict[str, Any]],
) -> ReconcileSummary:
    """
    Reconcile team_salary_warehouse: verify totals match bucket sums.

    For each row (team/year), checks:
    - cap_total == cap_rost + cap_fa + cap_term + cap_2way
    - tax_total == tax_rost + tax_fa + tax_term + tax_2way
    - apron_total == apron_rost + apron_fa + apron_term + apron_2way
    """
    summary = ReconcileSummary()

    for row in team_salary_rows:
        team_code = row.get("team_code", "???")
        salary_year = row.get("salary_year", 0)

        # CAP reconciliation
        cap_total = row.get("cap_total") or 0
        cap_sum = (
            (row.get("cap_rost") or 0)
            + (row.get("cap_fa") or 0)
            + (row.get("cap_term") or 0)
            + (row.get("cap_2way") or 0)
        )
        cap_delta = cap_total - cap_sum
        summary.add_check(
            ReconcileCheck(
                team_code=team_code,
                salary_year=salary_year,
                check_name="cap_total",
                expected=cap_total,
                actual=cap_sum,
                delta=cap_delta,
                passed=(cap_delta == 0),
            )
        )

        # TAX reconciliation
        tax_total = row.get("tax_total") or 0
        tax_sum = (
            (row.get("tax_rost") or 0)
            + (row.get("tax_fa") or 0)
            + (row.get("tax_term") or 0)
            + (row.get("tax_2way") or 0)
        )
        tax_delta = tax_total - tax_sum
        summary.add_check(
            ReconcileCheck(
                team_code=team_code,
                salary_year=salary_year,
                check_name="tax_total",
                expected=tax_total,
                actual=tax_sum,
                delta=tax_delta,
                passed=(tax_delta == 0),
            )
        )

        # APRON reconciliation
        apron_total = row.get("apron_total") or 0
        apron_sum = (
            (row.get("apron_rost") or 0)
            + (row.get("apron_fa") or 0)
            + (row.get("apron_term") or 0)
            + (row.get("apron_2way") or 0)
        )
        apron_delta = apron_total - apron_sum
        summary.add_check(
            ReconcileCheck(
                team_code=team_code,
                salary_year=salary_year,
                check_name="apron_total",
                expected=apron_total,
                actual=apron_sum,
                delta=apron_delta,
                passed=(apron_delta == 0),
            )
        )

    return summary


def reconcile_drilldowns_vs_totals(
    team_salary_rows: list[dict[str, Any]],
    salary_book_rows: list[dict[str, Any]],
    cap_holds_rows: list[dict[str, Any]],
    dead_money_rows: list[dict[str, Any]],
) -> ReconcileSummary:
    """
    Reconcile v2: verify warehouse totals match drilldown sums.

    For each (team_code, salary_year) in team_salary_warehouse, verify:
    - cap_total == sum(salary_book_yearly.cap_amount) + sum(cap_holds.cap_amount) + sum(dead_money.cap_value)
    - tax_total == sum(salary_book_yearly.tax_amount) + sum(cap_holds.tax_amount) + sum(dead_money.tax_value)
    - apron_total == sum(salary_book_yearly.apron_amount) + sum(cap_holds.apron_amount) + sum(dead_money.apron_value)

    This is the "drilldowns roll up to headline totals" trust check.
    """
    summary = ReconcileSummary()

    # Build lookup dicts keyed by (team_code, salary_year)
    # salary_book_yearly has: team_code, salary_year, cap_amount, tax_amount, apron_amount
    salary_sums: dict[tuple[str, int], dict[str, int]] = {}
    for row in salary_book_rows:
        key = (row.get("team_code", ""), row.get("salary_year", 0))
        if key not in salary_sums:
            salary_sums[key] = {"cap": 0, "tax": 0, "apron": 0}
        salary_sums[key]["cap"] += row.get("cap_amount") or 0
        salary_sums[key]["tax"] += row.get("tax_amount") or 0
        salary_sums[key]["apron"] += row.get("apron_amount") or 0

    # cap_holds_warehouse has: team_code, salary_year, cap_amount, tax_amount, apron_amount
    holds_sums: dict[tuple[str, int], dict[str, int]] = {}
    for row in cap_holds_rows:
        key = (row.get("team_code", ""), row.get("salary_year", 0))
        if key not in holds_sums:
            holds_sums[key] = {"cap": 0, "tax": 0, "apron": 0}
        holds_sums[key]["cap"] += row.get("cap_amount") or 0
        holds_sums[key]["tax"] += row.get("tax_amount") or 0
        holds_sums[key]["apron"] += row.get("apron_amount") or 0

    # dead_money_warehouse has: team_code, salary_year, cap_value, tax_value, apron_value
    dead_sums: dict[tuple[str, int], dict[str, int]] = {}
    for row in dead_money_rows:
        key = (row.get("team_code", ""), row.get("salary_year", 0))
        if key not in dead_sums:
            dead_sums[key] = {"cap": 0, "tax": 0, "apron": 0}
        dead_sums[key]["cap"] += row.get("cap_value") or 0
        dead_sums[key]["tax"] += row.get("tax_value") or 0
        dead_sums[key]["apron"] += row.get("apron_value") or 0

    # For each team/year in warehouse, compare totals to drilldown sums
    for row in team_salary_rows:
        team_code = row.get("team_code", "???")
        salary_year = row.get("salary_year", 0)
        key = (team_code, salary_year)

        # Get drilldown sums (default to 0 if no rows)
        salary = salary_sums.get(key, {"cap": 0, "tax": 0, "apron": 0})
        holds = holds_sums.get(key, {"cap": 0, "tax": 0, "apron": 0})
        dead = dead_sums.get(key, {"cap": 0, "tax": 0, "apron": 0})

        # CAP check
        cap_total = row.get("cap_total") or 0
        cap_drilldown = salary["cap"] + holds["cap"] + dead["cap"]
        cap_delta = cap_total - cap_drilldown
        summary.add_check(
            ReconcileCheck(
                team_code=team_code,
                salary_year=salary_year,
                check_name="cap_drilldown",
                expected=cap_total,
                actual=cap_drilldown,
                delta=cap_delta,
                passed=(cap_delta == 0),
            )
        )

        # TAX check
        tax_total = row.get("tax_total") or 0
        tax_drilldown = salary["tax"] + holds["tax"] + dead["tax"]
        tax_delta = tax_total - tax_drilldown
        summary.add_check(
            ReconcileCheck(
                team_code=team_code,
                salary_year=salary_year,
                check_name="tax_drilldown",
                expected=tax_total,
                actual=tax_drilldown,
                delta=tax_delta,
                passed=(tax_delta == 0),
            )
        )

        # APRON check
        apron_total = row.get("apron_total") or 0
        apron_drilldown = salary["apron"] + holds["apron"] + dead["apron"]
        apron_delta = apron_total - apron_drilldown
        summary.add_check(
            ReconcileCheck(
                team_code=team_code,
                salary_year=salary_year,
                check_name="apron_drilldown",
                expected=apron_total,
                actual=apron_drilldown,
                delta=apron_delta,
                passed=(apron_delta == 0),
            )
        )

    return summary
