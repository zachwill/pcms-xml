"""
META sheet writer.

The META sheet records build metadata so every workbook snapshot is reproducible.
Fields:
- refreshed_at: UTC timestamp of workbook generation
- base_year: Base salary year (e.g., 2025)
- as_of_date: As-of date for the snapshot
- league_lk: League code (e.g., NBA)
- data_contract_version: Version string for the Postgres→Excel data contract
- exporter_git_sha: Git commit SHA of the exporter
- validation_status: PASS or FAILED
- validation_errors: Error messages if validation failed
- reconcile_*: Lightweight reconciliation summary (v1)

If validation fails, a prominent "FAILED" banner is displayed.
"""

from __future__ import annotations

from typing import Any

from xlsxwriter.worksheet import Worksheet


# Layout constants
COL_LABEL = 0
COL_VALUE = 1
COL_VALUE2 = 2  # For reconciliation details
COL_VALUE3 = 3
BANNER_START_ROW = 0
FIELDS_START_ROW = 3


def write_meta_sheet(
    worksheet: Worksheet,
    formats: dict[str, Any],
    build_meta: dict[str, Any],
) -> None:
    """
    Write the META sheet with build metadata.

    The sheet includes:
    - A prominent validation status banner (PASS or FAILED)
    - Key-value pairs for metadata fields
    - Error details if validation failed
    - Reconciliation summary (v1)

    Args:
        worksheet: The META worksheet
        formats: Standard format dict from xlsx.create_standard_formats()
        build_meta: Build metadata dict containing:
            - refreshed_at (str): ISO timestamp
            - base_year (int): Base salary year
            - as_of_date (str): ISO date
            - league_lk (str): League code (e.g., "NBA")
            - data_contract_version (str): Data contract version string
            - exporter_git_sha (str): Git commit SHA
            - validation_status (str): "PASS" or "FAILED"
            - validation_errors (list[str]): Error messages
            - reconcile_* (various): Reconciliation summary fields
    """
    validation_status = build_meta.get("validation_status", "UNKNOWN")
    validation_errors = build_meta.get("validation_errors", [])

    # Set column widths for readability
    worksheet.set_column(COL_LABEL, COL_LABEL, 26)  # Label column
    worksheet.set_column(COL_VALUE, COL_VALUE, 60)  # Value column
    worksheet.set_column(COL_VALUE2, COL_VALUE2, 15)  # Reconcile detail
    worksheet.set_column(COL_VALUE3, COL_VALUE3, 15)  # Reconcile detail

    # === Validation status banner ===
    # This is the most important visual element - analysts should see status immediately
    if validation_status == "PASS":
        worksheet.write(BANNER_START_ROW, COL_LABEL, "✓ VALIDATION PASSED", formats["alert_ok"])
        worksheet.write(BANNER_START_ROW, COL_VALUE, "", formats["alert_ok"])
    else:
        # FAILED banner - highly visible
        worksheet.write(BANNER_START_ROW, COL_LABEL, "✗ VALIDATION FAILED", formats["alert_fail"])
        worksheet.write(BANNER_START_ROW, COL_VALUE, "Do not trust these numbers!", formats["alert_fail"])

    # === Metadata fields ===
    row = FIELDS_START_ROW

    # refreshed_at
    worksheet.write(row, COL_LABEL, "refreshed_at")
    worksheet.write(row, COL_VALUE, build_meta.get("refreshed_at", ""))
    row += 1

    # base_year
    worksheet.write(row, COL_LABEL, "base_year")
    worksheet.write(row, COL_VALUE, build_meta.get("base_year", ""))
    row += 1

    # as_of_date
    worksheet.write(row, COL_LABEL, "as_of_date")
    worksheet.write(row, COL_VALUE, build_meta.get("as_of_date", ""))
    row += 1

    # league_lk
    worksheet.write(row, COL_LABEL, "league_lk")
    worksheet.write(row, COL_VALUE, build_meta.get("league_lk", ""))
    row += 1

    # data_contract_version
    worksheet.write(row, COL_LABEL, "data_contract_version")
    worksheet.write(row, COL_VALUE, build_meta.get("data_contract_version", ""))
    row += 1

    # exporter_git_sha
    worksheet.write(row, COL_LABEL, "exporter_git_sha")
    worksheet.write(row, COL_VALUE, build_meta.get("exporter_git_sha", ""))
    row += 1

    # validation_status
    worksheet.write(row, COL_LABEL, "validation_status")
    if validation_status == "PASS":
        worksheet.write(row, COL_VALUE, "PASS", formats["alert_ok"])
    else:
        worksheet.write(row, COL_VALUE, "FAILED", formats["alert_fail"])
    row += 1

    # === Validation errors (if any) ===
    if validation_status != "PASS" and validation_errors:
        row += 1  # Blank row
        worksheet.write(row, COL_LABEL, "Validation Errors:", formats["header"])
        row += 1

        for error in validation_errors:
            # Truncate long error messages and wrap if needed
            error_text = str(error)[:1000] if error else ""
            worksheet.write(row, COL_LABEL, error_text)
            row += 1

    # === Reconciliation summary (v1) ===
    row += 1  # Blank row
    worksheet.write(row, COL_LABEL, "Reconciliation Summary", formats["header"])
    row += 1

    reconcile_passed = build_meta.get("reconcile_passed")
    reconcile_total = build_meta.get("reconcile_total_checks", 0)
    reconcile_failed = build_meta.get("reconcile_failed_checks", 0)

    if reconcile_passed is None:
        # Reconciliation was not run (perhaps data extraction failed)
        worksheet.write(row, COL_LABEL, "reconcile_status")
        worksheet.write(row, COL_VALUE, "NOT RUN", formats["alert_warn"])
        row += 1
    else:
        # Reconciliation status
        worksheet.write(row, COL_LABEL, "reconcile_status")
        if reconcile_passed:
            worksheet.write(row, COL_VALUE, "PASS", formats["alert_ok"])
        else:
            worksheet.write(row, COL_VALUE, "FAILED", formats["alert_fail"])
        row += 1

        # Check counts
        worksheet.write(row, COL_LABEL, "reconcile_total_checks")
        worksheet.write(row, COL_VALUE, reconcile_total)
        row += 1

        worksheet.write(row, COL_LABEL, "reconcile_passed_checks")
        worksheet.write(row, COL_VALUE, build_meta.get("reconcile_passed_checks", 0))
        row += 1

        worksheet.write(row, COL_LABEL, "reconcile_failed_checks")
        if reconcile_failed > 0:
            worksheet.write(row, COL_VALUE, reconcile_failed, formats["alert_fail"])
        else:
            worksheet.write(row, COL_VALUE, 0)
        row += 1

        # Show failures if any
        failures = build_meta.get("reconcile_failures", [])
        if failures:
            row += 1  # Blank row
            worksheet.write(row, COL_LABEL, "Reconciliation Failures:", formats["header"])
            worksheet.write(row, COL_VALUE, "Team/Year")
            worksheet.write(row, COL_VALUE2, "Check")
            worksheet.write(row, COL_VALUE3, "Delta")
            row += 1

            for fail in failures[:10]:  # Limit display
                team_year = f"{fail.get('team_code', '?')}/{fail.get('salary_year', '?')}"
                worksheet.write(row, COL_LABEL, "")
                worksheet.write(row, COL_VALUE, team_year)
                worksheet.write(row, COL_VALUE2, fail.get("check", ""))
                worksheet.write(row, COL_VALUE3, fail.get("delta", 0), formats["alert_fail"])
                row += 1

        # Show sample checks for audit transparency
        sample_checks = build_meta.get("reconcile_sample_checks", [])
        if sample_checks and reconcile_passed:
            row += 1  # Blank row
            worksheet.write(row, COL_LABEL, "Sample Checks (passed):", formats["header"])
            row += 1

            for check in sample_checks[:3]:  # Just a few samples
                team_year = f"{check.get('team_code', '?')}/{check.get('salary_year', '?')}"
                check_name = check.get("check", "")
                worksheet.write(row, COL_LABEL, f"  ✓ {team_year}")
                worksheet.write(row, COL_VALUE, check_name)
                row += 1
