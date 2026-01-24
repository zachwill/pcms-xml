import React from "react";
import { Section, SectionGroup } from "../components";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
  Divider,
  ScrollArea,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarGroup,
} from "@/components/ui";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Grid,
  Italic,
  List,
  Strikethrough,
  Underline,
} from "lucide-react";

export function LayoutSection() {
  return (
    <SectionGroup
      id="layout"
      label="07"
      title="Layout"
      description="Structural components for organizing content."
    >
      {/* Accordion */}
      <Section
        title="Accordion"
        description="Collapsible content panels."
      >
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionHeader>
              <AccordionTrigger>What is Base UI?</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                Base UI is a library of unstyled, accessible components for
                building high-quality design systems and web apps with React.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionHeader>
              <AccordionTrigger>How is it different from Radix?</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                Base UI is maintained by the MUI team and focuses on providing a
                minimal footprint with maximum flexibility.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionHeader>
              <AccordionTrigger>Can I use it with Tailwind?</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                Yes! Base UI components are unstyled by default, making
                them perfect for use with Tailwind CSS.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      {/* Toggle Group */}
      <Section
        title="Toggle Group"
        description="Grouped toggle buttons for selection."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">
              Single Selection
            </p>
            <ToggleGroup defaultValue={["center"]}>
              <ToggleGroupItem value="left" aria-label="Left aligned">
                <AlignLeft className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="Center aligned">
                <AlignCenter className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label="Right aligned">
                <AlignRight className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="justify" aria-label="Justified">
                <AlignJustify className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">
              Multiple Selection
            </p>
            <ToggleGroup multiple defaultValue={["bold"]}>
              <ToggleGroupItem value="bold" aria-label="Bold">
                <Bold className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Italic">
                <Italic className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="underline" aria-label="Underline">
                <Underline className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="strikethrough" aria-label="Strikethrough">
                <Strikethrough className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </Section>

      {/* Toolbar */}
      <Section
        title="Toolbar"
        description="Grouped action buttons."
      >
        <Toolbar aria-label="Formatting options">
          <ToolbarGroup>
            <ToolbarButton aria-label="Bold">
              <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton aria-label="Italic">
              <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton aria-label="Underline">
              <Underline className="size-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <ToolbarButton aria-label="Left align">
              <AlignLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton aria-label="Center align">
              <AlignCenter className="size-4" />
            </ToolbarButton>
            <ToolbarButton aria-label="Right align">
              <AlignRight className="size-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarButton aria-label="List">
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton aria-label="Grid">
            <Grid className="size-4" />
          </ToolbarButton>
        </Toolbar>
      </Section>

      {/* Dividers */}
      <Section
        title="Divider"
        description="Visual separators between content."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Simple</p>
            <Divider />
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">With Label</p>
            <Divider>or continue with</Divider>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Vertical</p>
            <div className="flex items-center h-10 gap-4">
              <span className="text-foreground">Item 1</span>
              <Divider orientation="vertical" />
              <span className="text-foreground">Item 2</span>
              <Divider orientation="vertical" />
              <span className="text-foreground">Item 3</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Scroll Area */}
      <Section
        title="Scroll Area"
        description="Custom scrollable containers."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">
              Vertical
            </p>
            <ScrollArea className="h-48 w-full rounded-lg border border-border">
              <div className="p-4 space-y-3">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-md bg-muted"
                  >
                    <p className="text-sm text-foreground tabular-nums">
                      Item {i + 1}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">
              Horizontal
            </p>
            <ScrollArea
              orientation="horizontal"
              className="w-full rounded-lg border border-border"
            >
              <div className="flex gap-3 p-4">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-28 h-20 rounded-md bg-muted flex items-center justify-center"
                  >
                    <p className="text-sm text-foreground tabular-nums">
                      {i + 1}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </Section>
    </SectionGroup>
  );
}
