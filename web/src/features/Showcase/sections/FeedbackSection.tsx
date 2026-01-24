import React from "react";
import { Section, SectionGroup } from "../components";
import { Button, toast, Tooltip } from "@/components/ui";
import { Info, CheckCircle, XCircle, AlertTriangle, Bell } from "lucide-react";

export function FeedbackSection() {
  return (
    <SectionGroup
      id="feedback"
      label="06"
      title="Feedback"
      description="Tooltips, toasts, and other user feedback mechanisms."
    >
      {/* Tooltips */}
      <Section
        title="Tooltip"
        description="Contextual hints on hover."
      >
        <div className="flex flex-wrap gap-3">
          <Tooltip content="This is a tooltip" side="top">
            <Button variant="secondary">
              <Info className="size-4" />
              Hover me
            </Button>
          </Tooltip>
          <Tooltip content="Tooltip on the right" side="right">
            <Button variant="soft">Right</Button>
          </Tooltip>
          <Tooltip content="Tooltip on the bottom" side="bottom">
            <Button variant="soft">Bottom</Button>
          </Tooltip>
          <Tooltip content="Tooltip on the left" side="left">
            <Button variant="soft">Left</Button>
          </Tooltip>
          <Tooltip content="No arrow tooltip" showArrow={false}>
            <Button variant="ghost">No Arrow</Button>
          </Tooltip>
        </div>
      </Section>

      {/* Toast */}
      <Section
        title="Toast"
        description="Non-blocking notifications."
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Variants</p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  toast.show({
                    title: "Notification",
                    description: "This is a default notification.",
                  })
                }
              >
                <Bell className="size-4" />
                Default
              </Button>
              <Button
                variant="secondary"
                className="border-emerald-500/50 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-500/10 dark:text-emerald-400"
                onClick={() =>
                  toast.success({
                    title: "Success",
                    description: "Your changes have been saved.",
                  })
                }
              >
                <CheckCircle className="size-4" />
                Success
              </Button>
              <Button
                variant="secondary"
                className="border-red-500/50 text-red-600 hover:border-red-500 hover:bg-red-500/10 dark:text-red-400"
                onClick={() =>
                  toast.error({
                    title: "Error",
                    description: "Something went wrong. Please try again.",
                  })
                }
              >
                <XCircle className="size-4" />
                Error
              </Button>
              <Button
                variant="secondary"
                className="border-amber-500/50 text-amber-600 hover:border-amber-500 hover:bg-amber-500/10 dark:text-amber-400"
                onClick={() =>
                  toast.warning({
                    title: "Warning",
                    description: "Please review your input before continuing.",
                  })
                }
              >
                <AlertTriangle className="size-4" />
                Warning
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">With Action</p>
            <Button
              variant="soft"
              onClick={() =>
                toast.success({
                  title: "File deleted",
                  description: "The file has been moved to trash.",
                  actionLabel: "Undo",
                  onAction: () => toast.info({ title: "Restored!" }),
                })
              }
            >
              Show with Undo
            </Button>
          </div>
        </div>
      </Section>
    </SectionGroup>
  );
}
