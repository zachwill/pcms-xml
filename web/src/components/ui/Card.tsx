import { Slot } from "@radix-ui/react-slot"
import React from "react"
import { cx } from "@/lib/utils"

interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div"
    return (
      <Component
        ref={forwardedRef}
        className={cx(
          // base
          "relative w-full rounded-md border p-6 text-left",
          // background color
          "bg-background",
          // border color
          "border-border",
          className,
        )}
        {...props}
      />
    )
  },
)
Card.displayName = "Card"

export { Card, type CardProps }
