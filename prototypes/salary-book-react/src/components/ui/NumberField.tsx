import React from 'react';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import { Minus, Plus } from 'lucide-react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cx, focusInput, hasErrorInput } from '@/lib/utils';

// ============================================================================
// Number Field Root
// ============================================================================

const numberFieldRootStyles = tv({
  base: 'flex flex-col gap-1.5',
});

interface NumberFieldRootProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseNumberField.Root>, 'className'> {
  className?: string;
}

const NumberFieldRoot = React.forwardRef<HTMLDivElement, NumberFieldRootProps>(
  ({ className, ...props }, forwardedRef) => (
    <BaseNumberField.Root
      ref={forwardedRef}
      className={cx(numberFieldRootStyles(), className)}
      {...props}
    />
  ),
);
NumberFieldRoot.displayName = 'NumberField';

// ============================================================================
// Number Field Group
// ============================================================================

const numberFieldGroupStyles = tv({
  base: [
    'flex items-stretch',
    // Invalid state styling
    'data-[invalid]:ring-2 data-[invalid]:ring-red-100 data-[invalid]:rounded-md',
    'dark:data-[invalid]:ring-red-500/20',
  ],
});

interface NumberFieldGroupProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseNumberField.Group>, 'className'> {
  className?: string;
}

const NumberFieldGroup = React.forwardRef<HTMLDivElement, NumberFieldGroupProps>(
  ({ className, ...props }, forwardedRef) => (
    <BaseNumberField.Group
      ref={forwardedRef}
      className={cx(numberFieldGroupStyles(), className)}
      {...props}
    />
  ),
);
NumberFieldGroup.displayName = 'NumberFieldGroup';

// ============================================================================
// Number Field Input
// ============================================================================

const numberFieldInputStyles = tv({
  base: [
    'h-9 w-full min-w-0 text-center tabular-nums',
    'border-y border-border',
    'text-foreground',
    'placeholder-muted-foreground',
    'bg-background',
    'sm:text-sm',
    'outline-none transition-colors duration-100',
    // Focus state
    'focus:z-10 focus:border-foreground',
    // Disabled state
    'data-[disabled]:opacity-50',
    // Invalid state
    'data-[invalid]:border-destructive',
  ],
  variants: {
    hasError: {
      true: hasErrorInput,
    },
  },
});

interface NumberFieldInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseNumberField.Input>, 'className'>,
    VariantProps<typeof numberFieldInputStyles> {
  className?: string;
}

const NumberFieldInput = React.forwardRef<HTMLInputElement, NumberFieldInputProps>(
  ({ className, hasError, ...props }, forwardedRef) => (
    <BaseNumberField.Input
      ref={forwardedRef}
      className={cx(numberFieldInputStyles({ hasError }), className)}
      {...props}
    />
  ),
);
NumberFieldInput.displayName = 'NumberFieldInput';

// ============================================================================
// Number Field Increment / Decrement Buttons
// ============================================================================

const stepperButtonStyles = tv({
  base: [
    'flex h-9 w-9 shrink-0 items-center justify-center',
    'border border-border',
    'bg-muted',
    'text-muted-foreground',
    'select-none transition-colors duration-100',
    // Hover
    'hover:bg-muted/80 hover:text-foreground',
    // Active
    'active:bg-muted/60',
    // Disabled
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    // Focus
    'focus-visible:outline-none focus-visible:border-foreground',
  ],
  variants: {
    position: {
      left: 'rounded-l-md border-r-0',
      right: 'rounded-r-md border-l-0',
    },
  },
});

interface NumberFieldDecrementProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseNumberField.Decrement>, 'className'> {
  className?: string;
}

const NumberFieldDecrement = React.forwardRef<HTMLButtonElement, NumberFieldDecrementProps>(
  ({ className, children, ...props }, forwardedRef) => (
    <BaseNumberField.Decrement
      ref={forwardedRef}
      className={cx(stepperButtonStyles({ position: 'left' }), className)}
      {...props}
    >
      {children ?? <Minus className="size-4" aria-hidden="true" />}
    </BaseNumberField.Decrement>
  ),
);
NumberFieldDecrement.displayName = 'NumberFieldDecrement';

interface NumberFieldIncrementProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseNumberField.Increment>, 'className'> {
  className?: string;
}

const NumberFieldIncrement = React.forwardRef<HTMLButtonElement, NumberFieldIncrementProps>(
  ({ className, children, ...props }, forwardedRef) => (
    <BaseNumberField.Increment
      ref={forwardedRef}
      className={cx(stepperButtonStyles({ position: 'right' }), className)}
      {...props}
    >
      {children ?? <Plus className="size-4" aria-hidden="true" />}
    </BaseNumberField.Increment>
  ),
);
NumberFieldIncrement.displayName = 'NumberFieldIncrement';

// ============================================================================
// Number Field Scrub Area
// ============================================================================

const numberFieldScrubAreaStyles = tv({
  base: 'cursor-ew-resize select-none',
});

interface NumberFieldScrubAreaProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseNumberField.ScrubArea>, 'className'> {
  className?: string;
}

const NumberFieldScrubArea = React.forwardRef<HTMLSpanElement, NumberFieldScrubAreaProps>(
  ({ className, ...props }, forwardedRef) => (
    <BaseNumberField.ScrubArea
      ref={forwardedRef}
      className={cx(numberFieldScrubAreaStyles(), className)}
      {...props}
    />
  ),
);
NumberFieldScrubArea.displayName = 'NumberFieldScrubArea';

// ============================================================================
// Number Field Scrub Area Cursor
// ============================================================================

const numberFieldScrubAreaCursorStyles = tv({
  base: 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] filter',
});

interface NumberFieldScrubAreaCursorProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseNumberField.ScrubAreaCursor>, 'className'> {
  className?: string;
}

const NumberFieldScrubAreaCursor = React.forwardRef<HTMLSpanElement, NumberFieldScrubAreaCursorProps>(
  ({ className, children, ...props }, forwardedRef) => (
    <BaseNumberField.ScrubAreaCursor
      ref={forwardedRef}
      className={cx(numberFieldScrubAreaCursorStyles(), className)}
      {...props}
    >
      {children ?? <ScrubCursorIcon />}
    </BaseNumberField.ScrubAreaCursor>
  ),
);
NumberFieldScrubAreaCursor.displayName = 'NumberFieldScrubAreaCursor';

// Default scrub cursor icon
function ScrubCursorIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      width="26"
      height="14"
      viewBox="0 0 24 14"
      fill="currentColor"
      stroke="white"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M19.5 5.5L6.49737 5.51844V2L1 6.9999L6.5 12L6.49737 8.5L19.5 8.5V12L25 6.9999L19.5 2V5.5Z" />
    </svg>
  );
}

// ============================================================================
// Compound Component Pattern
// ============================================================================

/**
 * NumberField component for numeric input with increment/decrement controls.
 *
 * Built on Base UI's NumberField primitive with consistent styling.
 *
 * @example Basic usage
 * ```tsx
 * <NumberField defaultValue={100}>
 *   <NumberField.Group>
 *     <NumberField.Decrement />
 *     <NumberField.Input />
 *     <NumberField.Increment />
 *   </NumberField.Group>
 * </NumberField>
 * ```
 *
 * @example With label and scrub area
 * ```tsx
 * <NumberField defaultValue={50} min={0} max={100}>
 *   <NumberField.ScrubArea>
 *     <label className="cursor-ew-resize text-sm font-medium">
 *       Quantity
 *     </label>
 *     <NumberField.ScrubAreaCursor />
 *   </NumberField.ScrubArea>
 *   <NumberField.Group>
 *     <NumberField.Decrement />
 *     <NumberField.Input />
 *     <NumberField.Increment />
 *   </NumberField.Group>
 * </NumberField>
 * ```
 *
 * @example With Field component for validation
 * ```tsx
 * <Field name="quantity">
 *   <FieldLabel>Quantity</FieldLabel>
 *   <NumberField min={1} max={99}>
 *     <NumberField.Group>
 *       <NumberField.Decrement />
 *       <NumberField.Input />
 *       <NumberField.Increment />
 *     </NumberField.Group>
 *   </NumberField>
 *   <FieldError match="rangeUnderflow">Minimum is 1</FieldError>
 * </Field>
 * ```
 */
const NumberField = Object.assign(NumberFieldRoot, {
  Root: NumberFieldRoot,
  Group: NumberFieldGroup,
  Input: NumberFieldInput,
  Increment: NumberFieldIncrement,
  Decrement: NumberFieldDecrement,
  ScrubArea: NumberFieldScrubArea,
  ScrubAreaCursor: NumberFieldScrubAreaCursor,
});

export {
  NumberField,
  NumberFieldRoot,
  NumberFieldGroup,
  NumberFieldInput,
  NumberFieldIncrement,
  NumberFieldDecrement,
  NumberFieldScrubArea,
  NumberFieldScrubAreaCursor,
};

export type {
  NumberFieldRootProps,
  NumberFieldGroupProps,
  NumberFieldInputProps,
  NumberFieldIncrementProps,
  NumberFieldDecrementProps,
  NumberFieldScrubAreaProps,
  NumberFieldScrubAreaCursorProps,
};
