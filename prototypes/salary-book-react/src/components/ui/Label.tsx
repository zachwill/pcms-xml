import React from 'react';
import { Field } from '@base-ui/react/field';
import { cx } from '@/lib/utils';

interface LabelProps extends React.ComponentPropsWithoutRef<'label'> {
  disabled?: boolean;
  /** Use monospace font for labels (Vercel style) */
  mono?: boolean;
  /** Uppercase text */
  uppercase?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, disabled, mono, uppercase, ...props }, forwardedRef) => (
    <Field.Root disabled={disabled}>
      <Field.Label
        ref={forwardedRef}
        className={cx(
          'text-sm leading-none font-medium',
          'text-foreground',
          'data-[disabled]:text-muted-foreground',
          mono && 'font-mono tracking-normal',
          uppercase && 'uppercase',
          className,
        )}
        {...props}
      />
    </Field.Root>
  ),
);
Label.displayName = 'Label';

export { Label };
export type { LabelProps };
