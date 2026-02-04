import { cx } from "@/lib/utils";
import { usePlayerRights } from "../../../hooks";
import type { PlayerRight } from "../../../data";

const KIND_LABELS: Record<string, string> = {
  NBA_DRAFT_RIGHTS: "Draft Rights",
  DLG_RETURNING_RIGHTS: "G League Rights",
};

function formatDraftLabel(right: PlayerRight): string {
  const parts: string[] = [];

  if (right.draft_year) {
    parts.push(String(right.draft_year));
  }

  if (right.draft_round) {
    const roundLabel =
      right.draft_round === 1
        ? "1st"
        : right.draft_round === 2
          ? "2nd"
          : `R${right.draft_round}`;
    parts.push(roundLabel);
  }

  if (right.draft_pick) {
    parts.push(`#${right.draft_pick}`);
  }

  if (parts.length === 0) {
    return "Undrafted";
  }

  const base = parts.join(" · ");
  return right.draft_team_code ? `${base} (${right.draft_team_code})` : base;
}

function formatSourceLabel(right: PlayerRight): string {
  if (right.rights_source === "trade_team_details") {
    return right.source_trade_date
      ? `Trade · ${right.source_trade_date}`
      : "Trade";
  }

  if (right.rights_source === "people") {
    return right.draft_team_code
      ? `Drafted by ${right.draft_team_code}`
      : "Drafted";
  }

  return right.rights_source ?? "Source unknown";
}

function PlayerRightsRow({ right }: { right: PlayerRight }) {
  const draftLabel = formatDraftLabel(right);
  const sourceLabel = formatSourceLabel(right);

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-foreground">
          {right.player_name ?? "Unknown Player"}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {right.needs_review ? (
            <span
              className={cx(
                "px-1.5 py-0.5 rounded-full",
                "text-[9px] font-semibold uppercase tracking-wide",
                "bg-red-100 text-red-700",
                "dark:bg-red-900/40 dark:text-red-200"
              )}
            >
              Review
            </span>
          ) : null}
          {right.has_active_nba_contract ? (
            <span
              className={cx(
                "px-1.5 py-0.5 rounded-full",
                "text-[9px] font-semibold uppercase tracking-wide",
                "bg-amber-100 text-amber-700",
                "dark:bg-amber-900/40 dark:text-amber-200"
              )}
            >
              NBA Deal
            </span>
          ) : null}
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">{draftLabel}</div>
      <div className="text-[10px] text-muted-foreground">{sourceLabel}</div>
    </div>
  );
}

/**
 * PlayerRightsTab — Team-context sidebar tab
 *
 * Shows draft rights and G League returning rights for the active team.
 */
export function PlayerRightsTab({ teamCode }: { teamCode: string }) {
  const { rights, isLoading, error } = usePlayerRights(teamCode);

  const rightsByKind = rights.reduce<Record<string, PlayerRight[]>>((acc, right) => {
    const key = right.rights_kind;
    (acc[key] ||= []).push(right);
    return acc;
  }, {});

  const orderedKinds = Array.from(
    new Set([
      "NBA_DRAFT_RIGHTS",
      "DLG_RETURNING_RIGHTS",
      ...Object.keys(rightsByKind).sort(),
    ])
  );

  if (isLoading && rights.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Player Rights
        </div>
        <div
          className={cx(
            "p-4 rounded-lg",
            "bg-muted/30 border border-border/50",
            "text-sm text-muted-foreground"
          )}
        >
          Loading rights…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Player Rights
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
        Player Rights
      </div>

      {rights.length === 0 ? (
        <div className="text-xs text-muted-foreground/50">No rights on file.</div>
      ) : (
        orderedKinds.map((kind) => {
          const rows = rightsByKind[kind] ?? [];
          if (rows.length === 0) return null;

          return (
            <div key={kind} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-muted-foreground">
                  {KIND_LABELS[kind] ?? kind}
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  {rows.length}
                </div>
              </div>
              <div className="space-y-2">
                {rows.map((right) => (
                  <PlayerRightsRow key={right.id} right={right} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
