import React from "react";
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cx, focusRing } from "@/lib/utils";

const Collapsible = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>
>(({ className, ...props }, forwardedRef) => {
  return (
    <CollapsiblePrimitive.Root
      ref={forwardedRef}
      className={cx("flex w-full flex-col", className)}
      {...props}
    />
  );
});
Collapsible.displayName = "Collapsible";

const CollapsibleTrigger = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <CollapsiblePrimitive.Trigger
      ref={forwardedRef}
      className={cx(
        // base
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors duration-100",
        // text color
        "text-foreground",
        // background
        "bg-muted",
        // hover
        "hover:bg-muted/80",
        // active
        "active:bg-muted/60",
        // disabled
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        // focus ring
        focusRing(),
        className
      )}
      {...props}
    >
      <ChevronIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-data-[panel-open]:rotate-90" />
      {children}
    </CollapsiblePrimitive.Trigger>
  );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsiblePanel = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Panel>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Panel>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <CollapsiblePrimitive.Panel
      ref={forwardedRef}
      className={cx(
        // base
        "h-[var(--collapsible-panel-height)] overflow-hidden text-sm",
        // text color
        "text-muted-foreground",
        // transition
        "transition-[height] duration-200 ease-out",
        "data-[starting-style]:h-0",
        "data-[ending-style]:h-0",
        // ensure proper display when hidden
        "[&[hidden]:not([hidden='until-found'])]:hidden",
        className
      )}
      {...props}
    >
      <div className="pt-2">{children}</div>
    </CollapsiblePrimitive.Panel>
  );
});
CollapsiblePanel.displayName = "CollapsiblePanel";

// Alias for backwards compatibility with common naming
const CollapsibleContent = CollapsiblePanel;
CollapsibleContent.displayName = "CollapsibleContent";

function ChevronIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export {
  Collapsible,
  CollapsibleContent,
  CollapsiblePanel,
  CollapsibleTrigger,
};
