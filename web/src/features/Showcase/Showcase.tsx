import React from "react";
import {
  Command,
  CommandContent,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui";
import {
  ActionsSection,
  DataDisplaySection,
  FeedbackSection,
  FormControlsSection,
  LayoutSection,
  NavigationSection,
  OverlaysSection,
} from "./sections";
import {
  Boxes,
  ChevronRight,
  FormInput,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Moon,
  MousePointerClick,
  Navigation,
  Search,
  Sun,
} from "lucide-react";

const sections = [
  { id: "actions", label: "Actions", icon: MousePointerClick, count: 2 },
  { id: "data-display", label: "Data Display", icon: LayoutDashboard, count: 5 },
  { id: "form-controls", label: "Form Controls", icon: FormInput, count: 8 },
  { id: "navigation", label: "Navigation", icon: Navigation, count: 4 },
  { id: "overlays", label: "Overlays", icon: Layers, count: 5 },
  { id: "feedback", label: "Feedback", icon: MessageSquare, count: 3 },
  { id: "layout", label: "Layout", icon: Boxes, count: 4 },
];

export function Showcase() {
  const [activeSection, setActiveSection] = React.useState("actions");
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
  };

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Cmd+K keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Track active section on scroll
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -70% 0px" }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold text-foreground">Components</h1>
            <span className="hidden text-sm text-muted-foreground sm:block">
              Base UI + Tailwind
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-100 hover:border-foreground hover:text-foreground min-w-[260px]"
            >
            <Search className="size-4" />
            <span className="hidden flex-1 text-left sm:inline">Search...</span>
            <kbd className="hidden rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-md border border-border bg-background p-2 text-muted-foreground transition-colors duration-100 hover:border-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-[220px_1fr] lg:gap-12">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block">
            <nav className="sticky top-20 space-y-1">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sections
              </p>
              {sections.map(({ id, label, count }) => (
                <button
                  key={id}
                  onClick={() => handleNavClick(id)}
                  className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors duration-100 ${
                    activeSection === id
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>{label}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {count}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="min-w-0">
            {/* Hero */}
            <div className="mb-12 border-b border-border pb-12">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Component Library
              </p>
              <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                UI Components
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
                A comprehensive collection of accessible, composable components 
                built with Base UI and styled with Tailwind CSS.
              </p>
              
              {/* Quick stats */}
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Components", value: "30+" },
                  { label: "Variants", value: "100+" },
                  { label: "Accessible", value: "ARIA" },
                  { label: "Theme", value: "Dark/Light" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border p-4">
                    <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs uppercase text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile section nav */}
            <div className="mb-8 overflow-x-auto lg:hidden">
              <div className="flex gap-2 pb-2">
                {sections.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleNavClick(id)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors duration-100 ${
                      activeSection === id
                        ? "bg-foreground text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-0">
              <ActionsSection />
              <DataDisplaySection />
              <FormControlsSection />
              <NavigationSection />
              <OverlaysSection />
              <FeedbackSection />
              <LayoutSection />
            </div>

            {/* Footer */}
            <footer className="mt-16 border-t border-border pt-8 pb-16">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Built with Base UI + Tailwind CSS
                </p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="tabular-nums">v1.0.0</span>
                </div>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* Command Palette */}
      <Command
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onSelect={(value) => {
          handleNavClick(value);
          setCommandOpen(false);
        }}
      >
        <CommandContent>
          <CommandInput placeholder="Search components..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Sections">
              {sections.map(({ id, label, icon: Icon }) => (
                <CommandItem
                  key={id}
                  value={id}
                  onSelect={() => {
                    handleNavClick(id);
                    setCommandOpen(false);
                  }}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandContent>
      </Command>
    </div>
  );
}
