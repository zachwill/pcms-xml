import React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cx, focusRing } from "@/lib/utils";

const Dialog = (
  props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>
) => {
  return <DialogPrimitive.Root {...props} />;
};
Dialog.displayName = "Dialog";

const DialogTrigger = DialogPrimitive.Trigger;

const DialogClose = DialogPrimitive.Close;
DialogClose.displayName = "DialogClose";

const DialogPortal = DialogPrimitive.Portal;
DialogPortal.displayName = "DialogPortal";

const DialogBackdrop = React.forwardRef<
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
        "transition-opacity duration-100",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        className
      )}
      {...props}
    />
  );
});
DialogBackdrop.displayName = "DialogBackdrop";

// Alias for backwards compatibility
const DialogOverlay = DialogBackdrop;
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPrimitive.Popup
        ref={forwardedRef}
        data-dialog=""
        className={cx(
          // base
          "fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border p-6 shadow-lg",
          // border color
          "border-border",
          // background color
          "bg-background",
          // animation
          "transition-opacity duration-100",
          "data-[starting-style]:opacity-0",
          "data-[ending-style]:opacity-0",
          focusRing(),
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cx("flex flex-col gap-y-1", className)} {...props} />;
};
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<
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
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, forwardedRef) => {
  return (
    <DialogPrimitive.Description
      ref={forwardedRef}
      className={cx("text-muted-foreground", className)}
      {...props}
    />
  );
});
DialogDescription.displayName = "DialogDescription";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cx(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  );
};
DialogFooter.displayName = "DialogFooter";

const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cx("py-4", className)} {...props} />;
};
DialogBody.displayName = "DialogBody";

export {
  Dialog,
  DialogBackdrop,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
