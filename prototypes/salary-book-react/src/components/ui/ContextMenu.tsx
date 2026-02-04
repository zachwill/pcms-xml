import React from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { cx } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * ContextMenu (Root)
 * ----------------------------------------------------------------------------------------------- */

type ContextMenuProps = ContextMenuPrimitive.Root.Props;

const ContextMenu = (props: ContextMenuProps) => {
  return <ContextMenuPrimitive.Root {...props} />;
};
ContextMenu.displayName = "ContextMenu";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuTrigger
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>
>(({ className, ...props }, forwardedRef) => {
  return (
    <ContextMenuPrimitive.Trigger
      ref={forwardedRef as React.Ref<HTMLDivElement>}
      className={cx("select-none", className)}
      {...props}
    />
  );
});
ContextMenuTrigger.displayName = "ContextMenuTrigger";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuPortal
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuPortal = ContextMenuPrimitive.Portal;
ContextMenuPortal.displayName = "ContextMenuPortal";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuPositioner
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuPositioner = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Positioner>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Positioner>
>(({ className, ...props }, forwardedRef) => {
  return (
    <ContextMenuPrimitive.Positioner
      ref={forwardedRef}
      className={cx("outline-none z-50", className)}
      {...props}
    />
  );
});
ContextMenuPositioner.displayName = "ContextMenuPositioner";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuContent (wraps Portal + Positioner + Popup)
 * ----------------------------------------------------------------------------------------------- */

type ContextMenuContentProps = React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.Popup
> & {
  collisionPadding?: number;
};

const ContextMenuContent = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Popup>,
  ContextMenuContentProps
>(({ className, collisionPadding, children, ...props }, forwardedRef) => {
  return (
    <ContextMenuPortal>
      <ContextMenuPositioner collisionPadding={collisionPadding}>
        <ContextMenuPrimitive.Popup
          ref={forwardedRef}
          className={cx(
            // base
            "min-w-[8rem] overflow-hidden rounded-md border py-1 shadow-md",
            // colors
            "border-border",
            "bg-background",
            "text-foreground",
            // animation
            "origin-[var(--transform-origin)] transition-[transform,scale,opacity] duration-100",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </ContextMenuPrimitive.Popup>
      </ContextMenuPositioner>
    </ContextMenuPortal>
  );
});
ContextMenuContent.displayName = "ContextMenuContent";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuItem
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuItem = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, forwardedRef) => {
  return (
    <ContextMenuPrimitive.Item
      ref={forwardedRef}
      className={cx(
        // base
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100",
        // disabled
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // highlighted (keyboard/hover)
        "data-[highlighted]:bg-muted",
        "data-[highlighted]:text-foreground",
        // inset
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
});
ContextMenuItem.displayName = "ContextMenuItem";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuSeparator
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, forwardedRef) => {
  return (
    <ContextMenuPrimitive.Separator
      ref={forwardedRef}
      className={cx(
        "-mx-1 my-1 h-px bg-border",
        className
      )}
      {...props}
    />
  );
});
ContextMenuSeparator.displayName = "ContextMenuSeparator";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuGroup
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuGroup = ContextMenuPrimitive.Group;
ContextMenuGroup.displayName = "ContextMenuGroup";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuGroupLabel
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuGroupLabel = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.GroupLabel> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, forwardedRef) => {
  return (
    <ContextMenuPrimitive.GroupLabel
      ref={forwardedRef}
      className={cx(
        "px-2 py-1.5 text-xs font-medium uppercase text-muted-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
});
ContextMenuGroupLabel.displayName = "ContextMenuGroupLabel";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuCheckboxItem
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <ContextMenuPrimitive.CheckboxItem
      ref={forwardedRef}
      className={cx(
        // base
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors duration-100",
        // disabled
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // highlighted
        "data-[highlighted]:bg-muted",
        "data-[highlighted]:text-foreground",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <CheckIcon className="h-4 w-4" />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
});
ContextMenuCheckboxItem.displayName = "ContextMenuCheckboxItem";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuRadioGroup
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;
ContextMenuRadioGroup.displayName = "ContextMenuRadioGroup";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuRadioItem
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <ContextMenuPrimitive.RadioItem
      ref={forwardedRef}
      className={cx(
        // base
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors duration-100",
        // disabled
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // highlighted
        "data-[highlighted]:bg-muted",
        "data-[highlighted]:text-foreground",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.RadioItemIndicator>
          <CircleIcon className="h-2 w-2 fill-current" />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
});
ContextMenuRadioItem.displayName = "ContextMenuRadioItem";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuSubmenu (Root)
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuSubmenu = ContextMenuPrimitive.SubmenuRoot;

/* -------------------------------------------------------------------------------------------------
 * ContextMenuSubmenuTrigger
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuSubmenuTrigger = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.SubmenuTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubmenuTrigger>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      ref={forwardedRef}
      className={cx(
        // base
        "relative flex cursor-default select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100",
        // disabled
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // highlighted
        "data-[highlighted]:bg-muted",
        "data-[highlighted]:text-foreground",
        // popup open
        "data-[popup-open]:bg-muted",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto h-4 w-4" />
    </ContextMenuPrimitive.SubmenuTrigger>
  );
});
ContextMenuSubmenuTrigger.displayName = "ContextMenuSubmenuTrigger";

/* -------------------------------------------------------------------------------------------------
 * ContextMenuShortcut (helper for keyboard shortcuts)
 * ----------------------------------------------------------------------------------------------- */

const ContextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cx(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  );
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

/* -------------------------------------------------------------------------------------------------
 * Icons
 * ----------------------------------------------------------------------------------------------- */

function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CircleIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

function ChevronRightIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Exports
 * ----------------------------------------------------------------------------------------------- */

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuGroupLabel,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuPositioner,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSubmenu,
  ContextMenuSubmenuTrigger,
  ContextMenuTrigger,
};
