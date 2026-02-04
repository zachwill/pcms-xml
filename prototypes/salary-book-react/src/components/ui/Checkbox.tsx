import React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { cx, focusRing } from '@/lib/utils';

interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'onCheckedChange'> {
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, indeterminate, onCheckedChange, ...props }, forwardedRef) => {
  return (
    <CheckboxPrimitive.Root
      ref={forwardedRef}
      {...props}
      indeterminate={indeterminate}
      onCheckedChange={(checked, eventDetails) => {
        onCheckedChange?.(checked);
      }}
      className={cx(
        'relative inline-flex size-4 shrink-0 appearance-none items-center justify-center rounded outline-none transition-colors duration-100 enabled:cursor-pointer',
        'text-primary-foreground',
        'bg-background',
        'border border-border',
        'data-[disabled]:opacity-50',
        'data-[checked]:bg-foreground data-[checked]:border-transparent',
        'data-[indeterminate]:bg-foreground data-[indeterminate]:border-transparent',
        focusRing(),
        className,
      )}
    >
      <CheckboxPrimitive.Indicator
        keepMounted
        className="flex size-full items-center justify-center data-[unchecked]:hidden"
      >
        {indeterminate ? (
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
            ></line>
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
            ></path>
          </svg>
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = 'Checkbox';

export { Checkbox };
export type { CheckboxProps };
