import React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { Loader2 } from 'lucide-react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cx, focusRing } from '@/lib/utils';

const buttonVariants = tv({
  base: [
    'relative inline-flex items-center justify-center whitespace-nowrap rounded-md border text-center font-medium transition-colors duration-100',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    focusRing(),
  ],
  variants: {
    variant: {
      primary: [
        'border-transparent',
        'text-primary-foreground',
        'bg-primary',
        'hover:bg-primary/90',
        'active:bg-primary/80',
      ],
      secondary: [
        'border-border',
        'text-foreground',
        'bg-background',
        'hover:bg-muted/50',
        'active:bg-muted',
      ],
      soft: [
        'border-transparent',
        'text-foreground',
        'bg-muted',
        'hover:bg-muted/80',
        'active:bg-muted/60',
      ],
      ghost: [
        'border-transparent',
        'text-muted-foreground',
        'bg-transparent',
        'hover:text-foreground hover:bg-muted/50',
        'active:bg-muted',
      ],
      destructive: [
        'border-transparent',
        'text-destructive-foreground',
        'bg-destructive',
        'hover:bg-destructive/90',
        'active:bg-destructive/80',
      ],
    },
    size: {
      xs: 'h-7 px-2.5 text-xs gap-1',
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-10 px-5 text-base gap-2',
      xl: 'h-12 px-6 text-base gap-2.5',
      icon: 'size-9',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

interface ButtonProps
  extends React.ComponentPropsWithoutRef<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild,
      isLoading = false,
      loadingText,
      className,
      disabled,
      variant,
      size,
      children,
      ...props
    }: ButtonProps,
    forwardedRef,
  ) => {
    const isDisabled = disabled || isLoading;

    // When using asChild, we use the render prop to compose with the child element
    const renderProp = asChild && React.isValidElement(children) ? children : undefined;

    return (
      <BaseButton
        ref={forwardedRef}
        className={cx(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        focusableWhenDisabled={isLoading}
        render={renderProp}
        {...props}
      >
        {isLoading ? (
          <span className="pointer-events-none flex shrink-0 items-center justify-center gap-1.5">
            <Loader2
              className="size-4 shrink-0 animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">
              {loadingText ? loadingText : 'Loading'}
            </span>
            {loadingText ? loadingText : children}
          </span>
        ) : asChild ? undefined : (
          children
        )}
      </BaseButton>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants, type ButtonProps };
