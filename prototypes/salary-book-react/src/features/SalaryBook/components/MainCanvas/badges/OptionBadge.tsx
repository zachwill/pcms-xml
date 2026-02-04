import { cx } from "@/lib/utils";

/** Contract option indicator (PO, TO, ETO) — pill badge style */
export function OptionBadge({ option }: { option: string | null }) {
  if (!option) return null;

  const v = option.trim().toUpperCase();
  if (!v || v === "NONE") return null;

  // Normalize raw DB values to display values
  // DB: "TEAM" -> "TO", "PLYR" -> "PO", "PLYTF" -> "ETO"
  let normalized: "PO" | "TO" | "ETO";
  let label: string;
  let title: string;

  if (v === "TO" || v === "TEAM") {
    normalized = "TO";
    label = "TEAM";
    title = "Team Option";
  } else if (v === "PO" || v === "PLYR") {
    normalized = "PO";
    label = "PLAYER";
    title = "Player Option";
  } else if (v === "ETO" || v === "PLYTF") {
    normalized = "ETO";
    label = "ETO";
    title = "Early Termination Option";
  } else {
    // Unknown value
    return null;
  }

  const colorClasses = {
    PO: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    TO: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    ETO: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center",
        "px-1.5 py-0.5 rounded-full",
        "text-[9px] font-semibold uppercase tracking-wide",
        "leading-none",
        colorClasses[normalized]
      )}
      title={title}
    >
      {label}
    </span>
  );
}
