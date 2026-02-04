import React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cx, focusRing } from '@/lib/utils';

const Tabs = (
  props: Omit<
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
    'orientation'
  >,
) => {
  return <TabsPrimitive.Root {...props} />;
};
Tabs.displayName = 'Tabs';

type TabsListVariant = 'line' | 'solid';

const TabsListVariantContext = React.createContext<TabsListVariant>('line');

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: TabsListVariant;
}

const variantStyles: Record<TabsListVariant, string> = {
  line: cx(
    // base
    'flex items-center justify-start border-b overflow-x-auto scrollbar-hide',
    // border color
    'border-border',
  ),
  solid: cx(
    // base
    'inline-flex items-center justify-center rounded-md p-1',
    // background color
    'bg-muted',
  ),
};

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant = 'line', children, ...props }, forwardedRef) => (
  <TabsPrimitive.List
    ref={forwardedRef}
    className={cx(variantStyles[variant], className)}
    {...props}
  >
    <TabsListVariantContext.Provider value={variant}>
      {children}
    </TabsListVariantContext.Provider>
  </TabsPrimitive.List>
));
TabsList.displayName = 'TabsList';

function getVariantStyles(tabVariant: TabsListVariant) {
  switch (tabVariant) {
    case 'line':
      return cx(
        // base
        '-mb-px items-center justify-center whitespace-nowrap border-b-2 border-transparent px-3 pb-2 text-sm font-medium transition-colors duration-100',
        // text color
        'text-muted-foreground',
        // hover
        'hover:text-foreground',
        // border hover
        'hover:border-border',
        // selected
        'data-[active]:border-foreground data-[active]:text-foreground',
        // disabled
        'data-[disabled]:pointer-events-none',
        'data-[disabled]:opacity-40',
        'data-[disabled]:hover:border-transparent',
        'data-[disabled]:hover:text-muted-foreground',
      );
    case 'solid':
      return cx(
        // base
        'inline-flex items-center justify-center whitespace-nowrap rounded px-3 py-1 text-sm font-medium transition-colors duration-100',
        // text color
        'text-muted-foreground',
        // hover
        'hover:text-foreground',
        // selected
        'data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm',
        // disabled
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      );
  }
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Tab>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Tab>
>(({ className, children, ...props }, forwardedRef) => {
  const variant = React.useContext(TabsListVariantContext);
  return (
    <TabsPrimitive.Tab
      ref={forwardedRef}
      className={cx(getVariantStyles(variant), focusRing(), className)}
      {...props}
    >
      {children}
    </TabsPrimitive.Tab>
  );
});
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Panel>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Panel>
>(({ className, ...props }, forwardedRef) => (
  <TabsPrimitive.Panel
    ref={forwardedRef}
    className={cx('outline-none', focusRing(), className)}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsContent, TabsList, TabsTrigger };
