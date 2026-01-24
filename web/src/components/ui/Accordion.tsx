import React from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { cx, focusRing } from "@/lib/utils";

const Accordion = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>(({ className, ...props }, forwardedRef) => {
  return (
    <AccordionPrimitive.Root
      ref={forwardedRef}
      className={cx("flex w-full flex-col", className)}
      {...props}
    />
  );
});
Accordion.displayName = "Accordion";

const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, forwardedRef) => {
  return (
    <AccordionPrimitive.Item
      ref={forwardedRef}
      className={cx(
        "border-b border-border",
        className
      )}
      {...props}
    />
  );
});
AccordionItem.displayName = "AccordionItem";

const AccordionHeader = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Header>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Header>
>(({ className, ...props }, forwardedRef) => {
  return (
    <AccordionPrimitive.Header
      ref={forwardedRef}
      className={cx("flex", className)}
      {...props}
    />
  );
});
AccordionHeader.displayName = "AccordionHeader";

const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <AccordionPrimitive.Trigger
      ref={forwardedRef}
      className={cx(
        // base
        "group flex flex-1 items-center justify-between py-4 text-left text-sm font-medium transition-colors duration-100",
        // text color
        "text-foreground",
        // hover
        "hover:text-muted-foreground",
        // disabled
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        // focus ring
        focusRing(),
        className
      )}
      {...props}
    >
      {children}
      <ChevronIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-data-[panel-open]:rotate-180" />
    </AccordionPrimitive.Trigger>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionPanel = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Panel>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Panel>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <AccordionPrimitive.Panel
      ref={forwardedRef}
      className={cx(
        // base
        "h-[var(--accordion-panel-height)] overflow-hidden text-sm",
        // text color
        "text-muted-foreground",
        // transition
        "transition-[height] duration-200 ease-out",
        "data-[starting-style]:h-0",
        "data-[ending-style]:h-0",
        className
      )}
      {...props}
    >
      <div className="pb-4">{children}</div>
    </AccordionPrimitive.Panel>
  );
});
AccordionPanel.displayName = "AccordionPanel";

// Alias for backwards compatibility with common naming
const AccordionContent = AccordionPanel;
AccordionContent.displayName = "AccordionContent";

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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
};
