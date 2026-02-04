import React from 'react';
import { Accordion } from '@base-ui/react/accordion';
import { cx, focusRing } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PropDef {
  type?: string;
  default?: string;
  required?: boolean;
  description?: string;
}

export interface ReferenceTableProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Record of prop names to their definitions */
  data: Record<string, PropDef>;
  /** Label for the name column (e.g., "Prop", "Parameter", "Attribute") */
  nameLabel?: string;
  /** Accessible caption describing the table */
  caption?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

function Code({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'code'>) {
  return (
    <code
      className={cx(
        'rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.8125rem] dark:bg-zinc-800',
        className,
      )}
      {...props}
    />
  );
}

function ChevronIcon({ className, ...props }: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      className={cx('size-3 shrink-0 transition-transform duration-200 ease-out', className)}
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M1 3.5L5 7.5L9 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const ReferenceTable = React.forwardRef<HTMLDivElement, ReferenceTableProps>(
  (
    {
      data,
      nameLabel = 'Prop',
      caption = 'API reference table',
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const entries = Object.entries(data);
    const captionId = React.useId();

    if (entries.length === 0) {
      return null;
    }

    return (
      <div
        ref={forwardedRef}
        className={cx('w-full overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800', className)}
        {...props}
      >
        {/* Visually hidden caption for accessibility */}
        <span id={captionId} className="sr-only">
          {caption}
        </span>

        {/* Header Row */}
        <div
          className={cx(
            'grid border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500',
            'dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-400',
            // Grid layout: Name | Type | Default | Chevron
            'grid-cols-[1fr_auto] sm:grid-cols-[minmax(140px,1fr)_minmax(100px,1fr)_auto] md:grid-cols-[minmax(160px,1.2fr)_minmax(140px,1.5fr)_minmax(100px,1fr)_40px]',
          )}
        >
          <div className="px-4 py-3">{nameLabel}</div>
          <div className="hidden px-4 py-3 sm:block">Type</div>
          <div className="hidden px-4 py-3 md:block">Default</div>
          <div className="px-4 py-3 sm:hidden" aria-hidden />
        </div>

        {/* Accordion Items */}
        <Accordion.Root aria-describedby={captionId} className="divide-y divide-gray-200 dark:divide-zinc-800">
          {entries.map(([name, prop], index) => (
            <Accordion.Item key={name} value={index}>
              <Accordion.Header>
                <Accordion.Trigger
                  className={cx(
                    'group grid w-full items-center text-left transition-colors',
                    'hover:bg-gray-50 dark:hover:bg-zinc-900/50',
                    focusRing(),
                    // Same grid layout as header
                    'grid-cols-[1fr_auto] sm:grid-cols-[minmax(140px,1fr)_minmax(100px,1fr)_auto] md:grid-cols-[minmax(160px,1.2fr)_minmax(140px,1.5fr)_minmax(100px,1fr)_40px]',
                  )}
                >
                  {/* Name */}
                  <div className="flex items-center gap-2 overflow-hidden px-4 py-3">
                    <Code className="truncate text-foreground font-mono">
                      {name}
                      {prop.required && (
                        <span className="ml-0.5 text-destructive" aria-label="required">*</span>
                      )}
                    </Code>
                  </div>

                  {/* Type (hidden on mobile) */}
                  <div className="hidden overflow-hidden px-4 py-3 sm:block">
                    {prop.type ? (
                      <Code className="truncate text-muted-foreground">
                        {prop.type}
                      </Code>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </div>

                  {/* Default (hidden on mobile and tablet) */}
                  <div className="hidden overflow-hidden px-4 py-3 md:block">
                    {prop.default !== undefined ? (
                      <Code className="truncate text-emerald-600 dark:text-emerald-400">
                        {prop.default}
                      </Code>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </div>

                  {/* Chevron */}
                  <div className="flex items-center justify-center px-2 py-3">
                    <ChevronIcon className="text-gray-400 group-data-[panel-open]:rotate-180 dark:text-gray-500" />
                  </div>
                </Accordion.Trigger>
              </Accordion.Header>

              <Accordion.Panel
                className={cx(
                  'h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 ease-out',
                  'data-[ending-style]:h-0 data-[starting-style]:h-0',
                )}
              >
                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                    {/* Name (always shown in expanded view for anchor linking) */}
                    <div className="flex flex-col gap-1">
                      <dt className="font-medium text-muted-foreground">Name</dt>
                      <dd>
                        <Code className="text-foreground font-mono">{name}</Code>
                      </dd>
                    </div>

                    {/* Type (shown on mobile since it's hidden in header) */}
                    <div className="flex flex-col gap-1 sm:hidden md:flex lg:hidden">
                      <dt className="font-medium text-muted-foreground">Type</dt>
                      <dd>
                        {prop.type ? (
                          <Code className="text-muted-foreground">{prop.type}</Code>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">—</span>
                        )}
                      </dd>
                    </div>

                    {/* Default (shown on mobile/tablet since it's hidden in header) */}
                    <div className="flex flex-col gap-1 md:hidden">
                      <dt className="font-medium text-gray-500 dark:text-gray-400">Default</dt>
                      <dd>
                        {prop.default !== undefined ? (
                          <Code className="text-emerald-600 dark:text-emerald-400">{prop.default}</Code>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">—</span>
                        )}
                      </dd>
                    </div>

                    {/* Required */}
                    <div className="flex flex-col gap-1">
                      <dt className="font-medium text-gray-500 dark:text-gray-400">Required</dt>
                      <dd className="text-gray-700 dark:text-gray-200">
                        {prop.required ? 'Yes' : 'No'}
                      </dd>
                    </div>

                    {/* Description (full width) */}
                    {prop.description && (
                      <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-1 lg:col-span-2">
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Description</dt>
                        <dd className="text-gray-700 dark:text-gray-200">{prop.description}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    );
  },
);

ReferenceTable.displayName = 'ReferenceTable';

export { ReferenceTable };
