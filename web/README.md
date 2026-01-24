# Bun Template

**Bun + React + TypeScript** starter template.

## Features

- Bun server with hot reloading
- React 19 with TypeScript
- Radix UI primitives
- Tailwind CSS via CDN
- SWR for data fetching
- Simple router pattern
- Light/dark mode support

## Development

```bash
bun install
bun dev        # http://localhost:3001
bun test
```

## Structure

```
src/
  server.ts       # Bun server entry
  client.tsx      # React app entry
  index.html      # HTML shell
  api/
    routes/       # API route handlers
  components/
    ui/           # Shared UI components
  features/       # Feature modules
  lib/
    server/       # Server utilities (router)
    utils.ts      # Client utilities
tests/
  api.test.ts     # API tests
```

## Scripts

| Script | Description |
|--------|-------------|
| `bun dev` | Start dev server with hot reload |
| `bun start` | Start production server |
| `bun test` | Run all tests |
| `bun typecheck` | TypeScript type checking |
