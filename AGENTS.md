# AGENTS.md - PCMS XML Flow

## Project Context

Windmill flow that imports NBA PCMS XML data into PostgreSQL. Runs on Bun runtime.

## Architecture (v3.0)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step A: Lineage (downloads ZIP, parses XML → CLEAN JSON)                   │
│                                                                             │
│    XML with xsi:nil, camelCase    →    Clean JSON with nulls, snake_case   │
│    nba_pcms_full_extract_player.xml    players.json                        │
│    nba_pcms_full_extract_contract.xml  contracts.json                      │
│    ...                                 ...                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Steps B-P: Import scripts (read clean JSON, insert to Postgres)           │
│                                                                             │
│    const players = await Bun.file("players.json").json();                  │
│    await sql`INSERT INTO pcms.people ${sql(players)}`;                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step L: Finalize Lineage (aggregate results, update state)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key insight:** Clean the data ONCE during XML parsing, not in every script.

## Key Files

```
import_pcms_data.flow/
├── flow.yaml                              # Flow definition (18 steps)
├── lineage_management_*.ts                # Step A: S3 → extract → XML → CLEAN JSON
├── players_&_people.*.ts                  # Step B: People/players
├── generate_nba_draft_picks.*.ts          # Step R: Generate NBA draft picks from players
├── contracts,_versions,_bonuses_*.ts      # Step C: Contracts, versions, salaries
├── team_exceptions_&_usage.*.ts           # Step D: Team exceptions
├── trades,_transactions_&_ledger.*.ts     # Step E: Trades, transactions, ledger
├── system_values,_rookie_scale_*.ts       # Step F: System values, rookie scale, NCA
├── two-way_daily_statuses.*.ts            # Step G: Two-way daily statuses
├── draft_picks.*.ts                       # Step H: Draft picks
├── draft_pick_summaries.*.ts              # Step Q: Draft pick summaries
├── team_budgets.*.ts                      # Step I: Team budgets
├── waiver_priority_&_ranks.*.ts           # Step J: Waiver priority
├── lookups.*.ts                           # Step K: Lookups
├── agents_&_agencies.*.ts                 # Step M: Agents & agencies
├── transaction_waiver_amounts.*.ts        # Step N: Transaction waiver amounts
├── league_salary_scales_*.ts              # Step O: League salary scales
├── two-way_utility.*.ts                   # Step P: Two-way utility
└── finalize_lineage.*.ts                  # Step L: Finalize (aggregate results)

scripts/
├── parse-xml-to-json.ts         # Dev tool: XML → clean JSON (mirrors lineage)
├── inspect-json-structure.ts    # Dev tool: explore JSON
└── show-all-paths.ts            # Dev tool: path reference

.shared/nba_pcms_full_extract/   # Clean JSON files
.shared/nba_pcms_full_extract_xml/ # Source XML files (for local dev)
```

## Clean JSON Files

The lineage step produces these clean JSON files:

| File | Records | Description |
|------|---------|-------------|
| `players.json` | 14,421 | Players/people |
| `contracts.json` | 8,071 | Contracts with nested versions/salaries |
| `transactions.json` | 232,417 | Transaction history |
| `ledger.json` | 50,713 | Ledger entries |
| `trades.json` | 1,731 | Trade records |
| `draft_picks.json` | 1,169 | Draft picks (DLG/WNBA) |
| `draft_pick_summaries.json` | 450 | Draft pick summaries by team/year |
| `team_exceptions.json` | nested | Team exceptions & usage |
| `team_budgets.json` | nested | Team budget snapshots |
| `team_transactions.json` | 80,130 | Team transactions (cap hold adjustments) |
| `transaction_waiver_amounts.json` | varies | Waiver amount calculations |
| `two_way.json` | 28,659 | Two-way daily statuses |
| `two_way_utility.json` | nested | Two-way game/contract utility |
| `lookups.json` | 43 tables | Reference data |
| `cap_projections.json` | varies | Salary cap projections |
| `yearly_system_values.json` | varies | League system values by year |
| `yearly_salary_scales.json` | varies | Salary scales by year |
| `rookie_scale_amounts.json` | varies | Rookie scale amounts |
| `non_contract_amounts.json` | varies | Non-contract amounts (cap holds, etc.) |

## Clean JSON Format

All JSON files have:
- **snake_case keys** (match DB columns directly)
- **null values** (not `{ "@_xsi:nil": "true" }`)
- **No XML wrapper nesting** (just the array of records)

```typescript
// Clean player record
{
  "player_id": 201839,
  "first_name": "Steve",
  "last_name": "Newman",
  "birth_date": "1984-10-25",
  "team_id": 1612709911,
  "agency_id": null,           // ← was { "@_xsi:nil": "true" }
  "draft_year": null,          // ← was { "@_xsi:nil": "true" }
  ...
}
```

## Import Script Pattern

Scripts are now simple:

```typescript
import { SQL } from "bun";
import { readdir } from "node:fs/promises";

const sql = new SQL({ url: Bun.env.POSTGRES_URL!, prepare: false });

export async function main(dry_run = false, ..., extract_dir = "./shared/pcms") {
  // Find extract directory
  const entries = await readdir(extract_dir, { withFileTypes: true });
  const subDir = entries.find(e => e.isDirectory());
  const baseDir = subDir ? `${extract_dir}/${subDir.name}` : extract_dir;

  // Read clean JSON
  const players: any[] = await Bun.file(`${baseDir}/players.json`).json();

  // Upsert (data is already clean!)
  await sql`INSERT INTO pcms.people ${sql(rows)} ON CONFLICT ...`;
}
```

**No need for:** `nilSafe()`, `safeNum()`, `safeStr()`, `safeBool()`, `hash()`

## Local Development

```bash
# Generate clean JSON from XML (one-time)
bun run scripts/parse-xml-to-json.ts

# Explore structure
bun run scripts/show-all-paths.ts

# Run a step locally
POSTGRES_URL="postgres://..." bun run import_pcms_data.flow/players_&_people.inline_script.ts
```

## Bun Best Practices

```typescript
// ✅ File I/O
const data = await Bun.file("./data.json").json();
await Bun.write("./out.json", JSON.stringify(obj));

// ✅ Postgres (tagged template for safety)
await sql`INSERT INTO pcms.people ${sql(rows)}`;
await sql`SELECT * FROM pcms.people WHERE person_id = ${id}`;

// ✅ Batch upsert
await sql`
  INSERT INTO pcms.people ${sql(rows)}
  ON CONFLICT (person_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    updated_at = EXCLUDED.updated_at
`;
```
