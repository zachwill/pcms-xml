# UI Components — Agent Guide

> Tacit knowledge for AI agents working on this component library.

---

## What We're Doing

Migrating from Radix UI primitives to **Base UI** (`@base-ui/react`). Base UI is the unstyled component library from the MUI team — similar philosophy to Radix but with some API differences.

**Already migrated:** Button, Checkbox, Switch, Input, Select, ReferenceTable  
**Still on Radix:** Tabs, Tooltip, Dialog, Popover (migrate these next)

---

## Core Patterns

### 1. Component Structure

```tsx
import React from 'react';
import { ComponentName } from '@base-ui/react/component-name';
import { cx, focusRing } from '@/lib/utils';

interface MyComponentProps extends React.ComponentPropsWithoutRef<typeof ComponentName.Root> {
  // custom props
}

const MyComponent = React.forwardRef<
  React.ElementRef<typeof ComponentName.Root>,
  MyComponentProps
>(({ className, ...props }, forwardedRef) => {
  return (
    <ComponentName.Root
      ref={forwardedRef}
      className={cx('base-classes', className)}
      {...props}
    />
  );
});

MyComponent.displayName = 'MyComponent';

export { MyComponent };
export type { MyComponentProps };
```

### 2. Styling

- **Tailwind CSS** for all styles
- **`cx()`** — merges classes (clsx + tailwind-merge)
- **`focusRing()`** — consistent focus states across components
- **`tailwind-variants` (tv)** — for complex variant systems (see Button.tsx)

### 3. Base UI Data Attributes

Base UI uses `data-*` attributes for state. Style them like this:

```tsx
// Checked state
'data-[checked]:bg-blue-500'

// Disabled state  
'data-[disabled]:cursor-default'
'data-[disabled]:opacity-50'

// Open/closed (accordions, dialogs)
'data-[panel-open]:rotate-180'
'data-[open]:opacity-100'

// Transitions
'data-[starting-style]:opacity-0'
'data-[ending-style]:opacity-0'
```

### 4. Dark Mode

Always include dark mode variants:

```tsx
'bg-white dark:bg-zinc-950'
'text-gray-900 dark:text-gray-50'
'border-gray-300 dark:border-zinc-800'
'ring-gray-300 dark:ring-gray-800'
```

### 5. Disabled States

Follow this pattern for disabled styling:

```tsx
// Light mode disabled
'data-[disabled]:bg-gray-100 data-[disabled]:text-gray-400'
// Dark mode disabled
'data-[disabled]:dark:bg-gray-800 data-[disabled]:dark:text-gray-600'
```

---

## Base UI vs Radix Differences

| Concept | Radix | Base UI |
|---------|-------|---------|
| State styling | `data-[state=checked]` | `data-[checked]` |
| Disabled | `data-[disabled]` | `data-[disabled]` (same) |
| Open state | `data-[state=open]` | `data-[open]` or `data-[panel-open]` |
| Indicator | `Checkbox.Indicator` | `Checkbox.Indicator` (similar) |
| Animation | Manual keyframes | `data-[starting-style]` / `data-[ending-style]` |

Base UI provides CSS variables for animations:
- `--accordion-panel-height`
- `--collapsible-panel-height`

---

## File Conventions

- One component per file
- File name matches export name: `Button.tsx` → `export { Button }`
- Types at top of file
- Sub-components (internal helpers) defined before main component
- `displayName` always set
- Export component and types at bottom
- Update `index.ts` when adding new components

---

## Reference Docs

Base UI docs are in `reference/base-ui/`:
- `components/` — individual component docs with examples
- `handbook/` — general patterns and concepts

When implementing a new component:
1. Read the Base UI doc first
2. Check existing components for patterns
3. Follow the structure above

---

## Color Tokens

Stick to these for consistency:

| Use Case | Light | Dark |
|----------|-------|------|
| Background | `white`, `gray-50` | `zinc-950`, `gray-900` |
| Text primary | `gray-900` | `gray-50` |
| Text secondary | `gray-500`, `gray-600` | `gray-400`, `gray-500` |
| Borders | `gray-200`, `gray-300` | `zinc-800`, `gray-700` |
| Primary accent | `blue-500` | `blue-500` |
| Error | `red-500`, `red-600` | `red-500`, `red-700` |
| Success | `emerald-500` | `emerald-400` |

---

## Common Gotchas

1. **forwardRef typing** — Use `React.ElementRef<typeof Primitive.Root>` not `HTMLDivElement`
2. **Spreading props** — Always spread `{...props}` last so consumers can override
3. **className merging** — Always use `cx(baseClasses, className)` so consumer classes win
4. **Omit conflicting props** — If wrapping a primitive, `Omit<>` any props you're overriding
5. **Base UI render prop** — Some components use `render` instead of `asChild` for composition
