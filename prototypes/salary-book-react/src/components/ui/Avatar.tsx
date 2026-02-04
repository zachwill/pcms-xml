import React from 'react';
import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import { tv, type VariantProps } from 'tailwind-variants';
import { cx } from '@/lib/utils';

const avatarVariants = tv({
  slots: {
    root: [
      'relative inline-flex items-center justify-center overflow-hidden rounded-full',
      'bg-muted',
      'align-middle select-none',
      'font-medium text-muted-foreground',
    ],
    image: 'size-full object-cover',
    fallback: 'flex size-full items-center justify-center uppercase',
  },
  variants: {
    size: {
      xs: {
        root: 'size-6 text-xs',
        fallback: 'text-xs',
      },
      sm: {
        root: 'size-8 text-sm',
        fallback: 'text-sm',
      },
      md: {
        root: 'size-10 text-base',
        fallback: 'text-base',
      },
      lg: {
        root: 'size-12 text-lg',
        fallback: 'text-lg',
      },
      xl: {
        root: 'size-16 text-xl',
        fallback: 'text-xl',
      },
      '2xl': {
        root: 'size-20 text-2xl',
        fallback: 'text-2xl',
      },
    },
    variant: {
      circle: {
        root: 'rounded-full',
      },
      square: {
        root: 'rounded-md',
      },
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'circle',
  },
});

type AvatarVariantProps = VariantProps<typeof avatarVariants>;

interface AvatarProps
  extends Omit<React.ComponentPropsWithoutRef<'span'>, 'children'>,
    AvatarVariantProps {
  /** Image source URL */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Fallback text (usually initials) shown when image fails to load or is not provided */
  fallback?: React.ReactNode;
  /** Delay in ms before showing the fallback (allows time for image to load) */
  fallbackDelay?: number;
  /** Callback when image loading status changes */
  onLoadingStatusChange?: (status: 'idle' | 'loading' | 'loaded' | 'error') => void;
}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      src,
      alt,
      fallback,
      fallbackDelay,
      onLoadingStatusChange,
      size,
      variant,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const styles = avatarVariants({ size, variant });

    return (
      <BaseAvatar.Root
        ref={forwardedRef}
        className={cx(styles.root(), className)}
        {...props}
      >
        {src && (
          <BaseAvatar.Image
            src={src}
            alt={alt}
            className={styles.image()}
            onLoadingStatusChange={onLoadingStatusChange}
          />
        )}
        {fallback && (
          <BaseAvatar.Fallback
            className={styles.fallback()}
            delay={fallbackDelay}
          >
            {fallback}
          </BaseAvatar.Fallback>
        )}
      </BaseAvatar.Root>
    );
  },
);
Avatar.displayName = 'Avatar';

// Also export compound components for advanced usage
const AvatarRoot = BaseAvatar.Root;
const AvatarImage = BaseAvatar.Image;
const AvatarFallback = BaseAvatar.Fallback;

export {
  Avatar,
  AvatarRoot,
  AvatarImage,
  AvatarFallback,
  avatarVariants,
  type AvatarProps,
};
