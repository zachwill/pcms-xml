import React from "react";
import { Section, SectionGroup, DemoRow } from "../components";
import { Badge, Button } from "@/components/ui";
import { ArrowRight, Download, Plus, Trash2 } from "lucide-react";

export function ActionsSection() {
  return (
    <SectionGroup
      id="actions"
      label="01"
      title="Actions"
      description="Buttons and badges for user interactions and status indicators."
    >
      {/* Buttons */}
      <Section
        title="Button"
        description="Primary action triggers with multiple variants and states."
      >
        <div className="space-y-6">
          {/* Variants */}
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Variants</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="soft">Soft</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          {/* Sizes */}
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Sizes</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
          </div>

          {/* With icons */}
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">With Icons</p>
            <div className="flex flex-wrap gap-3">
              <Button>
                <Plus className="size-4" />
                Create New
              </Button>
              <Button variant="secondary">
                <Download className="size-4" />
                Download
              </Button>
              <Button variant="ghost">
                Continue
                <ArrowRight className="size-4" />
              </Button>
              <Button variant="destructive">
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </div>

          {/* States */}
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">States</p>
            <div className="flex flex-wrap gap-3">
              <Button isLoading>Loading</Button>
              <Button isLoading loadingText="Saving...">Save</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Badges */}
      <Section
        title="Badge"
        description="Status indicators and categorical labels."
      >
        <div className="space-y-6">
          {/* Variants */}
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Variants</p>
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="mono">Mono</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="positive">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="negative">Error</Badge>
            </div>
          </div>

          {/* Use cases */}
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Use Cases</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-foreground">Production</span>
                <Badge variant="positive">Live</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-foreground">Staging</span>
                <Badge variant="warning">Preview</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-foreground">Build #1234</span>
                <Badge variant="mono">2m 34s</Badge>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </SectionGroup>
  );
}
