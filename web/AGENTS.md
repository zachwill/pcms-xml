# AGENTS.md

> Guide for AI coding agents working on this project.

---

## What This Is

**Bun + React + TypeScript** application template.

---

## Architecture

```
src/
  server.ts       # Bun server entry point
  client.tsx      # React app entry point  
  index.html      # HTML shell with Tailwind CDN
  api/
    routes/       # API route handlers (one file per domain)
  components/
    ui/           # Shared UI components (Radix-based)
  features/       # Feature modules (pages/views)
  lib/
    server/       # Server utilities
      router.ts   # Route registry for Bun.serve
      utils.ts    # Error handling, JSON helpers
    utils.ts      # Client utilities (cx, formatters)
tests/
  api.test.ts     # API endpoint tests
```

---

## Patterns

### Server Routes

Routes are defined in `src/api/routes/*.ts` using the `RouteRegistry`:

```typescript
import { RouteRegistry } from "@/lib/server/router";

export const exampleRouter = new RouteRegistry();

exampleRouter.get("/", async (req) => {
  return Response.json({ message: "Hello" });
});

exampleRouter.get("/:id", async (req) => {
  const id = req.params.id;
  return Response.json({ id });
});
```

Then merged in `src/server.ts`:

```typescript
router.merge(exampleRouter, "/api/example");
```

### Components

UI components live in `src/components/ui/`. They wrap Radix primitives with consistent styling.

### Features

Feature modules live in `src/features/`. Each feature is a self-contained unit with its own components and hooks.

---

## Development

```bash
bun install
bun dev        # http://localhost:3001
bun test
```

---

## Adding Features

1. Create route handler in `src/api/routes/`
2. Merge router in `src/server.ts`
3. Create feature module in `src/features/`
4. Add route in `src/client.tsx`
