import React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cx } from '@/lib/utils';

type PopoverRootProps = PopoverPrimitive.Root.Props;

const Popover = (props: PopoverRootProps) => {
  return <PopoverPrimitive.Root {...props} />;
};
Popover.displayName = 'Popover';

const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  PopoverPrimitive.Trigger.Props
>((props, forwardedRef) => {
  return <PopoverPrimitive.Trigger ref={forwardedRef} {...props} />;
});
PopoverTrigger.displayName = 'PopoverTrigger';



const PopoverClose = React.forwardRef<
  HTMLButtonElement,
  PopoverPrimitive.Close.Props
>((props, forwardedRef) => {
  return <PopoverPrimitive.Close ref={forwardedRef} {...props} />;
});
PopoverClose.displayName = 'PopoverClose';

type ContentProps = PopoverPrimitive.Popup.Props & {
  sideOffset?: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  collisionPadding?: number;
};

const PopoverContent = React.forwardRef<HTMLDivElement, ContentProps>(
  (
    {
      className,
      sideOffset = 10,
      side = 'bottom',
      align = 'center',
      collisionPadding,
      ...props
    }: ContentProps,
    forwardedRef,
  ) => {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          sideOffset={sideOffset}
          side={side}
          align={align}
          collisionPadding={collisionPadding}
        >
          <PopoverPrimitive.Popup
            ref={forwardedRef}
            className={cx(
              'max-h-[var(--available-height)] min-w-60 overflow-hidden rounded-md border p-2.5 text-sm shadow-md',
              'border-border',
              'text-foreground',
              'bg-background',
              'will-change-[transform,opacity]',
              'origin-[var(--transform-origin)] transition-[transform,scale,opacity] duration-100',
              'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
              'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
              className,
            )}
            {...props}
          />
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    );
  },
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverClose, PopoverContent, PopoverTrigger };
