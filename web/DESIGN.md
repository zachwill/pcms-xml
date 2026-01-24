# DESIGN.md

Design system guide extracted from Vercel reference pages (`reference/vercel/`).

---

## Philosophy

The Vercel aesthetic is **restrained, typographic, and information-dense**. It achieves elegance through:

1. **Absence of decoration** – no gradients, minimal shadows, no rounded corners on most containers
2. **Monospace as accent** – `font-mono` used for labels, metadata, numbers, and section headers
3. **Extreme restraint with color** – nearly monochrome with semantic color only for interactive states
4. **Dense information hierarchy** – tight spacing, small text sizes, letting content breathe through whitespace not padding

---

## Color System

### Design Tokens (CSS Custom Properties)

Vercel uses a `--ds-gray-*` scale. Map to our system:

| Vercel Token | Dark Mode Purpose | Light Mode Equivalent |
|--------------|-------------------|----------------------|
| `--ds-gray-100` | Subtle hover states, code backgrounds | `gray-100` |
| `--ds-gray-400` | Input borders, dividers | `gray-300` |
| `--ds-gray-500` | Separator icons, faint elements | `gray-400` |
| `--ds-gray-600` | Secondary/muted text | `gray-500` |
| `--ds-gray-700` | Tertiary text | `gray-600` |
| `--ds-gray-1000` | Primary text, active borders | `gray-900` |

### Semantic Colors

```css
/* Dark mode (Vercel default) */
--background: #000000 or very dark gray
--foreground: #ededed (off-white)
--muted: very dark gray
--muted-foreground: mid gray (~gray-500)
--border: dark gray (~gray-800)
--primary: white or near-white
--primary-foreground: black

/* Light mode (inverse) */
--background: #ffffff
--foreground: #171717 (near-black)
--muted: light gray (~gray-100)
--muted-foreground: mid gray (~gray-500)
--border: light gray (~gray-200)
--primary: black or near-black
--primary-foreground: white
```

---

## Typography

### Font Stack

- **Sans**: Geist Sans (or fallback: Inter, system-ui)
- **Mono**: Geist Mono / Fira Mono (for labels, code, numbers)

### Text Sizes & Weights

| Element | Classes |
|---------|---------|
| Page title | `text-4xl font-semibold tracking-tight` |
| Hero title | `text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter` |
| Section header | `text-2xl font-semibold tracking-tight` |
| Label/Meta | `text-sm font-mono uppercase font-medium tracking-normal` |
| Body | `text-sm` or `text-base` |
| Small | `text-xs` |
| Large body | `text-lg text-muted-foreground` or `text-xl leading-tight` |

### Key Patterns

1. **Uppercase mono labels**: Section headers often use `text-sm font-mono font-medium uppercase`
2. **Tracking-tight for headings**: Always `tracking-tight` or `tracking-tighter` on h1-h3
3. **Leading-tight for dense text**: `leading-tight` or `leading-relaxed` (never default)
4. **Text-balance**: Use `text-balance` on hero/subtitle text for better wrapping

---

## Spacing

### Page Layout

```
max-w-6xl mx-auto px-4 sm:px-6 lg:px-8
```

Header height: `h-14`

Main padding: `py-6 sm:py-8 lg:py-8` or `pt-24 pb-16`

### Component Spacing

| Context | Pattern |
|---------|---------|
| Card padding | `px-4 py-3` or `p-3` (minimal) |
| Section gaps | `gap-8 lg:gap-12` or `gap-16` |
| Item lists | `divide-y divide-border` (not margin/padding) |
| Form fields | `space-y-4` or `space-y-8` |
| Inline items | `gap-2` or `gap-4` |

### Vertical Rhythm

Sections: `mb-6`, `mb-14`, `my-8 sm:my-10 lg:my-14`

---

## Borders & Dividers

### Philosophy

- Prefer `border-b` (bottom borders) over full borders
- Use `divide-y divide-border` for lists instead of per-item borders
- Input borders: `border-b border-(--ds-gray-400)` (underline style, not boxed)

### Border Radius

| Element | Radius |
|---------|--------|
| Cards/containers | `rounded-md` or `rounded-lg` (subtle) |
| Buttons | `rounded-md` or `rounded-full` (for icon buttons) |
| Inputs | `rounded-md` or NO radius (underline style) |
| Pills/badges | `rounded` (default 4px) |
| Code blocks | `rounded-lg` |

---

## Interactive States

### Transitions

Always use `transition-colors` for color changes. Duration: `duration-100` (fast).

```
transition-colors duration-100
```

### Hover States

| Element | Hover Pattern |
|---------|---------------|
| Links/nav | `text-muted-foreground hover:text-foreground` |
| List items | `hover:bg-(--ds-gray-100)/30` (subtle, transparent) |
| Buttons | `hover:bg-muted/50` or `hover:bg-primary/90` |
| Logo/brand | `hover:opacity-70 transition-opacity` |

### Focus States

```
focus:border-(--ds-gray-1000) focus:outline-none focus:ring-0
```

Note: Vercel uses **border-only** focus, not ring. Simpler, cleaner.

### Active/Selected States

Tab/nav: `border-b-2 border-foreground text-foreground` vs `border-transparent text-(--ds-gray-600)`

---

## Component Patterns

### Header/Navbar

```html
<header class="sticky top-0 z-50 bg-background">
  <!-- or with blur: -->
  <header class="sticky top-0 z-50 backdrop-blur-sm border-b border-border bg-background/80">
```

Height: `h-14`

Inner: `flex items-center justify-between px-4 gap-6`

### Breadcrumbs

```html
<div class="flex items-center gap-2 text-sm text-(--ds-gray-600)">
  <a class="hover:text-foreground">parent</a>
  <span>/</span>
  <span class="text-(--ds-gray-600)">current</span>
</div>
```

### List Items (Leaderboard-style)

```html
<div class="divide-y divide-border">
  <a class="group grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 hover:bg-(--ds-gray-100)/30">
    <span class="text-sm text-(--ds-gray-600) font-mono">1</span>
    <div class="min-w-0">
      <h3 class="font-semibold text-foreground truncate">Title</h3>
      <p class="text-xs text-(--ds-gray-600) font-mono truncate">subtitle</p>
    </div>
    <span class="font-mono text-sm text-foreground">123</span>
  </a>
</div>
```

### Search Input (Underline Style)

```html
<div class="relative">
  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center">
    <SearchIcon class="h-4 w-4 text-muted-foreground" />
  </div>
  <input 
    class="w-full border-b border-(--ds-gray-400) font-mono py-3 pl-8 text-sm 
           placeholder:text-(--ds-gray-600) focus:border-(--ds-gray-1000) 
           focus:outline-none transition-colors duration-100"
    placeholder="Search..."
  />
</div>
```

### Code/Command Block

```html
<div class="bg-(--ds-gray-100)/80 border-none rounded-md px-4 py-3 font-mono text-sm flex items-center justify-between gap-4">
  <code class="truncate">
    <span class="text-muted-foreground">$</span> npx command
  </code>
  <CopyButton />
</div>
```

Or with muted background:
```html
<div class="bg-muted rounded-md px-4 py-3 font-mono text-sm">
```

### Sidebar Navigation

```html
<nav class="flex flex-col gap-1">
  <a class="text-sm px-3 py-2 rounded-md transition-colors bg-muted text-foreground font-medium">
    Active
  </a>
  <a class="text-sm px-3 py-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50">
    Inactive
  </a>
</nav>
```

### Stat/Metric Block

```html
<div class="py-8">
  <div class="text-sm font-mono uppercase text-white mb-2">Label</div>
  <div class="text-3xl font-semibold font-mono tracking-tight text-foreground">1.2K</div>
</div>
```

### Section Header

```html
<h2 class="text-sm font-mono font-medium tracking-normal text-foreground uppercase">
  Section Title
</h2>
```

### Prose/Content Area

```html
<main class="prose prose-invert max-w-none">
  <!-- Content with prose defaults -->
</main>
```

Custom prose overrides:
```
prose-headings:font-semibold 
prose-headings:tracking-tight 
prose-h1:text-4xl 
prose-p:text-muted-foreground 
prose-code:bg-muted 
prose-code:px-1 
prose-code:py-0.5 
prose-code:rounded-sm
prose-pre:bg-muted 
prose-pre:border 
prose-pre:border-border 
prose-pre:rounded-md
```

---

## Grid Patterns

### 16-Column Grid (Large Screens)

```html
<div class="grid lg:grid-cols-16 gap-4">
  <div class="lg:col-span-1">...</div>
  <div class="lg:col-span-13">...</div>
  <div class="lg:col-span-2">...</div>
</div>
```

### Content + Sidebar

```html
<div class="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 lg:gap-12">
  <aside class="md:sticky md:top-20 md:self-start">...</aside>
  <main>...</main>
</div>
```

### Responsive Column Collapse

```html
<div class="grid grid-cols-1 lg:grid-cols-12 gap-16">
  <div class="lg:col-span-8">...</div>
  <div class="lg:col-span-4">...</div>
</div>
```

---

## Button Styles

### Primary (Dark on light, light on dark)

```html
<button class="ml-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30">
```

### Ghost/Icon

```html
<button class="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
```

### Text Link

```html
<a class="text-sm text-muted-foreground hover:text-foreground transition-colors">
```

### Tab/Pill

```html
<button class="text-xs font-mono transition-colors text-foreground">active</button>
<button class="text-xs font-mono transition-colors text-muted-foreground hover:text-foreground">inactive</button>
```

---

## Copy Button Pattern

```html
<button class="p-1.5 rounded cursor-pointer transition-colors text-muted-foreground hover:text-foreground" title="Copy">
  <CopyIcon class="h-4 w-4" />
</button>
```

With hover reveal:
```html
<div class="group relative">
  <button class="opacity-0 group-hover:opacity-100 ...">
```

---

## 404/Error Page

```html
<div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
  <div class="flex items-center gap-4">
    <h1 class="text-2xl font-medium">404</h1>
    <div class="h-12 w-px bg-border"></div>
    <p class="text-sm text-muted-foreground">This page could not be found.</p>
  </div>
  <a href="/" class="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors">
    Go back home
  </a>
</div>
```

---

## What We Should Change

### Current Issues vs Vercel Reference

| Current | Problem | Vercel Pattern |
|---------|---------|----------------|
| `rounded-xl` on cards | Too playful | `rounded-md` or `rounded-lg` |
| Indigo accent everywhere | Too colorful | Near-monochrome, minimal accent |
| Gray-200/700 borders | Too visible | Subtle borders, often transparent or matching bg |
| Standard focus rings | Heavy | Border-only focus or minimal ring |
| Default tracking | Too loose | `tracking-tight` on headings |
| Missing mono | No typographic contrast | `font-mono` for labels, numbers, meta |
| Boxed inputs | Dated | Underline inputs or very minimal boxes |
| Standard list spacing | Generic | `divide-y` pattern, no item margins |

### Priority Changes

1. **Add font-mono** for labels, numbers, metadata
2. **Reduce border radius** (xl → md/lg)
3. **Tighten letter-spacing** on headings
4. **Adopt underline input style** as option
5. **Use divide-y pattern** for lists
6. **Simplify focus states** to border-only
7. **Add uppercase mono section headers**
8. **Reduce color usage** – near monochrome base

---

## Light/Dark Mode Strategy

Vercel is dark-mode primary. For light mode, invert the contrast:

| Dark Mode | Light Mode |
|-----------|------------|
| `bg-black/dark gray` | `bg-white` |
| `text-white/off-white` | `text-gray-900` |
| `border-gray-800` | `border-gray-200` |
| `text-gray-600` (muted) | `text-gray-500` (muted) |
| `hover:bg-gray-100/30` | `hover:bg-gray-100` |

The aesthetic should feel equally refined in both modes.
