import { useMemo, useState } from "react";
import { cx, formatters } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useSystemValues, useTaxRates } from "../../hooks";

function formatCurrency(value: number | null): string {
  return value === null ? "—" : formatters.compactCurrency(value);
}

function formatDate(value: string | null): string {
  return value === null ? "—" : value;
}

function formatRate(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
      {children}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-sm font-medium">{value}</span>
    </div>
  );
}

/**
 * SystemValuesView — League constants reference panel.
 *
 * This is a "cockpit reference" view: cap/tax/apron lines, exception constants,
 * key calendar dates, and the luxury tax bracket table.
 */
export function SystemValuesView({ className }: { className?: string }) {
  const { systemValues, years, getForYear, isLoading, error } = useSystemValues();

  // Default to 2025 if present, otherwise the first year returned by the API.
  const defaultYear = useMemo(() => {
    if (years.includes(2025)) return 2025;
    return years[0] ?? 2025;
  }, [years]);

  const [year, setYear] = useState<number>(defaultYear);

  // If the set of available years changes (first load), keep year in range.
  // (useState initializer runs only once)
  const resolvedYear = years.includes(year) ? year : defaultYear;

  const values = getForYear(resolvedYear);
  const { taxRates, isLoading: taxLoading, error: taxError } = useTaxRates(resolvedYear);

  const title = `${resolvedYear}-${String(resolvedYear + 1).slice(-2)} System Values`;

  if (isLoading) {
    return (
      <div className={cx("space-y-4", className)}>
        <div className="text-sm text-muted-foreground">Loading system values…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cx("space-y-4", className)}>
        <div className="text-sm text-red-500">Failed to load system values</div>
        <div className="text-xs text-muted-foreground font-mono">{error.message}</div>
      </div>
    );
  }

  return (
    <div className={cx("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">NBA league constants</div>
        </div>

        <div className="w-[120px]">
          <Select
            value={String(resolvedYear)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!values ? (
        <div className="text-sm text-muted-foreground">No system values for {resolvedYear}.</div>
      ) : (
        <>
          {/* Lines */}
          <div className="border-t border-border pt-4">
            <SectionTitle>Lines</SectionTitle>
            <div className="space-y-0.5">
              <StatRow label="Salary Cap" value={formatCurrency(values.salary_cap_amount)} />
              <StatRow label="Tax Level" value={formatCurrency(values.tax_level_amount)} />
              <StatRow label="1st Apron" value={formatCurrency(values.first_apron_amount)} />
              <StatRow label="2nd Apron" value={formatCurrency(values.second_apron_amount)} />
              <StatRow
                label="Minimum Team Salary"
                value={formatCurrency(values.minimum_team_salary_amount)}
              />
              <StatRow label="Tax Bracket Size" value={formatCurrency(values.tax_bracket_amount)} />
            </div>
          </div>

          {/* Exceptions / constants */}
          <div className="border-t border-border pt-4">
            <SectionTitle>Exceptions & Constants</SectionTitle>
            <div className="space-y-0.5">
              <StatRow
                label="Non-Taxpayer MLE"
                value={formatCurrency(values.non_taxpayer_mid_level_amount)}
              />
              <StatRow
                label="Taxpayer MLE"
                value={formatCurrency(values.taxpayer_mid_level_amount)}
              />
              <StatRow
                label="Room MLE"
                value={formatCurrency(values.room_mid_level_amount)}
              />
              <StatRow label="BAE" value={formatCurrency(values.bi_annual_amount)} />
              <StatRow
                label="TPE Allowance"
                value={formatCurrency(values.tpe_dollar_allowance)}
              />
              <StatRow
                label="Max Trade Cash"
                value={formatCurrency(values.max_trade_cash_amount)}
              />
              <StatRow
                label="Int'l Payment Limit"
                value={formatCurrency(values.international_player_payment_limit)}
              />
              <StatRow
                label="Two-Way Salary"
                value={formatCurrency(values.two_way_salary_amount)}
              />
            </div>
          </div>

          {/* Maximum salaries */}
          <div className="border-t border-border pt-4">
            <SectionTitle>Maximum Salaries</SectionTitle>
            <div className="space-y-0.5">
              <StatRow label="Max 25%" value={formatCurrency(values.maximum_salary_25_pct)} />
              <StatRow label="Max 30%" value={formatCurrency(values.maximum_salary_30_pct)} />
              <StatRow label="Max 35%" value={formatCurrency(values.maximum_salary_35_pct)} />
            </div>
          </div>

          {/* Calendar */}
          <div className="border-t border-border pt-4">
            <SectionTitle>Calendar</SectionTitle>
            <div className="space-y-0.5">
              <StatRow label="Season Start" value={formatDate(values.season_start_at)} />
              <StatRow label="Season End" value={formatDate(values.season_end_at)} />
              <StatRow label="Moratorium Start" value={formatDate(values.moratorium_start_at)} />
              <StatRow label="Moratorium End" value={formatDate(values.moratorium_end_at)} />
              <StatRow label="Trade Deadline" value={formatDate(values.trade_deadline_at)} />
              <StatRow label="Dec 15 Trade Lift" value={formatDate(values.dec_15_trade_lift_at)} />
              <StatRow label="Jan 15 Trade Lift" value={formatDate(values.jan_15_trade_lift_at)} />
              <StatRow label="Jan 10 Guarantee" value={formatDate(values.jan_10_guarantee_at)} />
              <StatRow
                label="Days in Season"
                value={values.days_in_season === null ? "—" : String(values.days_in_season)}
              />
            </div>
          </div>

          {/* Luxury tax brackets */}
          <div className="border-t border-border pt-4">
            <SectionTitle>Luxury Tax Brackets</SectionTitle>

            {taxLoading ? (
              <div className="text-sm text-muted-foreground">Loading tax brackets…</div>
            ) : taxError ? (
              <div className="text-sm text-red-500">Failed to load tax brackets</div>
            ) : taxRates.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No tax bracket rows available for {resolvedYear}.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_70px_70px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  <div>Over Tax</div>
                  <div className="text-right">Rate</div>
                  <div className="text-right">Rep.</div>
                </div>

                <div className="space-y-1">
                  {taxRates.map((r) => {
                    const range = `${formatCurrency(r.lower_limit)}–${
                      r.upper_limit === null ? "∞" : formatCurrency(r.upper_limit)
                    }`;
                    return (
                      <div
                        key={`${r.year}-${r.lower_limit}`}
                        className="grid grid-cols-[1fr_70px_70px] gap-2 items-baseline"
                      >
                        <div className="font-mono tabular-nums text-xs">{range}</div>
                        <div className="font-mono tabular-nums text-xs text-right">
                          {formatRate(r.tax_rate_non_repeater)}
                        </div>
                        <div className="font-mono tabular-nums text-xs text-right">
                          {formatRate(r.tax_rate_repeater)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-muted-foreground">
                  Rates are per-dollar multipliers for each bracket (amount over the tax line).
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
