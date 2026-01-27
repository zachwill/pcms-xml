import React from "react";
import { Sparkles } from "lucide-react";
import { cx, formatters } from "@/lib/utils";
import { KpiCell } from "./KpiCell";
import type { TeamException } from "../../data";

const EXCEPTION_YEARS = [2025, 2026, 2027, 2028, 2029] as const;

function getPrimaryAmount(row: TeamException): number | null {
  for (const year of EXCEPTION_YEARS) {
    const amount = row[`remaining_${year}` as keyof TeamException] as number | null | undefined;
    if (amount !== null && amount !== undefined) {
      return amount;
    }
  }
  return null;
}

function getLastName(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  if (trimmed.includes(",")) {
    const [last] = trimmed.split(",");
    return last?.trim() || null;
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1] ?? null;
}

const EXCEPTION_LABEL_MAP: Record<string, string> = {
  BIEXC: "Bi-Annual",
  BAE: "Bi-Annual",
  MLE: "MLE",
  TAXMLE: "Tax MLE",
  ROOMMLE: "Room MLE",
  NTMLE: "MLE",
  NTMDL: "MLE",
  CNTMD: "C-MLE",
};

function normalizeExceptionKey(value: string): string {
  return value.replace(/[\s-_]/g, "").toUpperCase();
}

function buildExceptionLabel(row: TeamException): string {
  const playerLastName = getLastName(row.trade_exception_player_name);
  if (playerLastName) return playerLastName;

  const rawType = row.exception_type_lk ?? row.exception_type_name;
  if (!rawType) return "Exception";

  const normalized = normalizeExceptionKey(rawType);
  if (EXCEPTION_LABEL_MAP[normalized]) {
    return EXCEPTION_LABEL_MAP[normalized];
  }

  return rawType;
}

function formatExpirationDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isDisablePlayerException(row: TeamException): boolean {
  const raw = row.exception_type_lk ?? row.exception_type_name ?? "";
  const normalized = normalizeExceptionKey(raw);
  return normalized.includes("DPE") || normalized.includes("DLEXC") || normalized.includes("DISABLEDPLAYER");
}

function buildExceptionTitle(row: TeamException): string {
  const subtitle = row.trade_exception_player_name;
  const formatted = formatExpirationDate(row.expiration_date);

  if (isDisablePlayerException(row)) {
    const base = subtitle ? `DPE: ${subtitle}` : "DPE";
    return formatted ? `${base} • Expires ${formatted}` : base;
  }

  if (subtitle) {
    return formatted ? `Expires ${formatted}` : "Expiration date unavailable";
  }

  const title = row.exception_type_name ?? row.exception_type_lk ?? "Exception";
  return title;
}

function getExceptionCardClasses(row: TeamException): {
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
} {
  if (isDisablePlayerException(row)) {
    return {
      className: "bg-red-200/80 dark:bg-red-800/60 border border-red-400/50",
      labelClassName: "text-red-700 dark:text-red-200",
      valueClassName: "text-red-800 dark:text-red-100",
    };
  }

  return {};
}

function ExceptionsIcon() {
  return (
    <div
      className={cx(
        "w-7 h-7 rounded border border-border",
        "bg-background flex items-center justify-center",
        "text-muted-foreground"
      )}
    >
      <Sparkles className="w-4 h-4" aria-hidden="true" />
    </div>
  );
}

export function ExceptionsSection({ exceptions }: { exceptions: TeamException[] }) {
  if (exceptions.length === 0) return null;

  const sortedExceptions = [...exceptions].sort((a, b) => {
    const amountA = getPrimaryAmount(a) ?? -Infinity;
    const amountB = getPrimaryAmount(b) ?? -Infinity;
    return amountB - amountA;
  });

  return (
    <div
      className={cx(
        "border-b border-border/50",
        // Silk pattern: disable pointer events during active scroll
        "[[data-scroll-state=scrolling]_&]:pointer-events-none"
      )}
      style={{ backgroundColor: "var(--muted, #f4f4f5)" }}
    >
      <div className="h-14 flex items-center text-xs">
        <div
          className={cx(
            "w-52 shrink-0 pl-4",
            "sticky left-0 z-[2]",
            "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px",
            "after:bg-border/30",
            "relative"
          )}
          style={{ backgroundColor: "var(--muted, #f4f4f5)" }}
        >
          <div className="grid grid-cols-[40px_1fr] items-center h-full">
            <div className="flex items-center justify-start">
              <ExceptionsIcon />
            </div>
            <div className="pl-1 flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Exceptions
              </span>
              <span
                className={cx(
                  "inline-flex items-center justify-center",
                  "min-w-[16px] h-4 px-1 rounded-full",
                  "bg-muted text-muted-foreground",
                  "text-[9px] font-medium"
                )}
              >
                {exceptions.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          {sortedExceptions.map((row) => {
            const amount = getPrimaryAmount(row);
            const label = buildExceptionLabel(row);
            const title = buildExceptionTitle(row);
            const cardClasses = getExceptionCardClasses(row);
            return (
              <div key={row.id} className="w-24 shrink-0 flex justify-center">
                <KpiCell
                  label={label}
                  value={amount !== null ? formatters.compactCurrency(amount) : "—"}
                  title={title}
                  variant={amount === null ? "muted" : "default"}
                  className={cardClasses.className}
                  labelClassName={cx("w-full truncate", cardClasses.labelClassName)}
                  valueClassName={cx("truncate", cardClasses.valueClassName)}
                />
              </div>
            );
          })}

          <div className="w-40 pr-4 shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default ExceptionsSection;
