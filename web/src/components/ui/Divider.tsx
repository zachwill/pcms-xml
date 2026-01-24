import React from 'react';
import { Separator } from '@base-ui/react/separator';
import { cx } from '@/lib/utils';

type DividerProps = React.ComponentPropsWithoutRef<'div'> & {
  orientation?: 'horizontal' | 'vertical';
};

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, children, orientation = 'horizontal', ...props }, forwardedRef) => {
    // For vertical orientation or no children, render a simple separator
    if (orientation === 'vertical' || !children) {
      return (
        <Separator
          ref={forwardedRef}
          orientation={orientation}
          className={cx(
            // base
            orientation === 'vertical' ? 'w-px self-stretch' : 'my-6 h-px w-full',
            // background color
            'bg-border',
            className,
          )}
          {...props}
        />
      );
    }

    // For horizontal with children, render a labeled divider
    return (
      <div
        ref={forwardedRef}
        role="separator"
        aria-orientation="horizontal"
        className={cx(
          // base
          'mx-auto my-6 flex w-full items-center justify-between gap-3 text-sm',
          // text color
          'text-muted-foreground',
          className,
        )}
        {...props}
      >
        <Separator
          orientation="horizontal"
          className="h-px w-full bg-border"
        />
        <div className="whitespace-nowrap text-inherit">{children}</div>
        <Separator
          orientation="horizontal"
          className="h-px w-full bg-border"
        />
      </div>
    );
  },
);

Divider.displayName = 'Divider';

export { Divider };
export type { DividerProps };
