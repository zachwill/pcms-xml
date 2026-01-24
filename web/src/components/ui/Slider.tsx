import React from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { cx, focusRing } from '@/lib/utils';

interface SliderProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSlider.Root>, 'render'> {
  /** Visual size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error';
  /** Show current value */
  showValue?: boolean;
  /** Label for the slider */
  label?: string;
  /** Label for accessibility (when no visible label) */
  'aria-label'?: string;
}

const sizeClasses = {
  sm: {
    track: 'h-1',
    thumb: 'size-3',
  },
  default: {
    track: 'h-1.5',
    thumb: 'size-4',
  },
  lg: {
    track: 'h-2',
    thumb: 'size-5',
  },
};

const indicatorVariantClasses = {
  default: 'bg-foreground',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

const Slider = React.forwardRef<
  React.ElementRef<typeof BaseSlider.Root>,
  SliderProps
>(
  (
    {
      className,
      size = 'default',
      variant = 'default',
      showValue = false,
      label,
      defaultValue,
      value,
      ...props
    },
    forwardedRef,
  ) => {
    const rootClasses = cx(
      'grid w-full gap-1.5',
      (label || showValue) && 'grid-cols-[1fr_auto]',
      className,
    );

    const controlClasses = cx(
      'col-span-full flex items-center touch-none select-none py-2',
    );

    const trackClasses = cx(
      // base
      'w-full rounded-full',
      'bg-muted',
      // size
      sizeClasses[size].track,
    );

    const indicatorClasses = cx(
      // base
      'rounded-full',
      // variant color
      indicatorVariantClasses[variant],
    );

    const thumbClasses = cx(
      // base
      'rounded-full select-none',
      'bg-background',
      'shadow-md',
      // outline
      'ring-1 ring-border',
      // focus - using has-[:focus-visible] since thumb contains an input
      focusRing(),
      // size
      sizeClasses[size].thumb,
      // disabled
      'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
      // dragging
      'data-[dragging]:ring-2 data-[dragging]:ring-foreground',
    );

    // Determine if this is a range slider (array of values)
    const isRange = Array.isArray(value) || Array.isArray(defaultValue);
    const valueArray = value ?? defaultValue;
    const thumbCount = isRange && Array.isArray(valueArray) ? valueArray.length : 1;

    return (
      <BaseSlider.Root
        ref={forwardedRef}
        className={rootClasses}
        defaultValue={defaultValue}
        value={value}
        {...props}
      >
        {label && (
          <span className="text-sm font-medium text-foreground">
            {label}
          </span>
        )}
        {showValue && (
          <BaseSlider.Value className="text-sm tabular-nums text-muted-foreground" />
        )}
        <BaseSlider.Control className={controlClasses}>
          <BaseSlider.Track className={trackClasses}>
            <BaseSlider.Indicator className={indicatorClasses} />
            {isRange ? (
              Array.from({ length: thumbCount }).map((_, i) => (
                <BaseSlider.Thumb
                  key={i}
                  index={i}
                  className={thumbClasses}
                />
              ))
            ) : (
              <BaseSlider.Thumb
                aria-label={props['aria-label']}
                className={thumbClasses}
              />
            )}
          </BaseSlider.Track>
        </BaseSlider.Control>
      </BaseSlider.Root>
    );
  },
);

Slider.displayName = 'Slider';

// Also export compound components for custom usage
const SliderRoot = BaseSlider.Root;
const SliderControl = BaseSlider.Control;
const SliderTrack = BaseSlider.Track;
const SliderIndicator = BaseSlider.Indicator;
const SliderThumb = BaseSlider.Thumb;
const SliderValue = BaseSlider.Value;

export {
  Slider,
  SliderRoot,
  SliderControl,
  SliderTrack,
  SliderIndicator,
  SliderThumb,
  SliderValue,
};
export type { SliderProps };
