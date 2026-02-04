import React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cx, focusRing } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * Menu (Root)
 * ----------------------------------------------------------------------------------------------- */

type MenuProps = MenuPrimitive.Root.Props;

const Menu = (props: MenuProps) => {
  return <MenuPrimitive.Root {...props} />;
};
Menu.displayName = "Menu";

/* -------------------------------------------------------------------------------------------------
 * MenuTrigger
 * ----------------------------------------------------------------------------------------------- */

const MenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Trigger>
>(({ className, ...props }, forwardedRef) => {
  return (
    <MenuPrimitive.Trigger
      ref={forwardedRef as React.Ref<HTMLButtonElement>}
      className={cx(
        // base
        "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors duration-100",
        // sizing
        "h-9 px-3",
        // colors
        "bg-background",
        "text-foreground",
        "border border-border",
        // hover
        "hover:bg-muted/50",
        // active/open
        "data-[popup-open]:bg-muted",
        // focus
        focusRing(),
        className
      )}
      {...props}
    />
  );
});
MenuTrigger.displayName = "MenuTrigger";

/* -------------------------------------------------------------------------------------------------
 * MenuPortal
 * ----------------------------------------------------------------------------------------------- */

const MenuPortal = MenuPrimitive.Portal;
MenuPortal.displayName = "MenuPortal";

/* -------------------------------------------------------------------------------------------------
 * MenuPositioner
 * ----------------------------------------------------------------------------------------------- */

const MenuPositioner = React.forwardRef<
  React.ComponentRef<typeof MenuPrimitive.Positioner>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Positioner>
>(({ className, ...props }, forwardedRef) => {
  return (
    <MenuPrimitive.Positioner
      ref={forwardedRef}
      className={cx("outline-none z-50", className)}
      {...props}
    />
  );
});
MenuPositioner.displayName = "MenuPositioner";

/* -------------------------------------------------------------------------------------------------
 * MenuContent (wraps Portal + Positioner + Popup)
 * ----------------------------------------------------------------------------------------------- */

type MenuContentProps = React.ComponentPropsWithoutRef<
  typeof MenuPrimitive.Popup
> & {
  sideOffset?: number;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  collisionPadding?: number;
};

const MenuContent = React.forwardRef<
  React.ComponentRef<typeof MenuPrimitive.Popup>,
  MenuContentProps
>(
  (
    {
      className,
      sideOffset = 4,
      side = "bottom",
      align = "start",
      collisionPadding,
      children,
      ...props
    },
    forwardedRef
  ) => {
    return (
      <MenuPortal>
        <MenuPositioner
          sideOffset={sideOffset}
          side={side}
          align={align}
          collisionPadding={collisionPadding}
        >
          <MenuPrimitive.Popup
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
          </MenuPrimitive.Popup>
        </MenuPositioner>
      </MenuPortal>
    );
  }
);
MenuContent.displayName = "MenuContent";

/* -------------------------------------------------------------------------------------------------
 * MenuItem
 * ----------------------------------------------------------------------------------------------- */

const MenuItem = React.forwardRef<
  React.ComponentRef<typeof MenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, forwardedRef) => {
  return (
    <MenuPrimitive.Item
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
MenuItem.displayName = "MenuItem";

/* -------------------------------------------------------------------------------------------------
 * MenuSeparator
 * ----------------------------------------------------------------------------------------------- */

const MenuSeparator = React.forwardRef<
  React.ComponentRef<typeof MenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>
>(({ className, ...props }, forwardedRef) => {
  return (
    <MenuPrimitive.Separator
      ref={forwardedRef}
      className={cx(
        "-mx-1 my-1 h-px bg-border",
        className
      )}
      {...props}
    />
  );
});
MenuSeparator.displayName = "MenuSeparator";

/* -------------------------------------------------------------------------------------------------
 * MenuGroup
 * ----------------------------------------------------------------------------------------------- */

const MenuGroup = MenuPrimitive.Group;
MenuGroup.displayName = "MenuGroup";

/* -------------------------------------------------------------------------------------------------
 * MenuGroupLabel
 * ----------------------------------------------------------------------------------------------- */

const MenuGroupLabel = React.forwardRef<
  React.ComponentRef<typeof MenuPrimitive.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.GroupLabel> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, forwardedRef) => {
  return (
    <MenuPrimitive.GroupLabel
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
MenuGroupLabel.displayName = "MenuGroupLabel";

/* -------------------------------------------------------------------------------------------------
 * MenuCheckboxItem
 * ----------------------------------------------------------------------------------------------- */

const MenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof MenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.CheckboxItem>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <MenuPrimitive.CheckboxItem
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
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon className="h-4 w-4" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
});
MenuCheckboxItem.displayName = "MenuCheckboxItem";

/* -------------------------------------------------------------------------------------------------
 * MenuRadioGroup
 * ----------------------------------------------------------------------------------------------- */

const MenuRadioGroup = MenuPrimitive.RadioGroup;
MenuRadioGroup.displayName = "MenuRadioGroup";

/* -------------------------------------------------------------------------------------------------
 * MenuRadioItem
 * ----------------------------------------------------------------------------------------------- */

const MenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof MenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <MenuPrimitive.RadioItem
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
        <MenuPrimitive.RadioItemIndicator>
          <CircleIcon className="h-2 w-2 fill-current" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
});
MenuRadioItem.displayName = "MenuRadioItem";

/* -------------------------------------------------------------------------------------------------
 * MenuShortcut (helper for keyboard shortcuts)
 * ----------------------------------------------------------------------------------------------- */

const MenuShortcut = ({
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
MenuShortcut.displayName = "MenuShortcut";

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

/* -------------------------------------------------------------------------------------------------
 * Exports
 * ----------------------------------------------------------------------------------------------- */

export {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPortal,
  MenuPositioner,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
};
