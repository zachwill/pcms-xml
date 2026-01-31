import React from "react";
import { cx } from "@/lib/utils";

export type KpiVariant = "default" | "positive" | "negative" | "muted";

export interface KpiCellProps {
  label?: string;
  value?: React.ReactNode;
  title?: string;
  variant?: KpiVariant;
  /** Use dark styling (for totals footer) */
  dark?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  contentClassName?: string;
  children?: React.ReactNode;
}

const valueColorClasses: Record<KpiVariant, string> = {
  default: "text-foreground",
  positive: "text-green-600 dark:text-green-400",
  negative: "text-red-500",
  muted: "text-muted-foreground/60",
};

const darkValueColorClasses: Record<KpiVariant, string> = {
  default: "text-zinc-100",
  positive: "text-green-400",
  negative: "text-red-400",
  muted: "text-zinc-500",
};

export function KpiCell({
  label,
  value,
  title,
  variant = "default",
  dark = false,
  className,
  labelClassName,
  valueClassName,
  contentClassName,
  children,
}: KpiCellProps) {
  const hasLabel = Boolean(label);
  const hasValue = value !== undefined && value !== null;
  const hasChildren = children !== undefined && children !== null;

  return (
    <div
      className={cx(
        "w-20 h-10",
        "rounded",
        "flex flex-col items-center justify-center",
        "text-center",
        "px-1",
        dark
          ? "bg-zinc-700 dark:bg-zinc-600"
          : "bg-zinc-200/80 dark:bg-zinc-700/80",
        className
      )}
      title={title}
    >
      {hasLabel && (
        <span
          className={cx(
            "text-[9px] uppercase tracking-wide font-medium leading-none",
            dark ? "text-zinc-400" : "text-muted-foreground",
            labelClassName
          )}
        >
          {label}
        </span>
      )}

      {hasChildren ? (
        <div
          className={cx(
            hasLabel ? "mt-0.5" : "flex items-center justify-center h-full w-full",
            contentClassName
          )}
        >
          {children}
        </div>
      ) : hasValue ? (
        <span
          className={cx(
            "text-xs tabular-nums font-semibold leading-tight",
            hasLabel && "mt-0.5",
            dark ? darkValueColorClasses[variant] : valueColorClasses[variant],
            valueClassName
          )}
        >
          {value}
        </span>
      ) : null}
    </div>
  );
}
