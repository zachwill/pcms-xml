import React from "react";
import { cx } from "@/lib/utils";

export type KpiVariant = "default" | "positive" | "negative" | "muted";

export interface KpiCellProps {
  label?: string;
  value?: React.ReactNode;
  title?: string;
  variant?: KpiVariant;
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

export function KpiCell({
  label,
  value,
  title,
  variant = "default",
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
        "bg-zinc-200/80 dark:bg-zinc-700/80 rounded",
        "flex flex-col items-center justify-center",
        "text-center",
        "px-1",
        className
      )}
      title={title}
    >
      {hasLabel && (
        <span
          className={cx(
            "text-[9px] uppercase tracking-wide text-muted-foreground font-medium leading-none",
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
            valueColorClasses[variant],
            valueClassName
          )}
        >
          {value}
        </span>
      ) : null}
    </div>
  );
}
