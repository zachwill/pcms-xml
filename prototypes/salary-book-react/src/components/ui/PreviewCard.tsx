import React from 'react';
import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card';
import { cx } from '@/lib/utils';

// Re-export createHandle for detached triggers
const createHandle = PreviewCardPrimitive.createHandle;

type PreviewCardRootProps = PreviewCardPrimitive.Root.Props;

const PreviewCard = (props: PreviewCardRootProps) => {
  return <PreviewCardPrimitive.Root {...props} />;
};
PreviewCard.displayName = 'PreviewCard';

const PreviewCardTrigger = React.forwardRef<
  HTMLAnchorElement,
  PreviewCardPrimitive.Trigger.Props
>(({ className, ...props }, forwardedRef) => {
  return (
    <PreviewCardPrimitive.Trigger
      ref={forwardedRef}
      className={cx(
        'text-foreground',
        'no-underline decoration-foreground/60 decoration-1 underline-offset-2',
        'outline-none',
        'hover:underline',
        'data-[popup-open]:underline',
        'focus-visible:rounded-sm focus-visible:no-underline focus-visible:border-foreground',
        className,
      )}
      {...props}
    />
  );
});
PreviewCardTrigger.displayName = 'PreviewCardTrigger';

type ContentProps = PreviewCardPrimitive.Popup.Props & {
  sideOffset?: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  collisionPadding?: number;
  showArrow?: boolean;
};

const PreviewCardContent = React.forwardRef<HTMLDivElement, ContentProps>(
  (
    {
      className,
      sideOffset = 8,
      side = 'top',
      align = 'center',
      collisionPadding,
      showArrow = true,
      children,
      ...props
    }: ContentProps,
    forwardedRef,
  ) => {
    return (
      <PreviewCardPrimitive.Portal>
        <PreviewCardPrimitive.Positioner
          sideOffset={sideOffset}
          side={side}
          align={align}
          collisionPadding={collisionPadding}
        >
          <PreviewCardPrimitive.Popup
            ref={forwardedRef}
            className={cx(
              'box-border',
              'w-[var(--popup-width,auto)] h-[var(--popup-height,auto)]',
              'rounded-lg border p-3',
              'border-gray-200 dark:border-zinc-700',
              'bg-white dark:bg-zinc-900',
              'text-gray-900 dark:text-gray-50',
              'shadow-lg dark:shadow-none',
              'origin-[var(--transform-origin)]',
              'transition-[transform,scale,opacity] duration-150',
              'data-[starting-style]:scale-90 data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-90 data-[ending-style]:opacity-0',
              className,
            )}
            {...props}
          >
            {showArrow && (
              <PreviewCardPrimitive.Arrow
                className={cx(
                  'flex',
                  'data-[side=bottom]:top-[-8px]',
                  'data-[side=top]:bottom-[-8px] data-[side=top]:rotate-180',
                  'data-[side=left]:right-[-13px] data-[side=left]:rotate-90',
                  'data-[side=right]:left-[-13px] data-[side=right]:-rotate-90',
                )}
              >
                <PreviewCardArrowSvg />
              </PreviewCardPrimitive.Arrow>
            )}
            {children}
          </PreviewCardPrimitive.Popup>
        </PreviewCardPrimitive.Positioner>
      </PreviewCardPrimitive.Portal>
    );
  },
);
PreviewCardContent.displayName = 'PreviewCardContent';

type ViewportProps = PreviewCardPrimitive.Viewport.Props;

const PreviewCardViewport = React.forwardRef<HTMLDivElement, ViewportProps>(
  ({ className, ...props }, forwardedRef) => {
    return (
      <PreviewCardPrimitive.Viewport
        ref={forwardedRef}
        className={cx(
          'relative overflow-clip w-full h-full',
          // Current content styling
          '[&_[data-current]]:w-[var(--popup-width)]',
          '[&_[data-current]]:translate-x-0',
          '[&_[data-current]]:opacity-100',
          '[&_[data-current]]:transition-[translate,opacity]',
          '[&_[data-current]]:duration-300',
          '[&_[data-current]]:ease-out',
          // Previous content styling
          '[&_[data-previous]]:w-[var(--popup-width)]',
          '[&_[data-previous]]:translate-x-0',
          '[&_[data-previous]]:opacity-100',
          '[&_[data-previous]]:transition-[translate,opacity]',
          '[&_[data-previous]]:duration-300',
          '[&_[data-previous]]:ease-out',
          // Direction-aware animations - current entering
          "data-[activation-direction~='left']:[&_[data-current][data-starting-style]]:-translate-x-[30%]",
          "data-[activation-direction~='left']:[&_[data-current][data-starting-style]]:opacity-0",
          "data-[activation-direction~='right']:[&_[data-current][data-starting-style]]:translate-x-[30%]",
          "data-[activation-direction~='right']:[&_[data-current][data-starting-style]]:opacity-0",
          // Direction-aware animations - previous exiting
          "data-[activation-direction~='left']:[&_[data-previous][data-ending-style]]:translate-x-[30%]",
          "data-[activation-direction~='left']:[&_[data-previous][data-ending-style]]:opacity-0",
          "data-[activation-direction~='right']:[&_[data-previous][data-ending-style]]:-translate-x-[30%]",
          "data-[activation-direction~='right']:[&_[data-previous][data-ending-style]]:opacity-0",
          className,
        )}
        {...props}
      />
    );
  },
);
PreviewCardViewport.displayName = 'PreviewCardViewport';

const PreviewCardBackdrop = React.forwardRef<
  HTMLDivElement,
  PreviewCardPrimitive.Backdrop.Props
>(({ className, ...props }, forwardedRef) => {
  return (
    <PreviewCardPrimitive.Backdrop
      ref={forwardedRef}
      className={cx('fixed inset-0', className)}
      {...props}
    />
  );
});
PreviewCardBackdrop.displayName = 'PreviewCardBackdrop';

// Arrow SVG component for consistent styling
function PreviewCardArrowSvg(props: React.ComponentProps<'svg'>) {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
      <path
        d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
        className="fill-white dark:fill-zinc-900"
      />
      <path
        d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
        className="fill-gray-200 dark:fill-transparent"
      />
      <path
        d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
        className="fill-transparent dark:fill-zinc-700"
      />
    </svg>
  );
}

export {
  PreviewCard,
  PreviewCardTrigger,
  PreviewCardContent,
  PreviewCardViewport,
  PreviewCardBackdrop,
  PreviewCardArrowSvg,
  createHandle,
};
