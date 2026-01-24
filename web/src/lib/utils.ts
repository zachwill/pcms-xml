import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind classes with clsx
 */
export function cx(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Focus ring styles for accessibility
 * Vercel-style: border-only focus, minimal/no ring
 */
export function focusRing() {
  return "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-foreground dark:focus-visible:border-foreground"
}

/**
 * Focus styles for inputs
 * Vercel-style: border changes on focus, minimal ring
 */
export const focusInput = [
  "focus:outline-none",
  "focus:ring-0",
  "focus:border-foreground dark:focus:border-foreground",
  "transition-colors duration-100",
]

/**
 * Error state for inputs
 */
export const hasErrorInput = [
  "border-red-500 dark:border-red-500",
  "focus:border-red-500 dark:focus:border-red-500",
  "placeholder:text-red-400 dark:placeholder:text-red-400/70",
]

/**
 * Common formatters
 */
export const formatters = {
  currency: (value: number, minimumFractionDigits = 0) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits,
    }).format(value)
  },
  compactCurrency: (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)
  },
  number: (value: number) => {
    return new Intl.NumberFormat("en-US").format(value)
  },
  percent: (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(value)
  },
}
