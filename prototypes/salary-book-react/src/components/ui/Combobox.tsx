import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { Check, ChevronDown, X } from "lucide-react"
import React from "react"
import { cx, focusInput, hasErrorInput } from "@/lib/utils"

// Re-export the Root with generic type support
// Default autoHighlight to true for better UX (highlights first match while typing)
function Combobox<Value, Multiple extends boolean | undefined = false>({
  autoHighlight = true,
  ...props
}: ComboboxPrimitive.Root.Props<Value, Multiple>) {
  return <ComboboxPrimitive.Root autoHighlight={autoHighlight} {...props} />
}
Combobox.displayName = "Combobox"

const ComboboxValue = ComboboxPrimitive.Value

const ComboboxGroup = ComboboxPrimitive.Group
ComboboxGroup.displayName = "ComboboxGroup"

const ComboboxGroupLabel = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.GroupLabel>
>(({ className, ...props }, forwardedRef) => (
  <ComboboxPrimitive.GroupLabel
    ref={forwardedRef}
    className={cx(
      "px-3 py-2 text-xs font-medium tracking-wide",
      "text-muted-foreground",
      className,
    )}
    {...props}
  />
))
ComboboxGroupLabel.displayName = "ComboboxGroupLabel"

const comboboxInputStyles = [
  cx(
    "h-10 w-full rounded-md border px-3.5 outline-none transition-colors sm:text-sm",
    "border-border",
    "text-foreground",
    "placeholder:text-muted-foreground",
    "bg-background",
    "disabled:opacity-50",
    focusInput,
  ),
]

const ComboboxInput = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Input> & {
    hasError?: boolean
  }
>(({ className, hasError, ...props }, forwardedRef) => (
  <ComboboxPrimitive.Input
    ref={forwardedRef}
    className={cx(
      comboboxInputStyles,
      hasError ? hasErrorInput : "",
      className,
    )}
    {...props}
  />
))
ComboboxInput.displayName = "ComboboxInput"

const ComboboxTrigger = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Trigger>
>(({ className, children, ...props }, forwardedRef) => (
  <ComboboxPrimitive.Trigger
    ref={forwardedRef}
    className={cx(
      "flex h-10 w-6 items-center justify-center rounded bg-transparent p-0",
      "text-muted-foreground",
      "hover:text-foreground",
      className,
    )}
    {...props}
  >
    {children ?? <ChevronDown className="size-4" aria-hidden="true" />}
  </ComboboxPrimitive.Trigger>
))
ComboboxTrigger.displayName = "ComboboxTrigger"

const ComboboxClear = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.Clear>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Clear>
>(({ className, children, ...props }, forwardedRef) => (
  <ComboboxPrimitive.Clear
    ref={forwardedRef}
    className={cx(
      "flex h-10 w-6 items-center justify-center rounded bg-transparent p-0",
      "text-muted-foreground",
      "hover:text-foreground",
      className,
    )}
    {...props}
  >
    {children ?? <X className="size-4" aria-hidden="true" />}
  </ComboboxPrimitive.Clear>
))
ComboboxClear.displayName = "ComboboxClear"

const ComboboxIcon = ComboboxPrimitive.Icon
ComboboxIcon.displayName = "ComboboxIcon"

const ComboboxContent = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Popup> & {
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
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="z-50 outline-none"
      >
        <ComboboxPrimitive.Popup
          ref={forwardedRef}
          className={cx(
            "relative overflow-hidden rounded-md border shadow-lg",
            "w-[var(--anchor-width)] max-w-[95vw]",
            "max-h-[var(--available-height)]",
            "bg-background",
            "text-foreground",
            "border-border",
            "origin-[var(--transform-origin)]",
            "transition-[transform,opacity]",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            className,
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  ),
)
ComboboxContent.displayName = "ComboboxContent"

const ComboboxList = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.List>
>(({ className, ...props }, forwardedRef) => (
  <ComboboxPrimitive.List
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
ComboboxList.displayName = "ComboboxList"

const ComboboxEmpty = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Empty>
>(({ className, ...props }, forwardedRef) => (
  <ComboboxPrimitive.Empty
    ref={forwardedRef}
    className={cx(
      "py-6 text-center text-sm",
      "text-muted-foreground",
      "empty:m-0 empty:p-0",
      className,
    )}
    {...props}
  />
))
ComboboxEmpty.displayName = "ComboboxEmpty"

const ComboboxItem = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Item>
>(({ className, children, ...props }, forwardedRef) => (
  <ComboboxPrimitive.Item
    ref={forwardedRef}
    className={cx(
      "grid cursor-pointer grid-cols-[1fr_20px] gap-x-2 rounded-md px-3 py-2 outline-none transition-colors data-[selected]:font-medium sm:text-sm",
      "text-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "data-[highlighted]:bg-muted",
      className,
    )}
    {...props}
  >
    <span className="flex-1 truncate">{children}</span>
    <ComboboxPrimitive.ItemIndicator>
      <Check
        className="size-4 shrink-0 text-foreground"
        aria-hidden="true"
      />
    </ComboboxPrimitive.ItemIndicator>
  </ComboboxPrimitive.Item>
))
ComboboxItem.displayName = "ComboboxItem"

const ComboboxSeparator = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Separator>
>(({ className, ...props }, forwardedRef) => (
  <ComboboxPrimitive.Separator
    ref={forwardedRef}
    className={cx(
      "-mx-1 my-1 h-px",
      "bg-border",
      className,
    )}
    {...props}
  />
))
ComboboxSeparator.displayName = "ComboboxSeparator"

// Multi-select components
const ComboboxChips = ComboboxPrimitive.Chips
ComboboxChips.displayName = "ComboboxChips"

const ComboboxChip = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.Chip>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Chip>
>(({ className, ...props }, forwardedRef) => (
  <ComboboxPrimitive.Chip
    ref={forwardedRef}
    className={cx(
      "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm cursor-default outline-none",
      "bg-muted text-foreground",
      "data-[highlighted]:bg-foreground data-[highlighted]:text-primary-foreground",
      className,
    )}
    {...props}
  />
))
ComboboxChip.displayName = "ComboboxChip"

const ComboboxChipRemove = React.forwardRef<
  React.ComponentRef<typeof ComboboxPrimitive.ChipRemove>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.ChipRemove>
>(({ className, children, ...props }, forwardedRef) => (
  <ComboboxPrimitive.ChipRemove
    ref={forwardedRef}
    className={cx(
      "rounded-sm p-0.5 text-inherit",
      "hover:bg-muted",
      className,
    )}
    {...props}
  >
    {children ?? <X className="size-3" aria-hidden="true" />}
  </ComboboxPrimitive.ChipRemove>
))
ComboboxChipRemove.displayName = "ComboboxChipRemove"

export {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxIcon,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
}
