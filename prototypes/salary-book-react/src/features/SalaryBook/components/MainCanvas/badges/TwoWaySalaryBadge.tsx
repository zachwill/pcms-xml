import { cx } from "@/lib/utils";

/** Two-way badge for salary columns (sized to match salary amounts) */
export function TwoWaySalaryBadge() {
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center",
        "text-[10px] px-1.5 py-0.5 rounded",
        "bg-gray-200 dark:bg-gray-700",
        "text-gray-600 dark:text-gray-300",
        "font-medium"
      )}
    >
      Two-Way
    </span>
  );
}
