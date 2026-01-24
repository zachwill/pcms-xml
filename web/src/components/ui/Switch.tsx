import React from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cx, focusRing } from '@/lib/utils';

interface SwitchProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSwitch.Root>, 'render'> {
  size?: 'default' | 'small';
}

const Switch = React.forwardRef<
  React.ElementRef<typeof BaseSwitch.Root>,
  SwitchProps
>(({ className, size = 'default', ...props }: SwitchProps, forwardedRef) => {
  const rootClasses = cx(
    // base
    'group relative isolate inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 outline-none transition-colors duration-100',
    'bg-muted',
    // checked - using foreground (monochrome)
    'data-[checked]:bg-foreground',
    // disabled
    'data-[disabled]:cursor-default data-[disabled]:opacity-50',
    focusRing(),
    size === 'small' ? 'h-4 w-7' : 'h-5 w-9',
    className,
  );

  const thumbClasses = cx(
    // base
    'pointer-events-none relative inline-block transform rounded-full shadow-sm outline-none transition-transform duration-100',
    // background color
    'bg-background',
    size === 'small'
      ? 'h-3 w-3 data-[checked]:translate-x-3 data-[unchecked]:translate-x-0'
      : 'h-4 w-4 data-[checked]:translate-x-4 data-[unchecked]:translate-x-0',
  );

  return (
    <BaseSwitch.Root
      ref={forwardedRef}
      className={rootClasses}
      {...props}
    >
      <BaseSwitch.Thumb className={thumbClasses} />
    </BaseSwitch.Root>
  );
});

Switch.displayName = 'Switch';

export { Switch };
export type { SwitchProps };
