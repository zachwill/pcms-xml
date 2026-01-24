import React from 'react';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cx, focusRing } from '@/lib/utils';

/* -----------------------------------------------------------------------------
 * ToggleGroup
 * -------------------------------------------------------------------------- */

interface ToggleGroupProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive>, 'onValueChange'> {
  /** Allow multiple items to be pressed at once */
  multiple?: boolean;
  /** Orientation of the toggle group */
  orientation?: 'horizontal' | 'vertical';
  /** Visual variant */
  variant?: 'default' | 'outline';
  /** Size of the toggle items */
  size?: 'sm' | 'md' | 'lg';
  /** Callback when value changes */
  onValueChange?: (value: string[]) => void;
}

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive>,
  ToggleGroupProps
>(
  (
    {
      className,
      orientation = 'horizontal',
      variant = 'default',
      size = 'md',
      onValueChange,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    return (
      <ToggleGroupPrimitive
        ref={forwardedRef}
        {...props}
        orientation={orientation}
        onValueChange={(value, eventDetails) => {
          onValueChange?.(value);
        }}
        className={cx(
          'inline-flex gap-px rounded-md p-0.5',
          variant === 'default' && 'bg-muted',
          variant === 'outline' && 'border border-border bg-transparent',
          orientation === 'vertical' && 'flex-col',
          'data-[disabled]:opacity-50',
          className,
        )}
        data-variant={variant}
        data-size={size}
      >
        {children}
      </ToggleGroupPrimitive>
    );
  },
);
ToggleGroup.displayName = 'ToggleGroup';

/* -----------------------------------------------------------------------------
 * ToggleGroupItem
 * -------------------------------------------------------------------------- */

interface ToggleGroupItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Toggle>, 'render'> {
  /** Size override (inherited from group if not specified) */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant override */
  variant?: 'default' | 'outline';
}

const sizeClasses = {
  sm: 'h-7 min-w-7 px-2 text-xs gap-1',
  md: 'h-8 min-w-8 px-2.5 text-sm gap-1.5',
  lg: 'h-10 min-w-10 px-3 text-base gap-2',
} as const;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof Toggle>,
  ToggleGroupItemProps
>(({ className, size, variant, children, ...props }, forwardedRef) => {
  return (
    <Toggle
      ref={forwardedRef}
      {...props}
      className={(state) => {
        // Get inherited size/variant from parent group via data attributes
        const inheritedSize = size ?? 'md';
        const inheritedVariant = variant ?? 'default';

        return cx(
          // Base styles
          'inline-flex items-center justify-center rounded-sm font-medium select-none transition-colors duration-100',
          sizeClasses[inheritedSize],
          // Colors - unpressed state
          'text-muted-foreground',
          // Hover state
          'hover:bg-muted/80 hover:text-foreground',
          // Active state
          'active:bg-muted/60',
          // Pressed state
          inheritedVariant === 'default' && [
            'data-[pressed]:bg-background',
            'data-[pressed]:text-foreground',
            'data-[pressed]:shadow-sm',
          ],
          inheritedVariant === 'outline' && [
            'data-[pressed]:bg-muted',
            'data-[pressed]:text-foreground',
          ],
          // Disabled state
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          // Focus ring
          focusRing(),
          typeof className === 'function' ? className(state) : className,
        );
      }}
    >
      {children}
    </Toggle>
  );
});
ToggleGroupItem.displayName = 'ToggleGroupItem';

/* -----------------------------------------------------------------------------
 * Exports
 * -------------------------------------------------------------------------- */

export { ToggleGroup, ToggleGroupItem };
export type { ToggleGroupProps, ToggleGroupItemProps };
