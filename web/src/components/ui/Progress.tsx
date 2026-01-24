import React from 'react';
import { Progress as BaseProgress } from '@base-ui/react/progress';
import { cx } from '@/lib/utils';

interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseProgress.Root>, 'render' | 'value'> {
  /** The current value (0-100). Pass null for indeterminate state. */
  value?: number | null;
  /** Visual size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error';
  /** Show value label */
  showValue?: boolean;
  /** Label text */
  label?: string;
}

const sizeClasses = {
  sm: 'h-1',
  default: 'h-2',
  lg: 'h-3',
};

const indicatorVariantClasses = {
  default: 'bg-foreground',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

const Progress = React.forwardRef<
  React.ElementRef<typeof BaseProgress.Root>,
  ProgressProps
>(
  (
    {
      className,
      value = null,
      size = 'default',
      variant = 'default',
      showValue = false,
      label,
      ...props
    },
    forwardedRef,
  ) => {
    const rootClasses = cx(
      'grid w-full gap-1.5',
      (label || showValue) && 'grid-cols-[1fr_auto]',
      className,
    );

    const trackClasses = cx(
      // base
      'col-span-full overflow-hidden rounded-full',
      'bg-muted',
      // size
      sizeClasses[size],
    );

    const indicatorClasses = cx(
      // base
      'h-full rounded-full transition-all duration-300 ease-out',
      // variant color
      indicatorVariantClasses[variant],
      // indeterminate animation
      'data-[indeterminate]:animate-progress-indeterminate data-[indeterminate]:w-1/3',
    );

    return (
      <BaseProgress.Root
        ref={forwardedRef}
        className={rootClasses}
        value={value}
        {...props}
      >
        {label && (
          <BaseProgress.Label className="text-sm font-medium text-foreground">
            {label}
          </BaseProgress.Label>
        )}
        {showValue && (
          <BaseProgress.Value className="text-sm tabular-nums text-muted-foreground" />
        )}
        <BaseProgress.Track className={trackClasses}>
          <BaseProgress.Indicator className={indicatorClasses} />
        </BaseProgress.Track>
      </BaseProgress.Root>
    );
  },
);

Progress.displayName = 'Progress';

// Also export compound components for custom usage
const ProgressRoot = BaseProgress.Root;
const ProgressTrack = BaseProgress.Track;
const ProgressIndicator = BaseProgress.Indicator;
const ProgressLabel = BaseProgress.Label;
const ProgressValue = BaseProgress.Value;

export {
  Progress,
  ProgressRoot,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
};
export type { ProgressProps };
