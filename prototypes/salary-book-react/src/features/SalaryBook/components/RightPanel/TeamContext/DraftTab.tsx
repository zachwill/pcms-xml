import { cx, focusRing } from "@/lib/utils";
import { useShellSidebarContext } from "@/features/SalaryBook/shell";
import { usePicks } from "../../../hooks";
import type { DraftPick } from "../../../data";

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030] as const;

function roundLabel(round: DraftPick["round"]): string {
  return round === 1 ? "1st" : "2nd";
}

function pickTitle(pick: DraftPick): string {
  const base = `${pick.year} ${roundLabel(pick.round)} (${pick.origin_team_code})`;
  if (pick.is_swap) return `${base} — Swap`;
  if (pick.protections) return `${base} — ${pick.protections}`;
  if (pick.is_conditional) return `${base} — Conditional`;
  return base;
}

/**
 * DraftTab — Team-context sidebar tab
 *
 * Shows a compact pick inventory grouped by year.
 * Click a pick to open the Pick entity overlay.
 */
export function DraftTab({ teamCode }: { teamCode: string }) {
  const { pushEntity } = useShellSidebarContext();
  const { picks, isLoading, error } = usePicks(teamCode);

  const picksByYear = picks.reduce<Record<number, DraftPick[]>>((acc, pick) => {
    (acc[pick.year] ||= []).push(pick);
    return acc;
  }, {});

  if (isLoading && picks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Draft
        </div>
        <div
          className={cx(
            "p-4 rounded-lg",
            "bg-muted/30 border border-border/50",
            "text-sm text-muted-foreground"
          )}
        >
          Loading picks…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Draft
        </div>
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-700 dark:text-red-400">
            {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Pick Inventory
      </div>

      {YEARS.map((year) => {
        const yearPicks = picksByYear[year] ?? [];

        return (
          <div key={year} className="space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground tabular-nums">
              {year}
            </div>

            {yearPicks.length === 0 ? (
              <div className="text-xs text-muted-foreground/50">—</div>
            ) : (
              <div className="space-y-1">
                {yearPicks.map((pick) => (
                  <button
                    key={pick.id}
                    type="button"
                    onClick={() => {
                      pushEntity({
                        type: "pick",
                        teamCode: pick.team_code,
                        draftYear: pick.year,
                        draftRound: pick.round,
                        rawFragment: pick.description ?? pickTitle(pick),
                      });
                    }}
                    className={cx(
                      "w-full text-left",
                      "px-3 py-2 rounded-md",
                      "bg-muted/30 hover:bg-muted/50",
                      "border border-border/50",
                      "transition-colors",
                      focusRing()
                    )}
                    title={pick.description ?? undefined}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-sm font-medium truncate">
                        {pickTitle(pick)}
                      </div>
                      <div className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {pick.asset_type ?? ""}
                      </div>
                    </div>
                    {pick.protections && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {pick.protections}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
