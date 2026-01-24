import React from "react";

/**
 * Section header with Vercel-style uppercase mono label
 */
export function SectionHeader({
  label,
  title,
  description,
}: {
  label?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      {label && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          {label}
        </p>
      )}
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Individual component demo section
 */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-6 first:pt-0">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="rounded-lg border border-border bg-background p-6">
        {children}
      </div>
    </div>
  );
}

/**
 * Section group container with scroll anchor
 */
export function SectionGroup({
  id,
  label,
  title,
  description,
  children,
}: {
  id: string;
  label?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-12 first:pt-0">
      <SectionHeader label={label || id} title={title} description={description} />
      <div className="divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

/**
 * Demo row for showing variants inline
 */
export function DemoRow({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {label && (
        <span className="w-20 shrink-0 text-xs text-muted-foreground">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * Demo grid for component examples
 */
export function DemoGrid({
  children,
  cols = 1,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
}) {
  const colsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <div className={`grid gap-4 ${colsClass}`}>
      {children}
    </div>
  );
}

/**
 * Code display block
 */
export function CodeBlock({ children }: { children: string }) {
  return (
    <div className="rounded-md bg-muted px-4 py-3 font-mono text-sm">
      <code>
        <span className="text-muted-foreground">$</span> {children}
      </code>
    </div>
  );
}
