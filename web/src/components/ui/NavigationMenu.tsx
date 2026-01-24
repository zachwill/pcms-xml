import React from 'react';
import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu';
import { cx, focusRing } from '@/lib/utils';

// Root
type NavigationMenuRootProps = NavigationMenuPrimitive.Root.Props;

const NavigationMenu = React.forwardRef<
  HTMLElement,
  NavigationMenuRootProps
>(({ className, ...props }, ref) => {
  return (
    <NavigationMenuPrimitive.Root
      ref={ref}
      className={cx(
        'relative min-w-max rounded-md p-1',
        'bg-muted',
        'text-foreground',
        className,
      )}
      {...props}
    />
  );
});
NavigationMenu.displayName = 'NavigationMenu';

// List
const NavigationMenuList = React.forwardRef<
  HTMLDivElement,
  NavigationMenuPrimitive.List.Props
>(({ className, ...props }, ref) => {
  return (
    <NavigationMenuPrimitive.List
      ref={ref}
      className={cx('relative flex list-none gap-1', className)}
      {...props}
    />
  );
});
NavigationMenuList.displayName = 'NavigationMenuList';

// Item
const NavigationMenuItem = React.forwardRef<
  HTMLDivElement,
  NavigationMenuPrimitive.Item.Props
>((props, ref) => {
  return <NavigationMenuPrimitive.Item ref={ref} {...props} />;
});
NavigationMenuItem.displayName = 'NavigationMenuItem';

// Trigger
const NavigationMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  NavigationMenuPrimitive.Trigger.Props
>(({ className, children, ...props }, ref) => {
  return (
    <NavigationMenuPrimitive.Trigger
      ref={ref}
      className={cx(
        'group box-border flex h-10 items-center justify-center gap-1.5 rounded-md px-3.5 text-sm font-medium transition-colors duration-100',
        'bg-transparent text-foreground',
        'select-none outline-none',
        'hover:bg-muted/80',
        focusRing(),
        'data-[popup-open]:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </NavigationMenuPrimitive.Trigger>
  );
});
NavigationMenuTrigger.displayName = 'NavigationMenuTrigger';

// Icon (chevron)
const NavigationMenuIcon = React.forwardRef<
  HTMLDivElement,
  NavigationMenuPrimitive.Icon.Props
>(({ className, children, ...props }, ref) => {
  return (
    <NavigationMenuPrimitive.Icon
      ref={ref}
      className={cx(
        'transition-transform duration-200 ease-in-out',
        'data-[popup-open]:rotate-180',
        className,
      )}
      {...props}
    >
      {children ?? <ChevronDownIcon />}
    </NavigationMenuPrimitive.Icon>
  );
});
NavigationMenuIcon.displayName = 'NavigationMenuIcon';

// Content
const NavigationMenuContent = React.forwardRef<
  HTMLDivElement,
  NavigationMenuPrimitive.Content.Props
>(({ className, ...props }, ref) => {
  return (
    <NavigationMenuPrimitive.Content
      ref={ref}
      className={cx(
        'box-border h-full p-4',
        'transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
        'data-[starting-style]:data-[activation-direction=left]:-translate-x-1/2',
        'data-[starting-style]:data-[activation-direction=right]:translate-x-1/2',
        'data-[ending-style]:data-[activation-direction=left]:translate-x-1/2',
        'data-[ending-style]:data-[activation-direction=right]:-translate-x-1/2',
        className,
      )}
      {...props}
    />
  );
});
NavigationMenuContent.displayName = 'NavigationMenuContent';

// Link
type NavigationMenuLinkProps = NavigationMenuPrimitive.Link.Props & {
  href?: string;
};

const NavigationMenuLink = React.forwardRef<
  HTMLAnchorElement,
  NavigationMenuLinkProps
>(({ className, ...props }, ref) => {
  return (
    <NavigationMenuPrimitive.Link
      ref={ref}
      render={<a />}
      className={cx(
        'box-border flex h-10 items-center justify-center gap-1.5 rounded-md px-3.5 text-sm font-medium transition-colors duration-100',
        'bg-transparent text-foreground',
        'select-none no-underline outline-none',
        'hover:bg-muted/80',
        focusRing(),
        className,
      )}
      {...props}
    />
  );
});
NavigationMenuLink.displayName = 'NavigationMenuLink';

// Portal + Positioner + Popup composition
type NavigationMenuPopupProps = NavigationMenuPrimitive.Popup.Props & {
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  collisionPadding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  showArrow?: boolean;
};

const NavigationMenuPopup = React.forwardRef<HTMLDivElement, NavigationMenuPopupProps>(
  (
    {
      className,
      sideOffset = 10,
      align = 'center',
      side = 'bottom',
      collisionPadding = { top: 5, bottom: 5, left: 20, right: 20 },
      showArrow = false,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <NavigationMenuPrimitive.Portal>
        <NavigationMenuPrimitive.Positioner
          sideOffset={sideOffset}
          align={align}
          side={side}
          collisionPadding={collisionPadding}
          className={cx(
            'box-border',
            'h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)]',
            'transition-[top,left,right,bottom] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'data-[instant]:transition-none',
            // Invisible padding to prevent hover gaps
            "before:absolute before:content-['']",
            'data-[side=top]:before:right-0 data-[side=top]:before:-bottom-2.5 data-[side=top]:before:left-0 data-[side=top]:before:h-2.5',
            'data-[side=bottom]:before:-top-2.5 data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0 data-[side=bottom]:before:h-2.5',
            'data-[side=left]:before:top-0 data-[side=left]:before:-right-2.5 data-[side=left]:before:bottom-0 data-[side=left]:before:w-2.5',
            'data-[side=right]:before:top-0 data-[side=right]:before:bottom-0 data-[side=right]:before:-left-2.5 data-[side=right]:before:w-2.5',
          )}
        >
          <NavigationMenuPrimitive.Popup
            ref={ref}
            className={cx(
              'relative overflow-visible',
              'h-[var(--popup-height)] w-[var(--popup-width)]',
              'origin-[var(--transform-origin)]',
              'rounded-md border shadow-lg',
              'border-border',
              'bg-background',
              'text-foreground',
              'transition-[opacity,transform,width,height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
              'data-[starting-style]:scale-90 data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[ending-style]:duration-100',
              className,
            )}
            {...props}
          >
            {showArrow && (
              <NavigationMenuPrimitive.Arrow
                className={cx(
                  'flex transition-[left] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  'data-[side=top]:-bottom-2 data-[side=top]:rotate-180',
                  'data-[side=bottom]:-top-2',
                  'data-[side=left]:-right-3 data-[side=left]:rotate-90',
                  'data-[side=right]:-left-3 data-[side=right]:-rotate-90',
                )}
              >
                <ArrowSvg />
              </NavigationMenuPrimitive.Arrow>
            )}
            <NavigationMenuPrimitive.Viewport className="relative h-full w-full overflow-hidden">
              {children}
            </NavigationMenuPrimitive.Viewport>
          </NavigationMenuPrimitive.Popup>
        </NavigationMenuPrimitive.Positioner>
      </NavigationMenuPrimitive.Portal>
    );
  },
);
NavigationMenuPopup.displayName = 'NavigationMenuPopup';

// Backdrop (optional overlay)
const NavigationMenuBackdrop = React.forwardRef<
  HTMLDivElement,
  NavigationMenuPrimitive.Backdrop.Props
>(({ className, ...props }, ref) => {
  return (
    <NavigationMenuPrimitive.Backdrop
      ref={ref}
      className={cx(
        'fixed inset-0 z-40',
        'bg-black/20 dark:bg-black/40',
        'transition-opacity duration-100',
        'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
        className,
      )}
      {...props}
    />
  );
});
NavigationMenuBackdrop.displayName = 'NavigationMenuBackdrop';

// Link card component for dropdown content
type NavigationMenuLinkCardProps = NavigationMenuPrimitive.Link.Props & {
  title: string;
  description?: string;
  href: string;
};

const NavigationMenuLinkCard = React.forwardRef<
  HTMLAnchorElement,
  NavigationMenuLinkCardProps
>(({ className, title, description, ...props }, ref) => {
  return (
    <NavigationMenuPrimitive.Link
      ref={ref}
      render={<a />}
      className={cx(
        'block rounded-md p-3 no-underline transition-colors duration-100',
        'text-inherit',
        'hover:bg-muted',
        focusRing(),
        className,
      )}
      {...props}
    >
      <h3 className="mb-1 text-sm font-medium leading-5">{title}</h3>
      {description && (
        <p className="m-0 text-sm leading-5 text-muted-foreground">{description}</p>
      )}
    </NavigationMenuPrimitive.Link>
  );
});
NavigationMenuLinkCard.displayName = 'NavigationMenuLinkCard';

// Icons
function ChevronDownIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" {...props}>
      <path d="M1 3.5L5 7.5L9 3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ArrowSvg(props: React.ComponentProps<'svg'>) {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
      <path
        d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
        className="fill-background"
      />
      <path
        d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
        className="fill-border"
      />
      <path
        d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
        className="fill-border"
      />
    </svg>
  );
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuIcon,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuPopup,
  NavigationMenuBackdrop,
  NavigationMenuLinkCard,
};
