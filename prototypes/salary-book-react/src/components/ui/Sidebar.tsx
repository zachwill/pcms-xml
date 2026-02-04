import React from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { cx, focusRing } from "@/lib/utils";
import { tv, type VariantProps } from "tailwind-variants";

// ============================================================================
// Sidebar Context
// ============================================================================

interface SidebarContextValue {
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  collapsible: boolean;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a Sidebar");
  }
  return context;
}

// ============================================================================
// Sidebar Root
// ============================================================================

const sidebarVariants = tv({
  base: [
    // base
    "flex h-full flex-col",
    // background
    "bg-background",
    // border
    "border-r border-border",
    // transition
    "transition-[width] duration-200 ease-out",
  ],
  variants: {
    variant: {
      default: "",
      inset: "rounded-md border shadow-sm",
      floating: "rounded-md border shadow-lg",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface SidebarProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sidebarVariants> {
  /** Whether the sidebar can be collapsed */
  collapsible?: boolean;
  /** Whether the sidebar is expanded (controlled) */
  expanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Default expanded state (uncontrolled) */
  defaultExpanded?: boolean;
  /** Collapsed width */
  collapsedWidth?: string;
  /** Expanded width */
  expandedWidth?: string;
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  (
    {
      className,
      children,
      variant,
      collapsible = false,
      expanded: expandedProp,
      onExpandedChange,
      defaultExpanded = true,
      collapsedWidth = "4rem",
      expandedWidth = "16rem",
      style,
      ...props
    },
    forwardedRef
  ) => {
    const [internalExpanded, setInternalExpanded] =
      React.useState(defaultExpanded);

    const expanded = expandedProp ?? internalExpanded;
    const setExpanded = React.useCallback(
      (value: React.SetStateAction<boolean>) => {
        const newValue =
          typeof value === "function" ? value(expanded) : value;
        setInternalExpanded(newValue);
        onExpandedChange?.(newValue);
      },
      [expanded, onExpandedChange]
    );

    const contextValue = React.useMemo(
      () => ({ expanded, setExpanded, collapsible }),
      [expanded, setExpanded, collapsible]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <aside
          ref={forwardedRef}
          data-expanded={expanded ? "" : undefined}
          data-collapsed={!expanded ? "" : undefined}
          className={cx(sidebarVariants({ variant }), className)}
          style={{
            width: collapsible
              ? expanded
                ? expandedWidth
                : collapsedWidth
              : expandedWidth,
            ...style,
          }}
          {...props}
        >
          {children}
        </aside>
      </SidebarContext.Provider>
    );
  }
);
Sidebar.displayName = "Sidebar";

// ============================================================================
// Sidebar Header
// ============================================================================

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={cx(
        "flex shrink-0 items-center gap-2 px-4 py-3",
        "border-b border-border",
        className
      )}
      {...props}
    />
  );
});
SidebarHeader.displayName = "SidebarHeader";

// ============================================================================
// Sidebar Content
// ============================================================================

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={cx("flex-1 overflow-y-auto overflow-x-hidden p-2", className)}
      {...props}
    />
  );
});
SidebarContent.displayName = "SidebarContent";

// ============================================================================
// Sidebar Footer
// ============================================================================

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={cx(
        "mt-auto shrink-0 px-4 py-3",
        "border-t border-border",
        className
      )}
      {...props}
    />
  );
});
SidebarFooter.displayName = "SidebarFooter";

// ============================================================================
// Sidebar Toggle
// ============================================================================

const SidebarToggle = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, forwardedRef) => {
  const { expanded, setExpanded, collapsible } = useSidebar();

  if (!collapsible) return null;

  return (
    <button
      ref={forwardedRef}
      type="button"
      onClick={() => setExpanded(!expanded)}
      aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      className={cx(
        // base
        "inline-flex items-center justify-center rounded-md p-2",
        // background
        "bg-transparent hover:bg-muted/50",
        // text color
        "text-muted-foreground hover:text-foreground",
        // transition
        "transition-colors duration-100",
        // focus
        focusRing(),
        className
      )}
      {...props}
    >
      {children ?? (
        <ChevronIcon
          className={cx(
            "size-4 transition-transform duration-200",
            expanded ? "rotate-0" : "rotate-180"
          )}
        />
      )}
    </button>
  );
});
SidebarToggle.displayName = "SidebarToggle";

// ============================================================================
// Sidebar Section
// ============================================================================

const SidebarSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={cx("flex flex-col gap-1 py-2", className)}
      {...props}
    />
  );
});
SidebarSection.displayName = "SidebarSection";

// ============================================================================
// Sidebar Section Title
// ============================================================================

const SidebarSectionTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, forwardedRef) => {
  const { expanded } = useSidebar();

  return (
    <div
      ref={forwardedRef}
      className={cx(
        // base
        "px-3 py-1.5 text-xs font-medium uppercase tracking-wide",
        // text color
        "text-muted-foreground",
        // truncate when collapsed
        "truncate",
        // hide text when collapsed
        !expanded && "opacity-0",
        // transition
        "transition-opacity duration-200",
        className
      )}
      {...props}
    />
  );
});
SidebarSectionTitle.displayName = "SidebarSectionTitle";

// ============================================================================
// Sidebar Item
// ============================================================================

const sidebarItemVariants = tv({
  base: [
    // base
    "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
    // text color
    "text-muted-foreground",
    // hover
    "hover:bg-muted/50 hover:text-foreground",
    // transition
    "transition-colors duration-100",
    // focus
    focusRing(),
    // disabled
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  variants: {
    active: {
      true: [
        "bg-muted text-foreground",
      ],
    },
  },
  defaultVariants: {
    active: false,
  },
});

interface SidebarItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarItemVariants> {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Badge to display */
  badge?: React.ReactNode;
}

const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  (
    { className, children, icon, badge, active, ...props },
    forwardedRef
  ) => {
    const { expanded } = useSidebar();

    return (
      <button
        ref={forwardedRef}
        type="button"
        data-active={active ? "" : undefined}
        className={cx(sidebarItemVariants({ active }), className)}
        {...props}
      >
        {icon && (
          <span className="shrink-0 text-muted-foreground group-data-[active]:text-foreground">
            {icon}
          </span>
        )}
        <span
          className={cx(
            "flex-1 truncate text-left",
            !expanded && "sr-only"
          )}
        >
          {children}
        </span>
        {badge && expanded && (
          <span className="shrink-0">{badge}</span>
        )}
      </button>
    );
  }
);
SidebarItem.displayName = "SidebarItem";

// ============================================================================
// Sidebar Group (Collapsible)
// ============================================================================

interface SidebarGroupProps
  extends React.ComponentPropsWithoutRef<typeof Collapsible.Root> {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Label for the group */
  label: React.ReactNode;
}

const SidebarGroup = React.forwardRef<
  React.ComponentRef<typeof Collapsible.Root>,
  SidebarGroupProps
>(
  (
    { className, children, icon, label, defaultOpen = true, ...props },
    forwardedRef
  ) => {
    const { expanded } = useSidebar();

    return (
      <Collapsible.Root
        ref={forwardedRef}
        defaultOpen={defaultOpen}
        className={cx("flex flex-col", className)}
        {...props}
      >
        <Collapsible.Trigger
          className={cx(
            // base
            "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
            // text color
            "text-muted-foreground",
            // hover
            "hover:bg-muted/50 hover:text-foreground",
            // transition
            "transition-colors duration-100",
            // focus
            focusRing()
          )}
        >
          {icon && (
            <span className="shrink-0 text-muted-foreground">
              {icon}
            </span>
          )}
          <span
            className={cx(
              "flex-1 truncate text-left",
              !expanded && "sr-only"
            )}
          >
            {label}
          </span>
          {expanded && (
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-180" />
          )}
        </Collapsible.Trigger>
        <Collapsible.Panel
          className={cx(
            // base
            "flex h-[var(--collapsible-panel-height)] flex-col overflow-hidden",
            // transition
            "transition-[height] duration-200 ease-out",
            "data-[starting-style]:h-0",
            "data-[ending-style]:h-0",
            // indent children
            "pl-4"
          )}
        >
          <div className="flex flex-col gap-1 py-1">{children}</div>
        </Collapsible.Panel>
      </Collapsible.Root>
    );
  }
);
SidebarGroup.displayName = "SidebarGroup";

// ============================================================================
// Sidebar Separator
// ============================================================================

const SidebarSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={cx(
        "mx-3 my-2 h-px bg-border",
        className
      )}
      {...props}
    />
  );
});
SidebarSeparator.displayName = "SidebarSeparator";

// ============================================================================
// Icons
// ============================================================================

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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronDownIcon(props: React.ComponentProps<"svg">) {
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

// ============================================================================
// Exports
// ============================================================================

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
  SidebarSectionTitle,
  SidebarSeparator,
  SidebarToggle,
  useSidebar,
};
