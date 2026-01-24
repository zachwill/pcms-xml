/**
 * TopCommandBar — Fixed navigation and filter bar
 *
 * Composes:
 * - TeamSelectorGrid: 30-team navigation grid with scroll-spy highlight
 * - FilterToggles: Display/Financial/Contract filter checkboxes
 *
 * Positioned fixed at viewport top with highest z-index.
 * Height: 130px (matches topOffset in SalaryBook provider)
 */

import { cx } from "@/lib/utils";
import { FilterToggles } from "./FilterToggles";
import { TeamSelectorGrid } from "./TeamSelectorGrid";

/**
 * TopCommandBar — Main export
 *
 * Fixed position header containing team navigation and filters.
 * Acts as scroll-spy status indicator and filtering controls.
 */
export function TopCommandBar() {
  return (
    <div
      className={cx(
        // Fixed positioning at viewport top
        "fixed top-0 left-0 right-0 z-50",
        // Height matches the topOffset in SalaryBookProvider
        "h-[130px]",
        // Border
        "border-b border-border",
        // Layout - items aligned to start, not spread apart
        "flex items-start px-4 pt-3 gap-6"
      )}
      style={{ backgroundColor: "var(--background, #fff)" }}
    >
      {/* Team Selector Grid */}
      <TeamSelectorGrid />

      {/* Vertical divider */}
      <div className="h-20 w-px bg-border self-center" />

      {/* Filters: positioned next to teams */}
      <FilterToggles />
    </div>
  );
}
