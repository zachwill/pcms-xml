# web/ — Rails + Datastar

This directory is the **canonical** web app for this repo.

- Backend: Rails
- UI runtime: Datastar (HTML-first morph/patch + signals)
- Data source: Postgres (`pcms.*` warehouses + `pcms.fn_*` primitives)

React prototype (reference only): `prototypes/salary-book-react/`

## Requirements

- Ruby (see `web/.ruby-version`)
- `POSTGRES_URL` pointing at a database that already has the `pcms` schema loaded

### macOS (Homebrew) notes

If you install Ruby via Homebrew on macOS, you likely need Homebrew’s LLVM in
`PATH` when building native gems (Ruby 3.4 expects `stdckdint.h`).

```bash
brew install ruby@3.4 llvm

export PATH="/opt/homebrew/opt/llvm/bin:/opt/homebrew/opt/ruby@3.4/bin:/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"
```

## Setup

```bash
cd web
bundle install

# Rails migrations (slug registry, etc.)
POSTGRES_URL="$POSTGRES_URL" bin/rails db:migrate

POSTGRES_URL="$POSTGRES_URL" bin/rails server
```

Notes:
- Repo convention is `POSTGRES_URL`. Rails convention is `DATABASE_URL`. We support both.
- `web/config/master.key` is ignored (do not commit it).
- Datastar requires CSP `unsafe-eval` (configured in `config/initializers/content_security_policy.rb`).

## Where to look next

- `web/AGENTS.md` (conventions + directory map)
- `web/TODO.md` (active backlog)
- `web/RAILS_TODO.md` (migration memo from React → Rails)
- `web/specs/*` (interaction invariants)
