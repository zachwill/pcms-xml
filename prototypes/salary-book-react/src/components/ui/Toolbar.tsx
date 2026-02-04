import React from 'react';
import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import { tv, type VariantProps } from 'tailwind-variants';
import { cx, focusRing } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Root
// -----------------------------------------------------------------------------

const toolbarVariants = tv({
  base: [
    'flex items-center gap-1',
    'rounded-md border border-border bg-muted p-1',
  ],
  variants: {
    orientation: {
      horizontal: 'flex-row',
      vertical: 'flex-col',
    },
    size: {
      sm: 'gap-0.5 p-0.5',
      md: 'gap-1 p-1',
      lg: 'gap-1.5 p-1.5',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
    size: 'md',
  },
});

interface ToolbarRootProps
  extends React.ComponentPropsWithoutRef<typeof BaseToolbar.Root>,
    VariantProps<typeof toolbarVariants> {}

const ToolbarRoot = React.forwardRef<HTMLDivElement, ToolbarRootProps>(
  ({ className, orientation = 'horizontal', size, ...props }, ref) => (
    <BaseToolbar.Root
      ref={ref}
      orientation={orientation}
      className={cx(toolbarVariants({ orientation, size }), className)}
      {...props}
    />
  ),
);
ToolbarRoot.displayName = 'Toolbar';

// -----------------------------------------------------------------------------
// Button
// -----------------------------------------------------------------------------

const toolbarButtonVariants = tv({
  base: [
    'inline-flex items-center justify-center rounded-md',
    'text-sm font-medium text-muted-foreground',
    'select-none transition-colors duration-100',
    // Hover
    'hover:bg-muted/80 hover:text-foreground',
    // Active/Pressed
    'active:bg-muted/60',
    'data-[pressed]:bg-background',
    'data-[pressed]:text-foreground',
    // Popup open state
    'data-[popup-open]:bg-muted',
    // Disabled
    'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
    // Focus
    focusRing(),
  ],
  variants: {
    size: {
      sm: 'h-7 min-w-7 px-2 text-xs gap-1',
      md: 'h-8 min-w-8 px-3 text-sm gap-1.5',
      lg: 'h-9 min-w-9 px-4 text-sm gap-2',
      icon: 'size-8',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

interface ToolbarButtonProps
  extends React.ComponentPropsWithoutRef<typeof BaseToolbar.Button>,
    VariantProps<typeof toolbarButtonVariants> {}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, size, ...props }, ref) => (
    <BaseToolbar.Button
      ref={ref}
      className={cx(toolbarButtonVariants({ size }), className)}
      {...props}
    />
  ),
);
ToolbarButton.displayName = 'ToolbarButton';

// -----------------------------------------------------------------------------
// Link
// -----------------------------------------------------------------------------

const toolbarLinkVariants = tv({
  base: [
    'inline-flex items-center justify-center rounded-md',
    'text-sm text-muted-foreground no-underline',
    'select-none transition-colors duration-100',
    // Hover
    'hover:text-foreground',
    // Focus
    focusRing(),
  ],
  variants: {
    size: {
      sm: 'h-7 px-2 text-xs',
      md: 'h-8 px-3 text-sm',
      lg: 'h-9 px-4 text-sm',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

interface ToolbarLinkProps
  extends React.ComponentPropsWithoutRef<typeof BaseToolbar.Link>,
    VariantProps<typeof toolbarLinkVariants> {}

const ToolbarLink = React.forwardRef<HTMLAnchorElement, ToolbarLinkProps>(
  ({ className, size, ...props }, ref) => (
    <BaseToolbar.Link
      ref={ref}
      className={cx(toolbarLinkVariants({ size }), className)}
      {...props}
    />
  ),
);
ToolbarLink.displayName = 'ToolbarLink';

// -----------------------------------------------------------------------------
// Separator
// -----------------------------------------------------------------------------

const toolbarSeparatorVariants = tv({
  base: ['bg-border'],
  variants: {
    orientation: {
      horizontal: 'h-4 w-px mx-1',
      vertical: 'w-4 h-px my-1',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

interface ToolbarSeparatorProps
  extends React.ComponentPropsWithoutRef<typeof BaseToolbar.Separator>,
    VariantProps<typeof toolbarSeparatorVariants> {}

const ToolbarSeparator = React.forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => (
    <BaseToolbar.Separator
      ref={ref}
      orientation={orientation}
      className={cx(toolbarSeparatorVariants({ orientation }), className)}
      {...props}
    />
  ),
);
ToolbarSeparator.displayName = 'ToolbarSeparator';

// -----------------------------------------------------------------------------
// Group
// -----------------------------------------------------------------------------

const toolbarGroupVariants = tv({
  base: ['flex gap-0.5'],
  variants: {
    orientation: {
      horizontal: 'flex-row',
      vertical: 'flex-col',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

interface ToolbarGroupProps
  extends React.ComponentPropsWithoutRef<typeof BaseToolbar.Group>,
    VariantProps<typeof toolbarGroupVariants> {}

const ToolbarGroup = React.forwardRef<HTMLDivElement, ToolbarGroupProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => (
    <BaseToolbar.Group
      ref={ref}
      className={cx(toolbarGroupVariants({ orientation }), className)}
      {...props}
    />
  ),
);
ToolbarGroup.displayName = 'ToolbarGroup';

// -----------------------------------------------------------------------------
// Input
// -----------------------------------------------------------------------------

const toolbarInputVariants = tv({
  base: [
    'rounded-md border border-border bg-background px-2',
    'text-sm text-foreground placeholder:text-muted-foreground',
    'transition-colors duration-100',
    // Disabled
    'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
    // Focus
    focusRing(),
  ],
  variants: {
    size: {
      sm: 'h-7 text-xs',
      md: 'h-8 text-sm',
      lg: 'h-9 text-sm',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

interface ToolbarInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseToolbar.Input>, 'size'>,
    VariantProps<typeof toolbarInputVariants> {}

const ToolbarInput = React.forwardRef<HTMLInputElement, ToolbarInputProps>(
  ({ className, size, ...props }, ref) => (
    <BaseToolbar.Input
      ref={ref}
      className={cx(toolbarInputVariants({ size }), className)}
      {...props}
    />
  ),
);
ToolbarInput.displayName = 'ToolbarInput';

// -----------------------------------------------------------------------------
// Compound Export
// -----------------------------------------------------------------------------

const Toolbar = Object.assign(ToolbarRoot, {
  Root: ToolbarRoot,
  Button: ToolbarButton,
  Link: ToolbarLink,
  Separator: ToolbarSeparator,
  Group: ToolbarGroup,
  Input: ToolbarInput,
});

export {
  Toolbar,
  ToolbarRoot,
  ToolbarButton,
  ToolbarLink,
  ToolbarSeparator,
  ToolbarGroup,
  ToolbarInput,
  toolbarVariants,
  toolbarButtonVariants,
  toolbarLinkVariants,
  toolbarSeparatorVariants,
  toolbarGroupVariants,
  toolbarInputVariants,
  type ToolbarRootProps,
  type ToolbarButtonProps,
  type ToolbarLinkProps,
  type ToolbarSeparatorProps,
  type ToolbarGroupProps,
  type ToolbarInputProps,
};
