# Dump navigation + search playbook

These Basecamp codebases are stored as giant `.txt` dumps. They’re meant to be searched, not “read straight through”.

## Core trick

1) Locate the file header:

```bash
rg -n "^File: app/models/current\\.rb$" reference/basecamp/fizzy.txt
```

2) Open the dump around that line number.

## Useful discovery searches

```bash
# List file headers (helps you see what exists)
rg -n "^File: " reference/basecamp/fizzy.txt | head

# Find all controllers/models/etc
rg -n "^File: app/controllers/" reference/basecamp/campfire.txt | head
rg -n "^File: app/models/" reference/basecamp/campfire.txt | head

# Find gems / stack choices quickly
rg -n "^File: Gemfile$" reference/basecamp/fizzy.txt
rg -n "^File: config/application\\.rb$" reference/basecamp/campfire.txt

# Find “key patterns” across the dump
rg -n "ActiveSupport::CurrentAttributes" reference/basecamp/*.txt
rg -n "include Authentication" reference/basecamp/*.txt
rg -n "stale_when_importmap_changes" reference/basecamp/*.txt
```

## High-signal file short list (start here)

### Shared
- `Gemfile`
- `config/application.rb`
- `config/routes.rb`
- `app/controllers/application_controller.rb`
- `app/models/current.rb`
- `bin/setup`

### Useful next layer
- `app/controllers/concerns/*` (or `app/controllers/*` includes)
- `app/models/concerns/*`
- `config/initializers/*`
- `app/views/layouts/*`
- `app/javascript/controllers/*` (or wherever Stimulus controllers live)
- `lib/*` (especially request/authorization helpers)

## Note-taking convention for this repo

When you find a good pattern, record it as:

- Source dump: `fizzy.txt` or `campfire.txt`
- File: `path/to/file.rb`
- What problem it solves
- Why we might adopt it
- Any adaptation notes for **Postgres + multi-schema** (our world)
