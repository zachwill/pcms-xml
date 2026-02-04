import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete"
import { ChevronDown, X } from "lucide-react"
import React from "react"
import { cx, focusInput, hasErrorInput } from "@/lib/utils"

// Re-export the Root with autoHighlight defaulting to true for better UX
function Autocomplete({
  autoHighlight = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.Root>) {
  return <AutocompletePrimitive.Root autoHighlight={autoHighlight} {...props} />
}
Autocomplete.displayName = "Autocomplete"

// Re-export useFilter hook for async filtering
const useAutocompleteFilter = AutocompletePrimitive.useFilter

const AutocompleteValue = AutocompletePrimitive.Value

const AutocompleteGroup = AutocompletePrimitive.Group
AutocompleteGroup.displayName = "AutocompleteGroup"

const AutocompleteGroupLabel = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.GroupLabel>
>(({ className, ...props }, forwardedRef) => (
  <AutocompletePrimitive.GroupLabel
    ref={forwardedRef}
    className={cx(
      "px-3 py-2 text-xs font-medium tracking-wide",
      "text-gray-500 dark:text-gray-400",
      className,
    )}
    {...props}
  />
))
AutocompleteGroupLabel.displayName = "AutocompleteGroupLabel"

const autocompleteInputStyles = [
  cx(
    "h-10 w-full rounded-md border px-3.5 outline-none transition-colors sm:text-sm",
    "border-gray-200 dark:border-gray-700",
    "text-gray-900 dark:text-gray-50",
    "placeholder:text-gray-400 placeholder:dark:text-gray-500",
    "bg-white dark:bg-gray-900",
    "disabled:opacity-50",
    focusInput,
  ),
]

const AutocompleteInput = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.Input> & {
    hasError?: boolean
  }
>(({ className, hasError, ...props }, forwardedRef) => (
  <AutocompletePrimitive.Input
    ref={forwardedRef}
    className={cx(
      autocompleteInputStyles,
      hasError ? hasErrorInput : "",
      className,
    )}
    {...props}
  />
))
AutocompleteInput.displayName = "AutocompleteInput"

const AutocompleteTrigger = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.Trigger>
>(({ className, children, ...props }, forwardedRef) => (
  <AutocompletePrimitive.Trigger
    ref={forwardedRef}
    className={cx(
      "flex h-10 w-6 items-center justify-center rounded bg-transparent p-0",
      "text-gray-400 dark:text-gray-500",
      "hover:text-gray-600 hover:dark:text-gray-400",
      className,
    )}
    {...props}
  >
    {children ?? <ChevronDown className="size-4" aria-hidden="true" />}
  </AutocompletePrimitive.Trigger>
))
AutocompleteTrigger.displayName = "AutocompleteTrigger"

const AutocompleteClear = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.Clear>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.Clear>
>(({ className, children, ...props }, forwardedRef) => (
  <AutocompletePrimitive.Clear
    ref={forwardedRef}
    className={cx(
      "flex h-10 w-6 items-center justify-center rounded bg-transparent p-0",
      "text-gray-400 dark:text-gray-500",
      "hover:text-gray-600 hover:dark:text-gray-400",
      className,
    )}
    {...props}
  >
    {children ?? <X className="size-4" aria-hidden="true" />}
  </AutocompletePrimitive.Clear>
))
AutocompleteClear.displayName = "AutocompleteClear"

const AutocompleteIcon = AutocompletePrimitive.Icon
AutocompleteIcon.displayName = "AutocompleteIcon"

const AutocompleteContent = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.Popup> & {
    sideOffset?: number
    collisionPadding?: number
  }
>(
  (
    {
      className,
      children,
      sideOffset = 4,
      collisionPadding = 10,
      ...props
    },
    forwardedRef,
  ) => (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="z-50 outline-none"
      >
        <AutocompletePrimitive.Popup
          ref={forwardedRef}
          className={cx(
            "relative overflow-hidden rounded-md border shadow-lg",
            "w-[var(--anchor-width)] max-w-[95vw]",
            "max-h-[var(--available-height)]",
            "bg-white dark:bg-gray-900",
            "text-gray-900 dark:text-gray-50",
            "border-gray-200 dark:border-gray-700",
            "origin-[var(--transform-origin)]",
            "transition-[transform,opacity]",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            className,
          )}
          {...props}
        >
          {children}
        </AutocompletePrimitive.Popup>
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  ),
)
AutocompleteContent.displayName = "AutocompleteContent"

const AutocompleteList = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.List>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.List>
>(({ className, ...props }, forwardedRef) => (
  <AutocompletePrimitive.List
    ref={forwardedRef}
    className={cx(
      "p-1 overflow-y-auto outline-none",
      "max-h-[var(--available-height)] scroll-py-1",
      "data-[empty]:p-0",
      className,
    )}
    {...props}
  />
))
AutocompleteList.displayName = "AutocompleteList"

const AutocompleteEmpty = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.Empty>
>(({ className, ...props }, forwardedRef) => (
  <AutocompletePrimitive.Empty
    ref={forwardedRef}
    className={cx(
      "py-6 text-center text-sm",
      "text-gray-500 dark:text-gray-400",
      "empty:m-0 empty:p-0",
      className,
    )}
    {...props}
  />
))
AutocompleteEmpty.displayName = "AutocompleteEmpty"

const AutocompleteStatus = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.Status>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.Status>
>(({ className, ...props }, forwardedRef) => (
  <AutocompletePrimitive.Status
    ref={forwardedRef}
    className={cx(
      "flex items-center gap-2 px-3 py-2 text-sm",
      "text-gray-500 dark:text-gray-400",
      className,
    )}
    {...props}
  />
))
AutocompleteStatus.displayName = "AutocompleteStatus"

const AutocompleteItem = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.Item>
>(({ className, children, ...props }, forwardedRef) => (
  <AutocompletePrimitive.Item
    ref={forwardedRef}
    className={cx(
      "flex cursor-pointer rounded-md px-3 py-2 outline-none transition-colors sm:text-sm",
      "text-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "data-[highlighted]:bg-muted",
      className,
    )}
    {...props}
  >
    <span className="flex-1 truncate">{children}</span>
  </AutocompletePrimitive.Item>
))
AutocompleteItem.displayName = "AutocompleteItem"

const AutocompleteSeparator = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.Separator>
>(({ className, ...props }, forwardedRef) => (
  <AutocompletePrimitive.Separator
    ref={forwardedRef}
    className={cx(
      "-mx-1 my-1 h-px",
      "bg-gray-100 dark:bg-gray-800",
      className,
    )}
    {...props}
  />
))
AutocompleteSeparator.displayName = "AutocompleteSeparator"

// Collection component for rendering items inside groups
const AutocompleteCollection = AutocompletePrimitive.Collection

// Arrow component
const AutocompleteArrow = React.forwardRef<
  React.ComponentRef<typeof AutocompletePrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.Arrow>
>(({ className, ...props }, forwardedRef) => (
  <AutocompletePrimitive.Arrow
    ref={forwardedRef}
    className={cx(
      "fill-white dark:fill-gray-900",
      "[&>path:first-child]:stroke-gray-200 dark:[&>path:first-child]:stroke-gray-700",
      className,
    )}
    {...props}
  />
))
AutocompleteArrow.displayName = "AutocompleteArrow"

// Row component for virtualization
const AutocompleteRow = AutocompletePrimitive.Row
AutocompleteRow.displayName = "AutocompleteRow"

export {
  Autocomplete,
  AutocompleteArrow,
  AutocompleteClear,
  AutocompleteCollection,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteIcon,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteRow,
  AutocompleteSeparator,
  AutocompleteStatus,
  AutocompleteTrigger,
  AutocompleteValue,
  useAutocompleteFilter,
}
