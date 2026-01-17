# PCMS XML Flow

Windmill flow for importing NBA PCMS (Player Contract Management System) XML data into PostgreSQL.

## Architecture (v3.0)

```
S3 ZIP → Extract → XML → Clean JSON → PostgreSQL
                          ↑
                    snake_case keys
                    null (not xsi:nil)
                    flat structure
```

1. **Lineage step** downloads ZIP, extracts XML, parses to **clean JSON**
2. **Import scripts** read clean JSON and insert directly to Postgres
3. No transformation needed—JSON keys already match DB columns

## Quick Start

```bash
# Install dependencies
bun install

# Generate clean JSON from XML (for local dev)
bun run scripts/parse-xml-to-json.ts

# Run a step locally
POSTGRES_URL="postgres://..." bun run import_pcms_data.flow/players_&_people.inline_script.ts
```

## Clean JSON Files

The lineage step produces these files in `.shared/nba_pcms_full_extract/`:

| File | Records | Target Table |
|------|---------|--------------|
| `players.json` | 14,421 | `pcms.people` |
| `contracts.json` | 8,071 | `pcms.contracts`, `contract_versions`, `salaries` |
| `transactions.json` | 232,417 | `pcms.transactions` |
| `ledger.json` | 50,713 | `pcms.ledger_entries` |
| `trades.json` | 1,731 | `pcms.trades`, `trade_teams`, `trade_groups` |
| `draft_picks.json` | 1,169 | `pcms.draft_picks` (DLG/WNBA) |
| `draft_pick_summaries.json` | 450 | `pcms.draft_pick_summaries` |
| `team_exceptions.json` | nested | `pcms.team_exceptions`, `team_exception_usage` |
| `team_budgets.json` | nested | `pcms.team_budget_snapshots`, `tax_team_status` |
| `team_transactions.json` | 80,130 | ⚠️ Not yet imported (see TODO.md) |
| `two_way.json` | 28,659 | `pcms.two_way_daily_statuses` |
| `two_way_utility.json` | nested | `pcms.two_way_contract_utility`, `two_way_game_utility` |
| `lookups.json` | 43 tables | `pcms.lookups`, `pcms.teams` |
| `yearly_system_values.json` | varies | `pcms.league_system_values` |
| `cap_projections.json` | varies | `pcms.league_salary_cap_projections` |

## Directory Structure

```
.
├── import_pcms_data.flow/       # Windmill flow (18 steps)
│   ├── flow.yaml                # Flow definition
│   ├── lineage_management_*.ts  # Step A: S3 → XML → clean JSON
│   ├── players_&_people.*.ts    # Step B: Insert players
│   ├── contracts,_versions_*.ts # Step C: Contracts, versions, salaries
│   ├── ...                      # Steps D-P (see flow.yaml)
│   └── finalize_lineage.*.ts    # Step L: Aggregate results
├── migrations/                  # SQL migrations for pcms schema
├── scripts/
│   ├── parse-xml-to-json.ts     # Dev tool: XML → clean JSON
│   ├── inspect-json-structure.ts
│   └── show-all-paths.ts
├── agents/                      # Autonomous coding agents
│   ├── coverage.ts              # Fill coverage gaps (team_transactions, etc.)
│   ├── enhance.ts               # Add team_code columns
│   └── ...
├── .ralph/                      # Agent task files
├── .shared/
│   ├── nba_pcms_full_extract/   # Clean JSON output
│   └── nba_pcms_full_extract_xml/ # Source XML (local dev)
├── AGENTS.md                    # Architecture details
├── SCHEMA.md                    # Target database schema
└── TODO.md                      # Remaining work & coverage audit
```

## Import Script Pattern

Scripts are simple—just read and insert:

```typescript
import { SQL } from "bun";

const sql = new SQL({ url: Bun.env.POSTGRES_URL!, prepare: false });

export async function main(dry_run = false, ..., extract_dir = "./shared/pcms") {
  // Read clean JSON
  const players = await Bun.file(`${baseDir}/players.json`).json();

  // Insert (keys already match columns)
  await sql`INSERT INTO pcms.people ${sql(rows)} ON CONFLICT ...`;
}
```

## Flow Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dry_run` | boolean | `false` | Preview without DB writes |
| `s3_key` | string | `pcms/nba_pcms_full_extract.zip` | S3 key for ZIP |

## Key Design Decisions

- **Clean once, use everywhere** — XML quirks handled in lineage step, not every script
- **snake_case keys** — JSON keys match Postgres columns directly
- **same_worker: true** — All steps share `.shared/` directory
- **Bun runtime** — Native Postgres, fast file I/O, shell integration
