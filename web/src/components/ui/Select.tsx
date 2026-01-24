import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import React from "react"
import { cx, focusInput, hasErrorInput } from "@/lib/utils"

// ============================================================================
// Select Root - just re-export the primitive
// Pass `items` prop to enable automatic label lookup in SelectValue
// ============================================================================

const Select = SelectPrimitive.Root

// ============================================================================
// Select Value - re-export the primitive
// ============================================================================

const SelectValue = SelectPrimitive.Value
SelectValue.displayName = "SelectValue"

// ============================================================================
// Select Group
// ============================================================================

const SelectGroup = SelectPrimitive.Group
SelectGroup.displayName = "SelectGroup"

// ============================================================================
// Select Trigger
// ============================================================================

const selectTriggerStyles = [
  cx(
    "group/trigger flex w-full select-none items-center justify-between gap-2 truncate rounded-md border px-3 py-2 outline-none transition-colors duration-100 sm:text-sm",
    "border-border",
    "text-foreground",
    "data-[placeholder]:text-muted-foreground",
    "bg-background",
    "hover:bg-muted/50",
    "data-[disabled]:opacity-50",
    ...focusInput,
  ),
]

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    hasError?: boolean
  }
>(({ className, hasError, children, ...props }, forwardedRef) => {
  return (
    <SelectPrimitive.Trigger
      ref={forwardedRef}
      className={cx(
        selectTriggerStyles,
        hasError ? hasErrorInput : "",
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <SelectPrimitive.Icon>
        <ChevronDown
          className={cx(
            "-mr-1 size-4 shrink-0",
            "text-muted-foreground",
          )}
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = "SelectTrigger"

// ============================================================================
// Select Scroll Arrows
// ============================================================================

const SelectScrollUpArrow = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpArrow>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpArrow>
>(({ className, ...props }, forwardedRef) => (
  <SelectPrimitive.ScrollUpArrow
    ref={forwardedRef}
    className={cx(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronUp className="size-3 shrink-0" aria-hidden="true" />
  </SelectPrimitive.ScrollUpArrow>
))
SelectScrollUpArrow.displayName = "SelectScrollUpArrow"

const SelectScrollDownArrow = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownArrow>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownArrow>
>(({ className, ...props }, forwardedRef) => (
  <SelectPrimitive.ScrollDownArrow
    ref={forwardedRef}
    className={cx(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronDown className="size-3 shrink-0" aria-hidden="true" />
  </SelectPrimitive.ScrollDownArrow>
))
SelectScrollDownArrow.displayName = "SelectScrollDownArrow"

// ============================================================================
// Select Content
// ============================================================================

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Popup> & {
    sideOffset?: number
    collisionPadding?: number
  }
>(
  (
    {
      className,
      children,
      sideOffset = 8,
      collisionPadding = 10,
      ...props
    },
    forwardedRef,
  ) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="z-50 outline-none"
      >
        <SelectPrimitive.Popup
          ref={forwardedRef}
          className={cx(
            "relative overflow-hidden rounded-md border shadow-lg",
            "min-w-[var(--anchor-width)] max-w-[95vw]",
            "max-h-[var(--available-height)]",
            "bg-background",
            "text-foreground",
            "border-border",
            "origin-[var(--transform-origin)]",
            "transition-[transform,opacity] duration-100",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            className,
          )}
          {...props}
        >
          <SelectScrollUpArrow />
          <SelectPrimitive.List
            className={cx(
              "p-1 overflow-y-auto",
              "max-h-[var(--available-height)]",
            )}
          >
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownArrow />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  ),
)
SelectContent.displayName = "SelectContent"

// ============================================================================
// Select Group Label
// ============================================================================

const SelectGroupLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.GroupLabel>
>(({ className, ...props }, forwardedRef) => (
  <SelectPrimitive.GroupLabel
    ref={forwardedRef}
    className={cx(
      "px-3 py-2 text-xs font-medium uppercase tracking-wide",
      "text-muted-foreground",
      className,
    )}
    {...props}
  />
))
SelectGroupLabel.displayName = "SelectGroupLabel"

// ============================================================================
// Select Item
// ============================================================================

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <SelectPrimitive.Item
      ref={forwardedRef}
      className={cx(
        "grid cursor-pointer grid-cols-[1fr_20px] gap-x-2 rounded-md px-3 py-2 outline-none transition-colors duration-100 data-[selected]:font-medium sm:text-sm",
        "text-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[highlighted]:bg-muted",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1 truncate">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <Check
          className="size-4 shrink-0 text-foreground"
          aria-hidden="true"
        />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
})
SelectItem.displayName = "SelectItem"

// ============================================================================
// Select Separator
// ============================================================================

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, forwardedRef) => (
  <SelectPrimitive.Separator
    ref={forwardedRef}
    className={cx(
      "-mx-1 my-1 h-px",
      "bg-border",
      className,
    )}
    {...props}
  />
))
SelectSeparator.displayName = "SelectSeparator"

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
