import { cx } from "@/lib/utils";

/**
 * AI insights placeholder — used across multiple sidebar views
 */
export function AIInsightsPlaceholder({
  description = "AI-powered analysis and insights coming soon.",
}: {
  description?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        🤖 AI Analysis
      </div>
      <div
        className={cx(
          "p-4 rounded-lg",
          "bg-muted/30 border border-border/50",
          "text-sm text-muted-foreground italic"
        )}
      >
        {description}
      </div>
    </div>
  );
}
