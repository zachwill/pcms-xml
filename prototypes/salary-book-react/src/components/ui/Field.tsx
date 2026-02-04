import React from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { tv, type VariantProps } from 'tailwind-variants';
import { cx, focusInput, hasErrorInput } from '@/lib/utils';

// ============================================================================
// Field Root
// ============================================================================

const fieldRootStyles = tv({
  base: 'flex flex-col gap-1.5',
  variants: {
    orientation: {
      vertical: 'flex-col',
      horizontal: 'flex-row items-center gap-3',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

interface FieldRootProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseField.Root>, 'className'>,
    VariantProps<typeof fieldRootStyles> {
  className?: string;
}

const FieldRoot = React.forwardRef<HTMLDivElement, FieldRootProps>(
  ({ className, orientation, ...props }, forwardedRef) => (
    <BaseField.Root
      ref={forwardedRef}
      className={cx(fieldRootStyles({ orientation }), className)}
      {...props}
    />
  ),
);
FieldRoot.displayName = 'Field';

// ============================================================================
// Field Label
// ============================================================================

const fieldLabelStyles = tv({
  base: [
    'text-sm font-medium leading-none',
    'text-foreground',
    'data-[disabled]:text-muted-foreground',
  ],
  variants: {
    mono: {
      true: 'font-mono tracking-normal',
    },
    uppercase: {
      true: 'uppercase',
    },
  },
});

interface FieldLabelProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseField.Label>, 'className'> {
  className?: string;
  /** Use monospace font */
  mono?: boolean;
  /** Uppercase text */
  uppercase?: boolean;
}

const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, mono, uppercase, ...props }, forwardedRef) => (
    <BaseField.Label
      ref={forwardedRef}
      className={cx(fieldLabelStyles({ mono, uppercase }), className)}
      {...props}
    />
  ),
);
FieldLabel.displayName = 'FieldLabel';

// ============================================================================
// Field Control
// ============================================================================

const fieldControlStyles = tv({
  base: [
    'relative block w-full appearance-none rounded-md border px-3 py-2 outline-none transition-colors duration-100 sm:text-sm',
    'border-border',
    'text-foreground',
    'placeholder:text-muted-foreground',
    'bg-background',
    // Disabled state
    'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
    // Invalid state
    'data-[invalid]:border-red-500',
    focusInput,
  ],
  variants: {
    hasError: {
      true: hasErrorInput,
    },
  },
});

interface FieldControlProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseField.Control>, 'className'>,
    VariantProps<typeof fieldControlStyles> {
  className?: string;
}

const FieldControl = React.forwardRef<HTMLInputElement, FieldControlProps>(
  ({ className, hasError, ...props }, forwardedRef) => (
    <BaseField.Control
      ref={forwardedRef}
      className={cx(fieldControlStyles({ hasError }), className)}
      {...props}
    />
  ),
);
FieldControl.displayName = 'FieldControl';

// ============================================================================
// Field Description
// ============================================================================

const fieldDescriptionStyles = tv({
  base: [
    'text-sm text-muted-foreground',
    'data-[disabled]:opacity-50',
  ],
});

interface FieldDescriptionProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseField.Description>, 'className'> {
  className?: string;
}

const FieldDescription = React.forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  ({ className, ...props }, forwardedRef) => (
    <BaseField.Description
      ref={forwardedRef}
      className={cx(fieldDescriptionStyles(), className)}
      {...props}
    />
  ),
);
FieldDescription.displayName = 'FieldDescription';

// ============================================================================
// Field Error
// ============================================================================

const fieldErrorStyles = tv({
  base: [
    'text-sm text-red-600 dark:text-red-400',
  ],
});

interface FieldErrorProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseField.Error>, 'className'> {
  className?: string;
}

const FieldError = React.forwardRef<HTMLDivElement, FieldErrorProps>(
  ({ className, ...props }, forwardedRef) => (
    <BaseField.Error
      ref={forwardedRef}
      className={cx(fieldErrorStyles(), className)}
      {...props}
    />
  ),
);
FieldError.displayName = 'FieldError';

// ============================================================================
// Field Item (for checkbox/radio groups)
// ============================================================================

const fieldItemStyles = tv({
  base: [
    'flex items-start gap-3',
    'data-[disabled]:opacity-50',
  ],
  variants: {
    orientation: {
      vertical: 'flex-col items-stretch gap-1',
      horizontal: 'flex-row items-center',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

interface FieldItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseField.Item>, 'className'>,
    VariantProps<typeof fieldItemStyles> {
  className?: string;
}

const FieldItem = React.forwardRef<HTMLDivElement, FieldItemProps>(
  ({ className, orientation, ...props }, forwardedRef) => (
    <BaseField.Item
      ref={forwardedRef}
      className={cx(fieldItemStyles({ orientation }), className)}
      {...props}
    />
  ),
);
FieldItem.displayName = 'FieldItem';

// ============================================================================
// Field Validity (for custom validity messages)
// ============================================================================

type FieldValidityProps = React.ComponentPropsWithoutRef<typeof BaseField.Validity>;

const FieldValidity: React.FC<FieldValidityProps> = (props) => (
  <BaseField.Validity {...props} />
);
FieldValidity.displayName = 'FieldValidity';

// ============================================================================
// Compound Component Pattern
// ============================================================================

/**
 * Field component for labeling and validating form controls.
 *
 * Built on Base UI's Field primitive with consistent styling.
 *
 * @example
 * ```tsx
 * <Field name="email">
 *   <FieldLabel>Email</FieldLabel>
 *   <FieldControl type="email" required placeholder="you@example.com" />
 *   <FieldDescription>We'll never share your email.</FieldDescription>
 *   <FieldError match="valueMissing">Please enter your email</FieldError>
 *   <FieldError match="typeMismatch">Please enter a valid email</FieldError>
 * </Field>
 * ```
 *
 * @example With checkbox/radio groups
 * ```tsx
 * <Field name="notifications">
 *   <FieldLabel>Notification preferences</FieldLabel>
 *   <FieldItem>
 *     <Checkbox />
 *     <FieldLabel>Email notifications</FieldLabel>
 *   </FieldItem>
 *   <FieldItem>
 *     <Checkbox />
 *     <FieldLabel>SMS notifications</FieldLabel>
 *   </FieldItem>
 * </Field>
 * ```
 */
const Field = Object.assign(FieldRoot, {
  Root: FieldRoot,
  Label: FieldLabel,
  Control: FieldControl,
  Description: FieldDescription,
  Error: FieldError,
  Item: FieldItem,
  Validity: FieldValidity,
});

export {
  Field,
  FieldRoot,
  FieldLabel,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldItem,
  FieldValidity,
};

export type {
  FieldRootProps,
  FieldLabelProps,
  FieldControlProps,
  FieldDescriptionProps,
  FieldErrorProps,
  FieldItemProps,
  FieldValidityProps,
};
