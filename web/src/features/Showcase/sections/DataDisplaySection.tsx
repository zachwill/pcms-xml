import React from "react";
import { Section, SectionGroup } from "../components";
import { Avatar, Card, Progress } from "@/components/ui";
import { TrendingUp, TrendingDown, Activity, Users } from "lucide-react";

export function DataDisplaySection() {
  return (
    <SectionGroup
      id="data-display"
      label="02"
      title="Data Display"
      description="Components for presenting information and metrics."
    >
      {/* Avatars */}
      <Section
        title="Avatar"
        description="User profile images with fallback initials."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Sizes</p>
            <div className="flex items-end gap-4">
              <Avatar size="xs" fallback="XS" />
              <Avatar size="sm" fallback="SM" />
              <Avatar size="md" fallback="MD" />
              <Avatar size="lg" fallback="LG" />
              <Avatar size="xl" fallback="XL" />
              <Avatar size="2xl" fallback="2X" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">With Images</p>
            <div className="flex items-center gap-4">
              <Avatar
                src="https://i.pravatar.cc/150?img=1"
                alt="User 1"
                fallback="U1"
              />
              <Avatar
                src="https://i.pravatar.cc/150?img=2"
                alt="User 2"
                fallback="U2"
              />
              <Avatar
                src="https://i.pravatar.cc/150?img=3"
                alt="User 3"
                fallback="U3"
              />
              <Avatar fallback="JD" />
              <Avatar fallback="AB" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Square Variant</p>
            <div className="flex items-center gap-4">
              <Avatar variant="square" fallback="SQ" />
              <Avatar
                variant="square"
                src="https://i.pravatar.cc/150?img=4"
                alt="User 4"
                fallback="U4"
              />
              <Avatar variant="square" size="lg" fallback="LG" />
            </div>
          </div>
        </div>
      </Section>

      {/* Progress */}
      <Section
        title="Progress"
        description="Visual indicators for loading and completion."
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <Progress value={25} label="Upload" showValue />
            <Progress value={50} label="Processing" showValue />
            <Progress value={75} label="Deploying" showValue />
            <Progress value={100} label="Complete" showValue />
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Sizes</p>
            <div className="space-y-4">
              <Progress value={60} size="sm" />
              <Progress value={60} size="default" />
              <Progress value={60} size="lg" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Indeterminate</p>
            <Progress value={null} />
          </div>
        </div>
      </Section>

      {/* Cards */}
      <Section
        title="Card"
        description="Containers for grouping related content."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total Users
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                  12,543
                </p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <Users className="size-5 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-emerald-500" />
              <span className="tabular-nums text-emerald-500">+12.5%</span>
              <span className="text-muted-foreground">from last month</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Active Now
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                  1,234
                </p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <Activity className="size-5 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-emerald-500" />
              <span className="tabular-nums text-emerald-500">+5.2%</span>
              <span className="text-muted-foreground">from last hour</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Bounce Rate
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                  24.3%
                </p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <TrendingDown className="size-5 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingDown className="size-4 text-red-500" />
              <span className="tabular-nums text-red-500">-2.1%</span>
              <span className="text-muted-foreground">from last week</span>
            </div>
          </Card>
        </div>
      </Section>
    </SectionGroup>
  );
}
