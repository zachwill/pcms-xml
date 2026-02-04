import React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cx, focusRing } from "@/lib/utils";
import { tv, type VariantProps } from "tailwind-variants";

const Sheet = (
  props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>
) => {
  return <DialogPrimitive.Root {...props} />;
};
Sheet.displayName = "Sheet";

const SheetTrigger = DialogPrimitive.Trigger;

const SheetClose = DialogPrimitive.Close;

const SheetPortal = DialogPrimitive.Portal;

const SheetBackdrop = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Backdrop>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Backdrop>
>(({ className, ...props }, forwardedRef) => {
  return (
    <DialogPrimitive.Backdrop
      ref={forwardedRef}
      className={cx(
        // base
        "fixed inset-0 z-50 min-h-dvh",
        // background color
        "bg-black/70",
        // animation
        "transition-opacity duration-200",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        className
      )}
      {...props}
    />
  );
});
SheetBackdrop.displayName = "SheetBackdrop";

// Alias for backwards compatibility
const SheetOverlay = SheetBackdrop;
SheetOverlay.displayName = "SheetOverlay";

const sheetContentVariants = tv({
  base: [
    // base
    "fixed z-50 flex flex-col gap-4 overflow-y-auto shadow-lg",
    "bg-background",
    // border color
    "border-border",
    // animation
    "transition-transform duration-200 ease-out",
    focusRing(),
  ],
  variants: {
    side: {
      top: [
        "inset-x-0 top-0 border-b",
        "data-[starting-style]:-translate-y-full",
        "data-[ending-style]:-translate-y-full",
      ],
      bottom: [
        "inset-x-0 bottom-0 border-t",
        "data-[starting-style]:translate-y-full",
        "data-[ending-style]:translate-y-full",
      ],
      left: [
        "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
        "data-[starting-style]:-translate-x-full",
        "data-[ending-style]:-translate-x-full",
      ],
      right: [
        "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
        "data-[starting-style]:translate-x-full",
        "data-[ending-style]:translate-x-full",
      ],
    },
  },
  defaultVariants: {
    side: "right",
  },
});

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>,
    VariantProps<typeof sheetContentVariants> {}

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Popup>,
  SheetContentProps
>(({ className, children, side = "right", ...props }, forwardedRef) => {
  return (
    <SheetPortal>
      <SheetBackdrop />
      <DialogPrimitive.Popup
        ref={forwardedRef}
        data-sheet={side}
        className={cx(sheetContentVariants({ side }), className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </SheetPortal>
  );
});
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cx("flex flex-col gap-y-1 px-6 pt-6", className)}
      {...props}
    />
  );
};
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, forwardedRef) => (
  <DialogPrimitive.Title
    ref={forwardedRef}
    className={cx(
      // base
      "text-lg font-semibold tracking-tight",
      // text color
      "text-foreground",
      className
    )}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, forwardedRef) => {
  return (
    <DialogPrimitive.Description
      ref={forwardedRef}
      className={cx("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
SheetDescription.displayName = "SheetDescription";

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cx(
        "mt-auto flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
};
SheetFooter.displayName = "SheetFooter";

const SheetBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cx("flex-1 px-6 py-4", className)} {...props} />;
};
SheetBody.displayName = "SheetBody";

export {
  Sheet,
  SheetBackdrop,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
