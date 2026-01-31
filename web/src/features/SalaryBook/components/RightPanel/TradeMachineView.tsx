import { useEffect, useMemo } from "react";
import { cx, formatters } from "@/lib/utils";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  useShellScrollContext,
  useTradeMachineContext,
} from "@/features/SalaryBook/shell";
import { useTeams, useTradeEvaluation, useSystemValues } from "../../hooks";
import type { TradePlayer, TradeReasonCode } from "../../data";

const FALLBACK_YEARS = [2025, 2026, 2027, 2028, 2029];

const WARNING_REASONS = new Set<TradeReasonCode>(["ALLOWANCE_ZERO_FIRST_APRON"]);

const REASON_LABELS: Record<string, string> = {
  ALLOWANCE_ZERO_FIRST_APRON: "First apron removes $250K cushion",
  MISSING_SYSTEM_VALUES: "Missing league system values",
  MISSING_TEAM_SALARY: "Missing team salary snapshot",
  MISSING_MATCHING_FORMULA: "No matching formula available",
  INCOMING_EXCEEDS_MAX: "Incoming salary exceeds max",
  OUTGOING_PLAYERS_NOT_FOUND: "Outgoing player rows missing",
  INCOMING_PLAYERS_NOT_FOUND: "Incoming player rows missing",
};

function formatCurrency(value: number | null): string {
  return value === null ? "—" : formatters.compactCurrency(value);
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
      {children}
    </div>
  );
}

function TeamChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide">
      {label}
    </span>
  );
}

function getTradeSalary(player: TradePlayer, year: number): number | null {
  switch (year) {
    case 2025:
      return player.cap_2025;
    case 2026:
      return player.cap_2026;
    case 2027:
      return player.cap_2027;
    case 2028:
      return player.cap_2028;
    case 2029:
      return player.cap_2029;
    case 2030:
      return player.cap_2030;
    default:
      return null;
  }
}

function TradePlayerRow({
  player,
  year,
  onRemove,
}: {
  player: TradePlayer;
  year: number;
  onRemove: () => void;
}) {
  const salary = getTradeSalary(player, year);

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="truncate text-foreground/90">{player.playerName}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatCurrency(salary)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-muted-foreground hover:text-foreground"
          aria-label={`Remove ${player.playerName}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function TradeTeamBlock({
  teamCode,
  teamName,
  players,
  year,
  onRemove,
}: {
  teamCode: string;
  teamName: string | undefined;
  players: TradePlayer[];
  year: number;
  onRemove: (playerId: number) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-background p-2">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{teamCode} outgoing</span>
        <span className="normal-case font-normal text-[10px] text-muted-foreground/70">
          {teamName ?? teamCode}
        </span>
      </div>
      {players.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          Click players in the sheet to add them.
        </div>
      ) : (
        <div className="space-y-1">
          {players.map((player) => (
            <TradePlayerRow
              key={player.playerId}
              player={player}
              year={year}
              onRemove={() => onRemove(player.playerId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TradeResultCard({
  teamCode,
  teamName,
  reasons,
  isValid,
  outgoing,
  incoming,
  minIncoming,
  maxIncoming,
  pathway,
  baselineApron,
  postTradeApron,
}: {
  teamCode: string;
  teamName: string | undefined;
  reasons: TradeReasonCode[];
  isValid: boolean;
  outgoing: number | null;
  incoming: number | null;
  minIncoming: number | null;
  maxIncoming: number | null;
  pathway: string | null;
  baselineApron: number | null;
  postTradeApron: number | null;
}) {
  const warnings = reasons.filter((reason) => WARNING_REASONS.has(reason));
  const blocking = reasons.filter((reason) => !WARNING_REASONS.has(reason));

  const formatPathway = (value: string | null) => {
    if (!value) return "—";
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-background p-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{teamCode}</div>
          <div className="text-[11px] text-muted-foreground">
            {teamName ?? teamCode}
          </div>
        </div>
        <div
          className={cx(
            "text-xs font-semibold",
            isValid ? "text-emerald-500" : "text-red-500"
          )}
        >
          {isValid ? "PASS" : "FAIL"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="space-y-1">
          <div className="text-muted-foreground">Outgoing</div>
          <div className="font-mono tabular-nums">
            {formatCurrency(outgoing)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground">Incoming</div>
          <div className="font-mono tabular-nums">
            {formatCurrency(incoming)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground">Min Incoming</div>
          <div className="font-mono tabular-nums">
            {formatCurrency(minIncoming)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground">Max Incoming</div>
          <div className="font-mono tabular-nums">
            {formatCurrency(maxIncoming)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="space-y-1">
          <div className="text-muted-foreground">Pathway</div>
          <div className="font-mono tabular-nums">{formatPathway(pathway)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground">Apron Δ</div>
          <div className="font-mono tabular-nums">
            {baselineApron === null || postTradeApron === null
              ? "—"
              : formatters.compactCurrency(postTradeApron - baselineApron)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="space-y-1">
          <div className="text-muted-foreground">Apron Pre</div>
          <div className="font-mono tabular-nums">
            {formatCurrency(baselineApron)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground">Apron Post</div>
          <div className="font-mono tabular-nums">
            {formatCurrency(postTradeApron)}
          </div>
        </div>
      </div>

      {(blocking.length > 0 || warnings.length > 0) && (
        <div className="space-y-1 text-[11px]">
          {blocking.length > 0 && (
            <div className="space-y-0.5 text-red-500">
              {blocking.map((reason) => (
                <div key={reason}>• {REASON_LABELS[reason] ?? reason}</div>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="space-y-0.5 text-amber-500">
              {warnings.map((reason) => (
                <div key={reason}>• {REASON_LABELS[reason] ?? reason}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TradeMachineView() {
  const { activeTeam } = useShellScrollContext();
  const {
    trade,
    setPrimaryTeam,
    setSecondaryTeam,
    setSalaryYear,
    removePlayer,
    clearPlayers,
    resetTrade,
  } = useTradeMachineContext();
  const { teams, getTeam } = useTeams();
  const { years: systemYears } = useSystemValues();

  const yearOptions = systemYears.length > 0 ? systemYears : FALLBACK_YEARS;

  useEffect(() => {
    if (!trade.primaryTeamCode && activeTeam) {
      setPrimaryTeam(activeTeam);
    }
  }, [trade.primaryTeamCode, activeTeam, setPrimaryTeam]);

  useEffect(() => {
    if (!yearOptions.includes(trade.salaryYear)) {
      const fallbackYear = yearOptions[0];
      if (fallbackYear !== undefined) {
        setSalaryYear(fallbackYear);
      }
    }
  }, [trade.salaryYear, setSalaryYear, yearOptions]);

  const primaryTeam = trade.primaryTeamCode;
  const secondaryTeam = trade.secondaryTeamCode;

  const playersByTeam = useMemo(() => {
    const map = new Map<string, TradePlayer[]>();
    trade.players.forEach((player) => {
      const list = map.get(player.teamCode) ?? [];
      list.push(player);
      map.set(player.teamCode, list);
    });
    return map;
  }, [trade.players]);

  const { evaluation, isLoading, error, isReady } = useTradeEvaluation(trade);

  const modeLabel = useMemo(() => {
    return trade.mode
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, [trade.mode]);

  const evaluationTeams = evaluation?.teams ?? [];
  const passingCount = evaluationTeams.filter((team) => team.is_trade_valid).length;
  const overallStatus =
    evaluationTeams.length === 0
      ? "INCOMPLETE"
      : passingCount === evaluationTeams.length
        ? "LEGAL"
        : "ILLEGAL";

  const statusLabel =
    evaluationTeams.length === 0
      ? "Select two teams + players"
      : `${passingCount}/${evaluationTeams.length} teams pass`;

  const secondaryOptions = teams.filter(
    (team) => team.team_code !== primaryTeam
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Trade Machine</div>
            <div className="text-xs text-muted-foreground">
              2-team trade · players only · click rows to add/remove
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div
              className={cx(
                "text-xs font-semibold",
                overallStatus === "LEGAL" && "text-emerald-500",
                overallStatus === "ILLEGAL" && "text-red-500",
                overallStatus === "INCOMPLETE" && "text-muted-foreground"
              )}
            >
              {overallStatus}
            </div>
            <div className="text-[10px] text-muted-foreground">{statusLabel}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {primaryTeam ? <TeamChip label={primaryTeam} /> : null}
          {secondaryTeam ? <TeamChip label={secondaryTeam} /> : null}
          {!primaryTeam && !secondaryTeam ? (
            <span className="text-[10px] text-muted-foreground">
              No teams selected yet.
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="xs" onClick={clearPlayers}>
          Clear Players
        </Button>
        <Button variant="ghost" size="xs" onClick={resetTrade}>
          Reset Trade
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <SectionTitle>Setup</SectionTitle>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Primary Team
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {primaryTeam ?? "—"}
              </span>
              {activeTeam && activeTeam !== primaryTeam ? (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setPrimaryTeam(activeTeam)}
                >
                  Use {activeTeam}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Secondary Team
            </span>
            <div className="w-[160px]">
              <Select
                value={secondaryTeam ?? "none"}
                onValueChange={(value) =>
                  setSecondaryTeam(value === "none" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {secondaryOptions.map((team) => (
                    <SelectItem key={team.team_code} value={team.team_code}>
                      {team.team_code} — {team.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Cap Year
            </span>
            <div className="w-[120px]">
              <Select
                value={String(trade.salaryYear)}
                onValueChange={(value) => setSalaryYear(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Mode
            </span>
            <span className="text-xs font-semibold">{modeLabel}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <SectionTitle>Players</SectionTitle>
        <div className="space-y-3">
          {primaryTeam ? (
            <TradeTeamBlock
              teamCode={primaryTeam}
              teamName={getTeam(primaryTeam)?.name}
              players={playersByTeam.get(primaryTeam) ?? []}
              year={trade.salaryYear}
              onRemove={removePlayer}
            />
          ) : (
            <div className="text-xs text-muted-foreground">
              Select a primary team to start adding players.
            </div>
          )}

          {secondaryTeam ? (
            <TradeTeamBlock
              teamCode={secondaryTeam}
              teamName={getTeam(secondaryTeam)?.name}
              players={playersByTeam.get(secondaryTeam) ?? []}
              year={trade.salaryYear}
              onRemove={removePlayer}
            />
          ) : (
            <div className="text-xs text-muted-foreground">
              Add a secondary team to evaluate the trade.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <SectionTitle>Matching</SectionTitle>
        {!isReady ? (
          <div className="text-xs text-muted-foreground">
            Choose two teams and add players to run the matching math.
          </div>
        ) : isLoading ? (
          <div className="text-xs text-muted-foreground">Evaluating trade…</div>
        ) : error ? (
          <div className="text-xs text-red-500">{error.message}</div>
        ) : evaluationTeams.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No matching results yet.
          </div>
        ) : (
          <div className="space-y-2">
            {evaluationTeams.map((team) => (
              <TradeResultCard
                key={team.team_code}
                teamCode={team.team_code}
                teamName={getTeam(team.team_code)?.name}
                reasons={team.reason_codes}
                isValid={team.is_trade_valid}
                outgoing={team.outgoing_salary}
                incoming={team.incoming_salary}
                minIncoming={team.min_incoming}
                maxIncoming={team.max_incoming}
                pathway={team.tpe_type}
                baselineApron={team.baseline_apron_total}
                postTradeApron={team.post_trade_apron_total}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
