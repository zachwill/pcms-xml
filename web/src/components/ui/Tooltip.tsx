import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import React from "react"
import { cx } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
  side?: "bottom" | "left" | "top" | "right"
  sideOffset?: number
  showArrow?: boolean
  triggerAsChild?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  className?: string
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      children,
      className,
      content,
      delayDuration = 150,
      defaultOpen,
      open,
      onClick,
      onOpenChange,
      showArrow = true,
      side = "top",
      sideOffset = 10,
      triggerAsChild = false,
    }: TooltipProps,
    forwardedRef,
  ) => {
    return (
      <TooltipPrimitive.Provider delay={delayDuration}>
        <TooltipPrimitive.Root
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
        >
          <TooltipPrimitive.Trigger
            onClick={onClick}
            render={triggerAsChild ? (children as React.ReactElement) : undefined}
          >
            {triggerAsChild ? undefined : children}
          </TooltipPrimitive.Trigger>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
              <TooltipPrimitive.Popup
                ref={forwardedRef}
                className={cx(
                  // base
                  "max-w-60 select-none rounded-md px-2.5 py-1.5 text-sm leading-5 shadow-md",
                  // text color - inverted
                  "text-primary-foreground",
                  // background color
                  "bg-foreground",
                  // transform origin for animations
                  "origin-[var(--transform-origin)]",
                  // transitions
                  "transition-[transform,scale,opacity] duration-100",
                  "data-[starting-style]:scale-90 data-[starting-style]:opacity-0",
                  "data-[ending-style]:scale-90 data-[ending-style]:opacity-0",
                  className,
                )}
              >
                {content}
                {showArrow ? (
                  <TooltipPrimitive.Arrow
                    className={cx(
                      "data-[side=bottom]:top-[-7px] data-[side=bottom]:rotate-180",
                      "data-[side=top]:bottom-[-7px] data-[side=top]:rotate-0",
                      "data-[side=left]:right-[-10px] data-[side=left]:-rotate-90",
                      "data-[side=right]:left-[-10px] data-[side=right]:rotate-90",
                    )}
                  >
                    <svg
                      width="12"
                      height="7"
                      viewBox="0 0 12 7"
                      className="fill-foreground"
                      aria-hidden="true"
                    >
                      <polygon points="0,0 6,7 12,0" />
                    </svg>
                  </TooltipPrimitive.Arrow>
                ) : null}
              </TooltipPrimitive.Popup>
            </TooltipPrimitive.Positioner>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    )
  },
)
Tooltip.displayName = "Tooltip"

export { Tooltip, type TooltipProps }
