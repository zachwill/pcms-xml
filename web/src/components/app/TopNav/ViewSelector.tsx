/**
 * ViewSelector — Placeholder view switcher for the app
 *
 * Per product direction: we currently default to the Salary Book view.
 * Other views are shown for future expansion but are not yet usable.
 *
 * UX invariant: this is a "radio" group (mutually exclusive view selection).
 * Only Salary Book is enabled today; the others render as disabled radios.
 */

import { cx } from "@/lib/utils";
import { Radio, RadioGroup } from "@/components/ui";
import { APP_VIEWS, type ViewKey } from "@/config/views";

export function ViewSelector() {
  // Hard-coded for now; will become router/state driven later.
  const activeView: ViewKey = "salary-book";

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        View
      </div>

      <RadioGroup
        aria-label="View"
        value={activeView}
        // Placeholder: router/state driven later.
        onValueChange={() => {}}
        className="flex flex-col gap-1"
      >
        {APP_VIEWS.map((view) => {
          const isActive = view.key === activeView;
          const isDisabled = !view.enabled;

          return (
            <label
              key={view.key}
              data-disabled={isDisabled ? "true" : undefined}
              className={cx(
                "flex items-center gap-1.5",
                // Match checkbox label sizing/alignment a bit
                "px-0 py-0.5",
                isDisabled ? "cursor-not-allowed opacity-80" : "cursor-pointer"
              )}
            >
              <Radio value={view.key} size="sm" disabled={isDisabled} />
              <span
                className={cx(
                  "text-left text-[11px] leading-none select-none",
                  isActive && "font-semibold text-foreground",
                  !isActive && !isDisabled && "text-foreground/80",
                  isDisabled && "text-muted-foreground opacity-40"
                )}
              >
                {view.label}
              </span>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
