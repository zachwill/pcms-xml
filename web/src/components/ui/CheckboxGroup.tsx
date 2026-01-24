import React from 'react';
import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { cx, focusRing } from '@/lib/utils';

/* -------------------------------------------------------------------------------------------------
 * CheckboxGroup
 * -------------------------------------------------------------------------------------------------*/

interface CheckboxGroupProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof CheckboxGroupPrimitive>,
    'onValueChange'
  > {
  /** Names of the checkboxes that should be initially checked (uncontrolled) */
  defaultValue?: string[];
  /** Names of the checkboxes that are checked (controlled) */
  value?: string[];
  /** Callback when checked values change */
  onValueChange?: (value: string[]) => void;
  /** All possible checkbox values - required when using a parent checkbox */
  allValues?: string[];
  /** Whether all checkboxes in the group are disabled */
  disabled?: boolean;
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical';
}

const CheckboxGroup = React.forwardRef<
  React.ElementRef<typeof CheckboxGroupPrimitive>,
  CheckboxGroupProps
>(
  (
    {
      className,
      orientation = 'vertical',
      onValueChange,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    return (
      <CheckboxGroupPrimitive
        ref={forwardedRef}
        {...props}
        onValueChange={(value, eventDetails) => {
          onValueChange?.(value);
        }}
        className={cx(
          'flex gap-2',
          orientation === 'vertical' ? 'flex-col items-start' : 'flex-row flex-wrap items-center',
          'data-[disabled]:opacity-50',
          className,
        )}
      >
        {children}
      </CheckboxGroupPrimitive>
    );
  },
);
CheckboxGroup.displayName = 'CheckboxGroup';

/* -------------------------------------------------------------------------------------------------
 * CheckboxGroupItem
 * -------------------------------------------------------------------------------------------------*/

interface CheckboxGroupItemProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    'onCheckedChange'
  > {
  /** The value used to identify this checkbox within the group */
  value: string;
  /** Whether this is a parent checkbox that controls all others */
  parent?: boolean;
  /** Whether the checkbox is in an indeterminate state */
  indeterminate?: boolean;
  /** Label for the checkbox */
  label?: React.ReactNode;
  /** Additional description text */
  description?: React.ReactNode;
}

const CheckboxGroupItem = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxGroupItemProps
>(
  (
    {
      className,
      value,
      parent,
      indeterminate,
      label,
      description,
      ...props
    },
    forwardedRef,
  ) => {
    const checkbox = (
      <CheckboxPrimitive.Root
        ref={forwardedRef}
        value={value}
        parent={parent}
        indeterminate={indeterminate}
        {...props}
        className={cx(
          'relative inline-flex size-4 shrink-0 appearance-none items-center justify-center rounded outline-none transition-colors duration-100 enabled:cursor-pointer',
          'text-primary-foreground',
          'bg-background',
          'border border-border',
          'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
          'data-[checked]:bg-foreground data-[checked]:border-transparent',
          'data-[indeterminate]:bg-foreground data-[indeterminate]:border-transparent',
          focusRing(),
          className,
        )}
      >
        <CheckboxPrimitive.Indicator
          keepMounted
          render={(indicatorProps, state) => (
            <span
              {...indicatorProps}
              className="flex size-full items-center justify-center data-[unchecked]:hidden"
            >
              {state.indeterminate ? (
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2"
                    x1="4"
                    x2="12"
                    y1="8"
                    y2="8"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.2 5.59998L6.79999 9.99998L4.79999 7.99998"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </span>
          )}
        />
      </CheckboxPrimitive.Root>
    );

    // If there's a label or description, wrap in a label element
    if (label || description) {
      return (
        <label
          className={cx(
            'flex items-start gap-2 cursor-pointer select-none',
            'has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50',
          )}
        >
          <div className="pt-0.5">{checkbox}</div>
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
            )}
            {description && (
              <span className="text-sm text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        </label>
      );
    }

    return checkbox;
  },
);
CheckboxGroupItem.displayName = 'CheckboxGroupItem';

/* -------------------------------------------------------------------------------------------------
 * CheckboxGroupLabel
 * -------------------------------------------------------------------------------------------------*/

interface CheckboxGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the label should be visually hidden but accessible */
  srOnly?: boolean;
}

const CheckboxGroupLabel = React.forwardRef<
  HTMLDivElement,
  CheckboxGroupLabelProps
>(({ className, srOnly, ...props }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      {...props}
      className={cx(
        srOnly
          ? 'sr-only'
          : 'text-sm font-medium text-foreground mb-1.5',
        className,
      )}
    />
  );
});
CheckboxGroupLabel.displayName = 'CheckboxGroupLabel';

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -------------------------------------------------------------------------------------------------*/

export { CheckboxGroup, CheckboxGroupItem, CheckboxGroupLabel };
export type {
  CheckboxGroupProps,
  CheckboxGroupItemProps,
  CheckboxGroupLabelProps,
};
