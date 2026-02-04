import React from 'react';
import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { cx, focusRing } from '@/lib/utils';

/* -----------------------------------------------------------------------------
 * RadioGroup
 * -------------------------------------------------------------------------- */

interface RadioGroupProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive>, 'onValueChange'> {
  /** Orientation of the radio group */
  orientation?: 'horizontal' | 'vertical';
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
}

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive>,
  RadioGroupProps
>(
  (
    { className, orientation = 'vertical', onValueChange, children, ...props },
    forwardedRef,
  ) => {
    return (
      <RadioGroupPrimitive
        ref={forwardedRef}
        {...props}
        onValueChange={(value, eventDetails) => {
          onValueChange?.(value);
        }}
        className={cx(
          'flex gap-2',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
          'data-[disabled]:opacity-50',
          className,
        )}
      >
        {children}
      </RadioGroupPrimitive>
    );
  },
);
RadioGroup.displayName = 'RadioGroup';

/* -----------------------------------------------------------------------------
 * Radio
 * -------------------------------------------------------------------------- */

interface RadioProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RadioPrimitive.Root>, 'render'> {
  /** Size of the radio button */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
} as const;

const indicatorSizeClasses = {
  sm: 'before:size-1.5',
  md: 'before:size-2',
  lg: 'before:size-2.5',
} as const;

const Radio = React.forwardRef<
  React.ElementRef<typeof RadioPrimitive.Root>,
  RadioProps
>(({ className, size = 'md', ...props }, forwardedRef) => {
  return (
    <RadioPrimitive.Root
      ref={forwardedRef}
      {...props}
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-100 enabled:cursor-pointer',
        sizeClasses[size],
        // Unchecked state
        'bg-background',
        'border border-border',
        'data-[unchecked]:hover:border-muted-foreground',
        // Checked state
        'data-[checked]:bg-foreground data-[checked]:border-transparent',
        'data-[checked]:hover:bg-foreground/90',
        // Disabled state
        'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
        // Focus ring
        focusRing(),
        className,
      )}
    >
      <RadioPrimitive.Indicator
        keepMounted
        className={cx(
          'flex items-center justify-center',
          'before:rounded-full before:bg-primary-foreground',
          indicatorSizeClasses[size],
          'data-[unchecked]:hidden',
        )}
      />
    </RadioPrimitive.Root>
  );
});
Radio.displayName = 'Radio';

/* -----------------------------------------------------------------------------
 * RadioItem - Radio with integrated label
 * -------------------------------------------------------------------------- */

interface RadioItemProps extends RadioProps {
  /** Label text for the radio */
  label?: React.ReactNode;
  /** Description text below the label */
  description?: React.ReactNode;
}

const RadioItem = React.forwardRef<
  React.ElementRef<typeof RadioPrimitive.Root>,
  RadioItemProps
>(({ label, description, className, size = 'md', ...props }, forwardedRef) => {
  if (!label) {
    return <Radio ref={forwardedRef} size={size} {...props} />;
  }

  return (
    <label
      className={cx(
        'flex items-start gap-3 cursor-pointer',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
      )}
    >
      <Radio ref={forwardedRef} size={size} className={className} {...props} />
      <div className="flex flex-col gap-0.5">
        <span
          className={cx(
            'text-foreground',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base',
          )}
        >
          {label}
        </span>
        {description && (
          <span
            className={cx(
              'text-muted-foreground',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-xs',
              size === 'lg' && 'text-sm',
            )}
          >
            {description}
          </span>
        )}
      </div>
    </label>
  );
});
RadioItem.displayName = 'RadioItem';

/* -----------------------------------------------------------------------------
 * Exports
 * -------------------------------------------------------------------------- */

export { RadioGroup, Radio, RadioItem };
export type { RadioGroupProps, RadioProps, RadioItemProps };
