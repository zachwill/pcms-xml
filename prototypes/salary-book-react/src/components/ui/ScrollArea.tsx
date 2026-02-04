import React from 'react';
import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import { cx } from '@/lib/utils';

interface ScrollAreaProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseScrollArea.Root>, 'render'> {
  /** Orientation of the scroll area */
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** Visual style variant */
  variant?: 'default' | 'minimal';
  /** Whether to show scrollbar only on hover/scroll */
  autoHide?: boolean;
}

interface ScrollAreaViewportProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseScrollArea.Viewport>, 'render'> {}

interface ScrollAreaContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseScrollArea.Content>, 'render'> {}

interface ScrollAreaScrollbarProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseScrollArea.Scrollbar>, 'render'> {}

interface ScrollAreaThumbProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseScrollArea.Thumb>, 'render'> {}

interface ScrollAreaCornerProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseScrollArea.Corner>, 'render'> {}

const scrollbarClasses = cx(
  // base layout
  'flex rounded transition-opacity duration-100',
  // track background
  'bg-muted',
  // auto-hide behavior
  'opacity-0 pointer-events-none',
  'data-[hovering]:opacity-100 data-[hovering]:pointer-events-auto',
  'data-[scrolling]:opacity-100 data-[scrolling]:pointer-events-auto data-[scrolling]:duration-0',
  // expand hit area
  'before:absolute before:content-[""]',
  // vertical orientation
  'data-[orientation=vertical]:w-2 data-[orientation=vertical]:m-1.5',
  'data-[orientation=vertical]:before:h-full data-[orientation=vertical]:before:w-4',
  'data-[orientation=vertical]:before:left-1/2 data-[orientation=vertical]:before:-translate-x-1/2',
  // horizontal orientation
  'data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:m-1.5',
  'data-[orientation=horizontal]:before:w-full data-[orientation=horizontal]:before:h-4',
  'data-[orientation=horizontal]:before:top-1/2 data-[orientation=horizontal]:before:-translate-y-1/2',
);

const thumbClasses = cx(
  'rounded bg-muted-foreground/60',
  'hover:bg-muted-foreground/80',
  'transition-colors duration-100',
  'data-[orientation=vertical]:w-full',
  'data-[orientation=horizontal]:h-full',
);

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof BaseScrollArea.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      children,
      orientation = 'vertical',
      variant = 'default',
      autoHide = true,
      ...props
    },
    forwardedRef,
  ) => {
    const rootClasses = cx('relative', className);

    const scrollbarBaseClasses = cx(
      scrollbarClasses,
      !autoHide && 'opacity-100 pointer-events-auto',
    );

    return (
      <BaseScrollArea.Root ref={forwardedRef} className={rootClasses} {...props}>
        <BaseScrollArea.Viewport
          className={cx(
            'h-full w-full rounded-[inherit]',
            'focus-visible:outline-none focus-visible:ring-0 focus-visible:border-foreground',
          )}
        >
          {children}
        </BaseScrollArea.Viewport>

        {/* Vertical scrollbar */}
        {(orientation === 'vertical' || orientation === 'both') && (
          <BaseScrollArea.Scrollbar
            orientation="vertical"
            className={scrollbarBaseClasses}
          >
            <BaseScrollArea.Thumb className={thumbClasses} />
          </BaseScrollArea.Scrollbar>
        )}

        {/* Horizontal scrollbar */}
        {(orientation === 'horizontal' || orientation === 'both') && (
          <BaseScrollArea.Scrollbar
            orientation="horizontal"
            className={scrollbarBaseClasses}
          >
            <BaseScrollArea.Thumb className={thumbClasses} />
          </BaseScrollArea.Scrollbar>
        )}

        {/* Corner for both scrollbars */}
        {orientation === 'both' && <BaseScrollArea.Corner />}
      </BaseScrollArea.Root>
    );
  },
);

ScrollArea.displayName = 'ScrollArea';

// Individual compound components for custom usage
const ScrollAreaRoot = React.forwardRef<
  React.ElementRef<typeof BaseScrollArea.Root>,
  React.ComponentPropsWithoutRef<typeof BaseScrollArea.Root>
>(({ className, ...props }, ref) => (
  <BaseScrollArea.Root ref={ref} className={cx('relative', className)} {...props} />
));
ScrollAreaRoot.displayName = 'ScrollAreaRoot';

const ScrollAreaViewport = React.forwardRef<
  React.ElementRef<typeof BaseScrollArea.Viewport>,
  ScrollAreaViewportProps
>(({ className, ...props }, ref) => (
  <BaseScrollArea.Viewport
    ref={ref}
    className={cx(
      'h-full w-full rounded-[inherit]',
      'focus-visible:outline-none focus-visible:ring-0 focus-visible:border-foreground',
      className,
    )}
    {...props}
  />
));
ScrollAreaViewport.displayName = 'ScrollAreaViewport';

const ScrollAreaContent = React.forwardRef<
  React.ElementRef<typeof BaseScrollArea.Content>,
  ScrollAreaContentProps
>(({ className, ...props }, ref) => (
  <BaseScrollArea.Content ref={ref} className={className} {...props} />
));
ScrollAreaContent.displayName = 'ScrollAreaContent';

const ScrollAreaScrollbar = React.forwardRef<
  React.ElementRef<typeof BaseScrollArea.Scrollbar>,
  ScrollAreaScrollbarProps
>(({ className, ...props }, ref) => (
  <BaseScrollArea.Scrollbar
    ref={ref}
    className={cx(scrollbarClasses, className)}
    {...props}
  />
));
ScrollAreaScrollbar.displayName = 'ScrollAreaScrollbar';

const ScrollAreaThumb = React.forwardRef<
  React.ElementRef<typeof BaseScrollArea.Thumb>,
  ScrollAreaThumbProps
>(({ className, ...props }, ref) => (
  <BaseScrollArea.Thumb ref={ref} className={cx(thumbClasses, className)} {...props} />
));
ScrollAreaThumb.displayName = 'ScrollAreaThumb';

const ScrollAreaCorner = React.forwardRef<
  React.ElementRef<typeof BaseScrollArea.Corner>,
  ScrollAreaCornerProps
>(({ className, ...props }, ref) => (
  <BaseScrollArea.Corner ref={ref} className={className} {...props} />
));
ScrollAreaCorner.displayName = 'ScrollAreaCorner';

export {
  ScrollArea,
  ScrollAreaRoot,
  ScrollAreaViewport,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaCorner,
};
export type {
  ScrollAreaProps,
  ScrollAreaViewportProps,
  ScrollAreaContentProps,
  ScrollAreaScrollbarProps,
  ScrollAreaThumbProps,
  ScrollAreaCornerProps,
};
