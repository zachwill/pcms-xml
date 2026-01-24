import React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cx } from "@/lib/utils";
import { tv, type VariantProps } from "tailwind-variants";

// =============================================================================
// Toast Manager
// =============================================================================

// Global toast manager for use outside of React tree
export const toastManager = ToastPrimitive.createToastManager();

// Hook to use toast manager within React components
export const useToast = ToastPrimitive.useToastManager;

// =============================================================================
// Toast Variants
// =============================================================================

const toastVariants = tv({
  base: [
    // positioning and stacking
    "[--gap:0.75rem] [--peek:0.75rem]",
    "[--scale:calc(max(0,1-(var(--toast-index)*0.1)))]",
    "[--shrink:calc(1-var(--scale))]",
    "[--height:var(--toast-frontmost-height,var(--toast-height))]",
    "[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
    "absolute right-0 bottom-0 left-auto z-[calc(1000-var(--toast-index))]",
    "mr-0 w-full origin-bottom",
    "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
    // base styling
    "rounded-md border bg-clip-padding p-4 shadow-lg select-none",
    // height
    "h-[var(--height)]",
    // pseudo element for gap
    "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
    // transitions
    "[transition:transform_0.4s_cubic-bezier(0.22,1,0.36,1),opacity_0.4s,height_0.1s]",
    // expanded state
    "data-[expanded]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))]",
    "data-[expanded]:h-[var(--toast-height)]",
    // starting style (enter animation)
    "data-[starting-style]:[transform:translateY(150%)]",
    // ending style (exit animation)
    "data-[ending-style]:opacity-0",
    "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
    // limited state (when exceeding limit)
    "data-[limited]:opacity-0",
    // swipe direction animations
    "data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
    "data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
    "data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
    "data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
    "data-[expanded]:data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
    "data-[expanded]:data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
    "data-[expanded]:data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
    "data-[expanded]:data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
  ],
  variants: {
    variant: {
      default: [
        "border-border bg-background text-foreground",
      ],
      success: [
        "border-emerald-200 bg-emerald-50 text-emerald-900",
        "dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50",
      ],
      error: [
        "border-red-200 bg-red-50 text-red-900",
        "dark:border-red-900 dark:bg-red-950 dark:text-red-50",
      ],
      warning: [
        "border-amber-200 bg-amber-50 text-amber-900",
        "dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50",
      ],
      info: [
        "border-blue-200 bg-blue-50 text-blue-900",
        "dark:border-blue-900 dark:bg-blue-950 dark:text-blue-50",
      ],
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type ToastVariant = VariantProps<typeof toastVariants>["variant"];

// Extend toast data type to include variant
export interface ToastData {
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
}

// =============================================================================
// Toast Provider
// =============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
  timeout?: number;
  limit?: number;
}

const ToastProvider = ({
  children,
  timeout = 5000,
  limit = 3,
}: ToastProviderProps) => {
  return (
    <ToastPrimitive.Provider
      toastManager={toastManager}
      timeout={timeout}
      limit={limit}
    >
      {children}
      <ToastPrimitive.Portal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
};
ToastProvider.displayName = "ToastProvider";

// =============================================================================
// Toast Viewport
// =============================================================================

const ToastViewport = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cx(
      "fixed z-50 bottom-4 right-4 mx-auto flex w-[320px] sm:bottom-6 sm:right-6 sm:w-[360px]",
      "outline-none",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

// =============================================================================
// Toast List (internal)
// =============================================================================

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toast) => {
    const data = toast.data as ToastData | undefined;
    return (
      <ToastRoot key={toast.id} toast={toast} variant={data?.variant}>
        <ToastContent>
          {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
          {toast.description && (
            <ToastDescription>{toast.description}</ToastDescription>
          )}
          {data?.actionLabel && data?.onAction && (
            <ToastAction onClick={data.onAction}>{data.actionLabel}</ToastAction>
          )}
          <ToastClose />
        </ToastContent>
      </ToastRoot>
    );
  });
}

// =============================================================================
// Toast Root
// =============================================================================

interface ToastRootProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: ToastVariant;
}

const ToastRoot = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Root>,
  ToastRootProps
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cx(toastVariants({ variant }), className)}
    {...props}
  />
));
ToastRoot.displayName = "ToastRoot";

// =============================================================================
// Toast Content
// =============================================================================

const ToastContent = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Content
    ref={ref}
    className={cx(
      "overflow-hidden pr-6",
      "transition-opacity duration-200",
      "data-[behind]:pointer-events-none data-[behind]:opacity-0",
      "data-[expanded]:pointer-events-auto data-[expanded]:opacity-100",
      className
    )}
    {...props}
  />
));
ToastContent.displayName = "ToastContent";

// =============================================================================
// Toast Title
// =============================================================================

const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cx("text-sm font-semibold leading-5", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

// =============================================================================
// Toast Description
// =============================================================================

const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cx("text-sm leading-5 opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

// =============================================================================
// Toast Action
// =============================================================================

interface ToastActionProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action> {
  onClick?: () => void;
}

const ToastAction = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Action>,
  ToastActionProps
>(({ className, onClick, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    onClick={onClick}
    className={cx(
      "mt-2 inline-flex items-center rounded px-2 py-1 text-sm font-medium",
      "bg-foreground/10 hover:bg-foreground/20",
      "transition-colors duration-100",
      "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-foreground",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

// =============================================================================
// Toast Close
// =============================================================================

const ToastClose = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    aria-label="Close"
    className={cx(
      "absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded",
      "border-none bg-transparent opacity-60 hover:opacity-100",
      "transition-opacity duration-100",
      "focus-visible:outline-none",
      className
    )}
    {...props}
  >
    <XIcon className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = "ToastClose";

// =============================================================================
// Helper Functions
// =============================================================================

interface ToastOptions {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Convenience functions for creating toasts
export const toast = {
  show: (options: ToastOptions) =>
    toastManager.add({
      title: options.title,
      description: options.description,
      data: {
        variant: "default",
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      } as ToastData,
    }),
  success: (options: ToastOptions) =>
    toastManager.add({
      title: options.title,
      description: options.description,
      data: {
        variant: "success",
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      } as ToastData,
    }),
  error: (options: ToastOptions) =>
    toastManager.add({
      title: options.title,
      description: options.description,
      data: {
        variant: "error",
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      } as ToastData,
    }),
  warning: (options: ToastOptions) =>
    toastManager.add({
      title: options.title,
      description: options.description,
      data: {
        variant: "warning",
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      } as ToastData,
    }),
  info: (options: ToastOptions) =>
    toastManager.add({
      title: options.title,
      description: options.description,
      data: {
        variant: "info",
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      } as ToastData,
    }),
  dismiss: (id: string) => toastManager.close(id),
};

// =============================================================================
// Icons
// =============================================================================

function XIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

// =============================================================================
// Exports
// =============================================================================

export {
  ToastProvider,
  ToastViewport,
  ToastRoot,
  ToastContent,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
};

// Also export primitives for advanced usage
export { ToastPrimitive as ToastPrimitives };
