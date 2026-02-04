# Fizzy: `lib/rails_ext/*` inventory (framework patches)

Fizzy keeps a small set of **targeted Rails monkey patches / extensions** under `lib/rails_ext/` and loads them explicitly.

These are useful as a checklist of “real production paper-cuts” and how Basecamp solves them with minimal code.

---

## How Fizzy loads these patches

Sources:
- `fizzy.txt` → `config/initializers/extensions.rb`
- `fizzy.txt` → `config/application.rb`

Pattern:
- `config/initializers/extensions.rb` requires every file in `lib/rails_ext/*`.
- `config/application.rb` uses `config.autoload_lib ignore: %w[ ... rails_ext ]` so these patches are **not** managed by the normal autoloader/reloader.

Takeaway:
- Keep patches isolated + explicit. Don’t let them become “random initializers”.

---

## Inventory (what each patch does + should we adopt?)

### 1) `lib/rails_ext/action_mailer_mail_delivery_job.rb`
Source: `fizzy.txt` → `lib/rails_ext/action_mailer_mail_delivery_job.rb`

What it does:
- Includes `SmtpDeliveryErrorHandling` into `ActionMailer::MailDeliveryJob` via `Rails.application.config.to_prepare`.
- That concern lives at `fizzy.txt` → `app/jobs/concerns/smtp_delivery_error_handling.rb` and adds:
  - `retry_on` common network/SMTP transient failures
  - `rescue_from` specific 5xx cases to *ignore + optionally Sentry-log* undeliverable addresses

Should we adopt?
- **Maybe.** Only if we run outbound email from the app. The “retry_on + ignore known permanent failures” pattern is excellent.

---

### 2) `lib/rails_ext/active_record_date_arithmetic.rb`
Source: `fizzy.txt` → `lib/rails_ext/active_record_date_arithmetic.rb`

What it does:
- Adds a database-agnostic `connection.date_subtract(date_column, seconds_expression)` helper for:
  - MySQL/Trilogy: `DATE_SUB(...)`
  - SQLite: `datetime(..., '-' || (...) || ' seconds')`

Should we adopt?
- **Probably not** (we’re Postgres-only), but the *idea* is portable:
  - centralize adapter-specific SQL snippets behind `connection.*` methods.

---

### 3) `lib/rails_ext/active_record_replica_support.rb`
Source: `fizzy.txt` → `lib/rails_ext/active_record_replica_support.rb`

What it does:
- Adds:
  - `replica_configured?` (checks for a `replica` config)
  - `configure_replica_connections` (auto `connects_to writing/reading`)
  - `with_reading_role { ... }` (uses replica if present)

Should we adopt?
- **Maybe later.** Useful if we add Postgres read replicas.

---

### 4) `lib/rails_ext/active_record_uuid_type.rb`
Source: `fizzy.txt` → `lib/rails_ext/active_record_uuid_type.rb`

What it does:
- Implements a custom `ActiveRecord::Type::Uuid`:
  - generates UUIDv7
  - stores UUID in binary
  - exposes it as a base36 string (shorter than hex)
- Registers it for `:trilogy` and `:sqlite3` adapters.

Should we adopt?
- **Mostly no** (Postgres has native `uuid`). But we might still steal:
  - UUIDv7 generation (ordering benefits)
  - the concept of short “public IDs” for URLs.

---

### 5) `lib/rails_ext/active_storage_analyze_job_suppress_broadcasts.rb`
Source: `fizzy.txt` → `lib/rails_ext/active_storage_analyze_job_suppress_broadcasts.rb`

What it does:
- Prepends `ActiveStorage::AnalyzeJob#perform` so analysis runs inside:
  - `Board.suppressing_turbo_broadcasts { Card.suppressing_turbo_broadcasts { ... } }`
- Motivation: avoid Turbo/page refreshes caused by attachment analysis touching records.
- Comments mention an upstream Rails bug around `touch_attachment_records`.

Should we adopt?
- **Maybe.** Only relevant if we broadcast updates from models and attachments cause unwanted client refreshes.

---

### 6) `lib/rails_ext/active_storage_authorization.rb`
Source: `fizzy.txt` → `lib/rails_ext/active_storage_authorization.rb`

What it does:
- Adds `accessible_to?(user)` and `publicly_accessible?` helpers to:
  - `ActiveStorage::Blob`
  - `ActiveStorage::Attachment`
- Mixes an `ActiveStorage::Authorize` concern into ActiveStorage controllers so blob/variant routes:
  - run `require_authentication`
  - 403 if the blob isn’t accessible to `Current.user`
  - allow through if the blob is “publicly accessible”

Should we adopt?
- **Yes (if we use ActiveStorage).** This is a clean, minimal approach for multi-tenant or permissioned blobs.

---

### 7) `lib/rails_ext/active_storage_blob_service_url_for_direct_upload_expiry.rb`
Source: `fizzy.txt` → `lib/rails_ext/active_storage_blob_service_url_for_direct_upload_expiry.rb`

What it does:
- Introduces `ActiveStorage.service_urls_for_direct_uploads_expire_in` (default `48.hours`).
- Prepends blob behavior so `service_url_for_direct_upload` uses that expiry.
- Rationale: Cloudflare (or proxies) may buffer slow uploads and exceed the default signed URL expiration.

Should we adopt?
- **Maybe.** If we support large direct uploads behind a proxy/CDN.

---

### 8) `lib/rails_ext/active_support_array_conversions.rb`
Source: `fizzy.txt` → `lib/rails_ext/active_support_array_conversions.rb`

What it does:
- Adds `Array#to_choice_sentence` (a `to_sentence` variant that uses `or`).

Should we adopt?
- **Probably not.** Nice sugar, but non-essential.

---

### 9) `lib/rails_ext/prepend_order.rb`
Source: `fizzy.txt` → `lib/rails_ext/prepend_order.rb`

What it does:
- Adds `prepend_order(*args)` to `ActiveRecord::Relation` and `ActiveRecord::AssociationRelation`.
- Lets you add ordering *ahead of* existing `order_values`.

Should we adopt?
- **Maybe.** Useful for “pin these records first” sorts.

---

### 10) `lib/rails_ext/string.rb`
Source: `fizzy.txt` → `lib/rails_ext/string.rb`

What it does:
- Adds `String#all_emoji?` Unicode-aware check.

Should we adopt?
- **Unlikely** unless we have similar UI tweaks (e.g., reactions/emojis).

---

## Bonus: a SaaS-engine Rails patch

Source: `fizzy.txt` → `saas/lib/rails_ext/active_record_tasks_database_tasks.rb`

- Extends `ActiveRecord::Tasks::DatabaseTasks.schema_dump_path`.
- Notes it’s proposed upstream (Rails PR referenced in comments).

Likely irrelevant for us unless we end up with:
- an engine-within-app, or
- a need to customize schema dump output paths.

---

## Overall takeaway

Fizzy’s posture is worth copying:
- keep patches tiny + named
- load them explicitly
- add tests for the risky ones
- upstream when possible
