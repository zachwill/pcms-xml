import { cx, formatters, focusRing } from "@/lib/utils";
import type { BirdRights } from "../../../data";

function birdRightsLabel(value: BirdRights | null | undefined): string | null {
  if (!value) return null;
  if (value === "BIRD") return "Bird";
  if (value === "EARLY_BIRD") return "Early Bird";
  return "Non-Bird";
}

/**
 * Contract summary card
 */
export function ContractSummary({
  totalValue,
  contractYears,
  isTwoWay,
  agentName,
  agencyName,
  onAgentClick,
  contractType,
  signedUsing,
  exceptionType,
  minContract,
  birdRights,
}: {
  totalValue: number;
  contractYears: number;
  isTwoWay: boolean;
  agentName: string | null;
  agencyName: string | null;
  onAgentClick?: () => void;

  /** Contract type label (e.g., Rookie Scale, Veteran Extension, etc) */
  contractType?: string | null;
  /** How the contract was signed (Bird/MLE/BAE/minimum/etc) */
  signedUsing?: string | null;
  /** If applicable, the specific exception instance type */
  exceptionType?: string | null;
  /** Minimum contract classification (if applicable) */
  minContract?: string | null;
  /** Bird rights shorthand derived from signing method */
  birdRights?: BirdRights | null;
}) {
  const birdLabel = birdRightsLabel(birdRights);

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Contract
      </div>
      <div
        className={cx(
          "p-4 rounded-lg",
          "bg-muted/30 border border-border/50",
          "space-y-3"
        )}
      >
        {/* Contract value headline */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total Value</span>
          <span className="font-mono tabular-nums text-lg font-semibold">
            {formatters.compactCurrency(totalValue)}
          </span>
        </div>

        {/* Years */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Years</span>
          <span className="text-sm font-medium">
            {contractYears} yr{contractYears !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Contract Type */}
        {contractType && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Type</span>
            <span className="text-sm font-medium text-right ml-4">
              {contractType}
            </span>
          </div>
        )}

        {/* Signed Via */}
        {signedUsing && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Signed Via</span>
            <span className="text-sm font-medium text-right ml-4">
              {signedUsing}
            </span>
          </div>
        )}

        {/* Exception */}
        {exceptionType && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Exception</span>
            <span className="text-sm font-medium text-right ml-4">
              {exceptionType}
            </span>
          </div>
        )}

        {/* Minimum */}
        {minContract && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Minimum</span>
            <span className="text-sm font-medium text-right ml-4">
              {minContract}
            </span>
          </div>
        )}

        {/* Bird Rights */}
        {birdLabel && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Bird</span>
            <span className="text-sm font-medium text-right ml-4">
              {birdLabel}
            </span>
          </div>
        )}

        {/* Two-Way Badge */}
        {isTwoWay && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Contract Type</span>
            <span
              className={cx(
                "inline-flex px-2 py-0.5 rounded text-xs font-medium",
                "bg-amber-100 text-amber-800",
                "dark:bg-amber-900/30 dark:text-amber-400"
              )}
            >
              Two-Way
            </span>
          </div>
        )}

        {/* Agent */}
        {agentName && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Agent</span>
            {onAgentClick ? (
              <button
                type="button"
                onClick={onAgentClick}
                className={cx(
                  "text-sm font-medium text-blue-600 dark:text-blue-400",
                  "hover:underline",
                  focusRing()
                )}
              >
                {agentName}
              </button>
            ) : (
              <span className="text-sm font-medium">{agentName}</span>
            )}
          </div>
        )}

        {/* Agency */}
        {agencyName && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Agency</span>
            <span className="text-sm">{agencyName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
