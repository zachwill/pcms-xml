import React from 'react';
import { Input as BaseInput } from '@base-ui/react/input';
import { Eye, EyeOff, Search } from 'lucide-react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cx, focusInput, hasErrorInput } from '@/lib/utils';

const inputStyles = tv({
  base: [
    'relative block w-full appearance-none outline-none sm:text-sm',
    'text-foreground',
    'placeholder:text-muted-foreground',
    'bg-transparent',
    'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
  ],
  variants: {
    variant: {
      boxed: [
        'rounded-md border px-3 py-2',
        'border-border',
        'bg-background',
        ...focusInput,
      ],
      underline: [
        'border-b border-border py-3',
        'focus:border-foreground',
        'transition-colors duration-100',
      ],
    },
    hasError: {
      true: hasErrorInput,
    },
    enableStepper: {
      false:
        '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
    },
  },
  defaultVariants: {
    variant: 'boxed',
  },
});

interface InputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseInput>, 'className'>,
    VariantProps<typeof inputStyles> {
  className?: string;
  inputClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      inputClassName,
      hasError,
      enableStepper = true,
      variant = 'boxed',
      type,
      ...props
    }: InputProps,
    forwardedRef,
  ) => {
    const [typeState, setTypeState] = React.useState(type);
    const isPassword = type === 'password';
    const isSearch = type === 'search';

    return (
      <div className={cx('relative w-full', className)}>
        {isSearch && (
          <div
            className={cx(
              'pointer-events-none absolute inset-y-0 left-0 flex items-center',
              variant === 'boxed' ? 'left-3' : 'left-0',
            )}
          >
            <Search
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        )}
        <BaseInput
          ref={forwardedRef}
          type={isPassword ? typeState : type}
          className={cx(
            inputStyles({ hasError, enableStepper, variant }),
            {
              'pl-8': isSearch,
              'pr-10': isPassword,
            },
            inputClassName,
          )}
          {...props}
        />
        {isPassword && (
          <div
            className={cx(
              'absolute inset-y-0 right-0 flex items-center',
              variant === 'boxed' ? 'right-3' : 'right-0',
            )}
          >
            <button
              aria-label="Toggle password visibility"
              className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors duration-100"
              type="button"
              onClick={() => {
                setTypeState(typeState === 'password' ? 'text' : 'password');
              }}
            >
              {typeState === 'password' ? (
                <Eye className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <EyeOff className="size-4 shrink-0" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
