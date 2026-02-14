# Campsite codebase LOC notes (shallow clone)

Date: 2026-02-13  
Repo analyzed: `https://github.com/campsite/campsite`  
Clone mode: `git clone --depth 1 /tmp/campsite`

## Why this note exists
Quick reference for rough line-count sizing, especially to explain why Ruby appears high (~114k LOC).

## Method used
- Counted tracked files via `git ls-files`
- Counted text lines per file (binary files skipped)
- Grouped by extension and directory
- This is an approximate LOC count, not a semantic/code-quality metric

---

## Source-only LOC summary
Source allowlist used:

- `.rb, .rake, .ru`
- `.ts, .tsx, .js, .jsx, .mjs, .cjs, .mts`
- `.py, .sh`
- `.erb, .ejs, .html`
- `.css, .scss, .sass`

### Source-only totals
- **263,186 LOC** across **3,687 files**

### Top source extensions
- `.rb`: 114,109 LOC (1,946 files)
- `.tsx`: 89,561 LOC (860 files)
- `.ts`: 50,833 LOC (749 files)
- `.css`: 3,014 LOC
- `.js`: 2,255 LOC
- `.erb`: 1,790 LOC

---

## Ruby (`.rb`) breakdown
Total Ruby: **114,109 LOC** (all under `api/`)

### By area
- `api/test`: **59,514 LOC** (**52.2%**)  
- `api/app`: **34,541 LOC** (**30.3%**)  
- `api/config`: **8,591 LOC** (**7.5%**)  
- `api/lib`: **6,019 LOC** (**5.3%**)  
- `api/db`: **5,411 LOC** (**4.7%**)

### Takeaway
**Most Ruby is test code**, not production runtime logic.

---

## `api/app` (runtime Ruby) composition
Within `api/app`:

- `app/models`: 16,057 LOC
- `app/controllers`: 11,274 LOC
- `app/serializers`: 2,984 LOC
- `app/jobs`: 2,510 LOC
- `app/policies`: 1,459 LOC
- `app/mailers`: 253 LOC

### Controller focus
- Heavily API-oriented (`api/v1` dominates controller LOC)
- Domain includes posts, comments, notes, projects, org/membership, messaging, calls, notifications, integrations

---

## Important outlier file
- `api/config/initializers/email_provider_domains.rb`: **6,114 LOC**
- This is mostly a huge domain list (data-like content), which inflates Ruby LOC but is not complex business logic.

If excluded:
- Ruby drops from **114,109** to **107,995 LOC**.

---

## Practical interpretation
When you see “114k Ruby” in Campsite:
1. About half is tests
2. A chunk is config/migrations/lib
3. One very large initializer is mostly static domain list data
4. Core runtime Rails code is primarily in `api/app` (~34.5k LOC)
