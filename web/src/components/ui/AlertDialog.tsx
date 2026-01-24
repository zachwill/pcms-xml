import React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cx, focusRing } from "@/lib/utils";

const AlertDialog = (
  props: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Root>
) => {
  return <AlertDialogPrimitive.Root {...props} />;
};
AlertDialog.displayName = "AlertDialog";

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogClose = AlertDialogPrimitive.Close;
AlertDialogClose.displayName = "AlertDialogClose";

const AlertDialogPortal = AlertDialogPrimitive.Portal;
AlertDialogPortal.displayName = "AlertDialogPortal";

const AlertDialogBackdrop = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Backdrop>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Backdrop>
>(({ className, ...props }, forwardedRef) => {
  return (
    <AlertDialogPrimitive.Backdrop
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
AlertDialogBackdrop.displayName = "AlertDialogBackdrop";

// Alias for backwards compatibility
const AlertDialogOverlay = AlertDialogBackdrop;
AlertDialogOverlay.displayName = "AlertDialogOverlay";

const AlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Popup>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <AlertDialogPortal>
      <AlertDialogBackdrop />
      <AlertDialogPrimitive.Popup
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
      </AlertDialogPrimitive.Popup>
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cx("flex flex-col gap-y-1", className)} {...props} />;
};
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogTitle = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, forwardedRef) => (
  <AlertDialogPrimitive.Title
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
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, forwardedRef) => {
  return (
    <AlertDialogPrimitive.Description
      ref={forwardedRef}
      className={cx("text-muted-foreground", className)}
      {...props}
    />
  );
});
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogFooter = ({
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
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cx("py-4", className)} {...props} />;
};
AlertDialogBody.displayName = "AlertDialogBody";

const AlertDialogAction = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Close>
>(({ className, ...props }, forwardedRef) => (
  <AlertDialogPrimitive.Close ref={forwardedRef} className={className} {...props} />
));
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Close>
>(({ className, ...props }, forwardedRef) => (
  <AlertDialogPrimitive.Close ref={forwardedRef} className={className} {...props} />
));
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
