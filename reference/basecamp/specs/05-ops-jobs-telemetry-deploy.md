# Ops: jobs, telemetry, deploy, CI, security

This is the “how do they run it in production?” extraction.

---

## CI: `ActiveSupport::ContinuousIntegration`

Both apps use the same pattern:
- `bin/ci` bootstraps `ActiveSupport::ContinuousIntegration`
  - `fizzy.txt` → `bin/ci`
  - `campfire.txt` → `bin/ci`
- `config/ci.rb` defines the steps

### Campfire CI steps
Source: `campfire.txt` → `config/ci.rb`
- `bin/setup --skip-server`
- `bin/rubocop`
- `bin/bundler-audit`
- `bin/importmap audit`
- `bin/brakeman ...`
- `bin/rails test` + `test:system` + `db:seed:replant`

### Fizzy CI steps
Source: `fizzy.txt` → `config/ci.rb`
- Adds extra security + drift checks:
  - `bin/bundle-drift check`
  - `bin/bundler-audit check --update`
  - `bin/gitleaks-audit`
- Runs different test matrices depending on SaaS vs OSS and adapter.

---

## Dev bootstrap (`bin/setup`) conventions

### Campfire
Source: `campfire.txt` → `bin/setup`
- Uses `gum` for UX + `mise` for Ruby toolchains.
- Installs packages: sqlite, ffmpeg, mise.
- Prepares DB.
- Ensures Redis is running (starts via Docker if needed).

### Fizzy
Source: `fizzy.txt` → `bin/setup`
- Same `gum` + `mise` approach.
- OSS mode can spin up MySQL via Docker when `DATABASE_ADAPTER=mysql`.
- Uses `rails db:prepare` + conditional seeding.

Takeaway for us:
- We should mirror this style in our Rails app: **one command** to get to “running locally”.

---

## Background jobs

### Fizzy: Solid Queue
Sources:
- `fizzy.txt` → `config/puma.rb` (runs Solid Queue inside Puma by default)
- `fizzy.txt` → `config/queue.yml` (workers/dispatchers)
- `fizzy.txt` → `config/recurring.yml` (recurring schedules)

Also notable:
- Tenant context in jobs:
  - `fizzy.txt` → `config/initializers/active_job.rb` serializes `Current.account` into job payload and rehydrates it.
- Jobs frequently use:
  - `discard_on ActiveJob::DeserializationError`
  - `ActiveJob::Continuable` + `step` for resumability
  - `limits_concurrency` for throttling per owner

### Campfire: Resque
Sources:
- `campfire.txt` → `Procfile` includes `resque-pool`
- `campfire.txt` → `config/resque-pool.yml`

---

## Deploy + runtime

### Fizzy
Sources:
- `fizzy.txt` → `config/deploy.yml` (Kamal)
- `fizzy.txt` → `Dockerfile` (Thruster entrypoint + db prepare)

Notable deploy decisions:
- Uses a persistent storage volume (sqlite + ActiveStorage files).
- Bridges fingerprinted assets between versions (`asset_path`).

### Campfire
Sources:
- `campfire.txt` → `Dockerfile`
- `campfire.txt` → `Procfile`
- `campfire.txt` → `bin/boot`

Pattern:
- Single-container deploy runs Procfile processes (web + redis + workers).

---

## Telemetry / error reporting

### Sentry
- Campfire: `campfire.txt` → `config/initializers/sentry.rb`
- Fizzy: present in SaaS Gemfile; also has rich error context:
  - `fizzy.txt` → `config/initializers/error_context.rb`

### Metrics
- Fizzy SaaS adds Yabeda + Prometheus plugins.

---

## Security posture

Shared:
- Brakeman + bundler-audit + importmap audit are first-class CI steps.
- Parameter filtering:
  - `campfire.txt` → `config/initializers/filter_parameter_logging.rb`
  - `fizzy.txt` → `config/initializers/filter_parameter_logging.rb`

Fizzy adds:
- gitleaks audit (`bin/gitleaks-audit`).

---

## What we should steal for our app

- Copy the CI shape (security audits + style + tests).
- Choose a jobs strategy early:
  - Solid Queue is attractive for our Postgres-first environment.
- Add structured error context (user/account/request IDs) from the start.
- Keep `bin/setup` as the “everything works” button.
