import { cx } from "@/lib/utils";

/**
 * Trade restrictions section
 */
export function TradeRestrictions({
  isNoTrade,
  isTradeBonus,
  tradeBonusPercent,
  isConsentRequired,
  isPreconsented,
}: {
  isNoTrade: boolean;
  isTradeBonus: boolean;
  tradeBonusPercent: number | null;
  isConsentRequired: boolean;
  isPreconsented: boolean;
}) {
  const tradeKickerLabel = (() => {
    const pct = tradeBonusPercent === null ? null : Number(tradeBonusPercent);
    if (pct !== null && Number.isFinite(pct) && pct > 0) {
      const pctLabel = pct % 1 === 0 ? pct.toFixed(0) : String(pct);
      return `${pctLabel}% Trade Kicker`;
    }
    return "Trade Kicker";
  })();

  const restrictions: { label: string; active: boolean }[] = [
    { label: "No-Trade Clause", active: isNoTrade },
    { label: tradeKickerLabel, active: isTradeBonus },
    { label: "Consent Required", active: isConsentRequired },
    { label: "Pre-consented", active: isPreconsented },
  ];

  const activeRestrictions = restrictions.filter((r) => r.active);

  if (activeRestrictions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Trade Restrictions
      </div>
      <div className="flex flex-wrap gap-2">
        {activeRestrictions.map((restriction) => (
          <span
            key={restriction.label}
            className={cx(
              "inline-flex px-2 py-1 rounded text-xs font-medium",
              "bg-red-100 text-red-800",
              "dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {restriction.label}
          </span>
        ))}
      </div>
    </div>
  );
}
