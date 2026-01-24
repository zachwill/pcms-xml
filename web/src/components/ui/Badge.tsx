import React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cx } from '@/lib/utils';

const badgeVariants = tv({
  base: cx(
    'inline-flex items-center gap-x-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium',
  ),
  variants: {
    variant: {
      default: [
        'bg-muted text-muted-foreground',
      ],
      mono: [
        'bg-muted text-foreground font-mono',
      ],
      info: [
        'bg-blue-50 text-blue-700',
        'dark:bg-blue-950 dark:text-blue-300',
      ],
      positive: [
        'bg-emerald-50 text-emerald-700',
        'dark:bg-emerald-950 dark:text-emerald-300',
      ],
      negative: [
        'bg-red-50 text-red-700',
        'dark:bg-red-950 dark:text-red-300',
      ],
      warning: [
        'bg-amber-50 text-amber-700',
        'dark:bg-amber-950 dark:text-amber-300',
      ],
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface BadgeProps
  extends React.ComponentPropsWithoutRef<'span'>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }: BadgeProps, forwardedRef) => {
    return (
      <span
        ref={forwardedRef}
        className={cx(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  },
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants, type BadgeProps };
