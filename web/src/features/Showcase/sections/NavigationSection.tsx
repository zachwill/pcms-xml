import React from "react";
import { Section, SectionGroup } from "../components";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuIcon,
  NavigationMenuLink,
  NavigationMenuLinkCard,
  NavigationMenuList,
  NavigationMenuPopup,
  NavigationMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { ChevronsUpDown } from "lucide-react";

export function NavigationSection() {
  const [collapsibleOpen, setCollapsibleOpen] = React.useState(false);

  return (
    <SectionGroup
      id="navigation"
      label="04"
      title="Navigation"
      description="Components for organizing and navigating content."
    >
      {/* Tabs */}
      <Section
        title="Tabs"
        description="Tabbed interface for switching between views."
      >
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">
              Line Variant
            </p>
            <Tabs defaultValue="account">
              <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="notifications" disabled>
                  Notifications
                </TabsTrigger>
              </TabsList>
              <TabsContent value="account" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Make changes to your account settings here.
                </p>
              </TabsContent>
              <TabsContent value="security" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Manage your security preferences.
                </p>
              </TabsContent>
              <TabsContent value="billing" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  View and update your billing information.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">
              Solid Variant
            </p>
            <Tabs defaultValue="overview">
              <TabsList variant="solid">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Overview content goes here.
                </p>
              </TabsContent>
              <TabsContent value="analytics" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Analytics content goes here.
                </p>
              </TabsContent>
              <TabsContent value="reports" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Reports content goes here.
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Section>

      {/* Navigation Menu */}
      <Section
        title="Navigation Menu"
        description="Dropdown menus for site navigation."
      >
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>
                Products
                <NavigationMenuIcon />
              </NavigationMenuTrigger>
              <NavigationMenuPopup>
                <NavigationMenuContent className="w-[400px]">
                  <div className="grid gap-2">
                    <NavigationMenuLinkCard
                      href="#"
                      title="Analytics"
                      description="Measure and understand your users"
                    />
                    <NavigationMenuLinkCard
                      href="#"
                      title="Automation"
                      description="Automate your workflows"
                    />
                    <NavigationMenuLinkCard
                      href="#"
                      title="Integrations"
                      description="Connect with your favorite tools"
                    />
                  </div>
                </NavigationMenuContent>
              </NavigationMenuPopup>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>
                Resources
                <NavigationMenuIcon />
              </NavigationMenuTrigger>
              <NavigationMenuPopup>
                <NavigationMenuContent className="w-[300px]">
                  <div className="grid gap-2">
                    <NavigationMenuLinkCard
                      href="#"
                      title="Documentation"
                      description="Learn how to use our product"
                    />
                    <NavigationMenuLinkCard
                      href="#"
                      title="API Reference"
                      description="Technical specifications"
                    />
                  </div>
                </NavigationMenuContent>
              </NavigationMenuPopup>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="#">Pricing</NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </Section>

      {/* Collapsible */}
      <Section
        title="Collapsible"
        description="Expandable content sections."
      >
        <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
          <div className="flex items-center justify-between space-x-4">
            <h4 className="text-sm font-medium text-foreground">
              @username starred 3 repositories
            </h4>
            <CollapsibleTrigger>
              <ChevronsUpDown className="size-4" />
              <span className="sr-only">Toggle</span>
            </CollapsibleTrigger>
          </div>
          <div className="rounded-md border border-border px-4 py-3 font-mono text-sm mt-2 text-foreground">
            @base-ui/react
          </div>
          <CollapsibleContent className="mt-2 space-y-2">
            <div className="rounded-md border border-border px-4 py-3 font-mono text-sm text-foreground">
              @tailwindcss/forms
            </div>
            <div className="rounded-md border border-border px-4 py-3 font-mono text-sm text-foreground">
              lucide-react
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Section>
    </SectionGroup>
  );
}
