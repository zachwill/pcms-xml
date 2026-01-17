#!/usr/bin/env bun
import { loop, work, halt } from "./core";

/**
 * Add Files Agent
 * 
 * Creates new import scripts for empty PCMS tables.
 * Pre-populated task list in .ralph/ADD_FILES.md
 */

const WORK_PROMPT = `
You are adding new import scripts to the PCMS Windmill flow.

## Your Task
1. Read .ralph/ADD_FILES.md for the current task
2. Pick the FIRST unchecked item and create that script

## For Each Script, Create:
1. The .ts file in import_pcms_data.flow/
2. The .lock file (copy format from existing: \`{ "dependencies": {} }\\n//bun.lock\\n\`)
3. Update flow.yaml to add the new step (after step k, before finalize_lineage)
4. Update finalize_lineage summaries array to include the new step result

## Reference Files
- \`TODO.md\` — Data source mappings and table schemas
- \`import_pcms_data.flow/players_&_people.inline_script.ts\` — Working example pattern
- \`import_pcms_data.flow/flow.yaml\` — Flow structure (see how steps are defined)
- \`new_pcms_schema.flow/\` — Database schema definitions
- \`.shared/nba_pcms_full_extract/\` — Sample JSON data

## Script Pattern
\`\`\`typescript
import { SQL } from "bun";
import { readdir } from "node:fs/promises";

const sql = new SQL({ url: Bun.env.POSTGRES_URL!, prepare: false });

export async function main(
  dry_run = false,
  lineage_id?: number,
  s3_key?: string,
  extract_dir = "./shared/pcms"
) {
  const startedAt = new Date().toISOString();
  
  try {
    // Find extract directory
    const entries = await readdir(extract_dir, { withFileTypes: true });
    const subDir = entries.find(e => e.isDirectory());
    const baseDir = subDir ? \`\${extract_dir}/\${subDir.name}\` : extract_dir;

    // Read clean JSON
    const data = await Bun.file(\`\${baseDir}/filename.json\`).json();
    
    // Transform and upsert in batches...
    
    return {
      dry_run,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables: [{ table: "pcms.table_name", attempted: count, success: true }],
      errors: [],
    };
  } catch (e: any) {
    return { dry_run, started_at: startedAt, finished_at: new Date().toISOString(), tables: [], errors: [e.message] };
  }
}
\`\`\`

## flow.yaml Step Pattern
\`\`\`yaml
- id: m  # next letter after k (l is finalize)
  summary: Agents & Agencies
  value:
    type: rawscript
    content: '!inline agents_&_agencies.inline_script.ts'
    input_transforms:
      dry_run:
        type: javascript
        expr: flow_input.dry_run
      lineage_id:
        type: javascript
        expr: results.a.lineage_id
      s3_key:
        type: javascript
        expr: results.a.s3_key ?? flow_input.s3_key
      extract_dir:
        type: javascript
        expr: results.a.extract_dir ?? './shared/pcms'
    lock: '!inline agents_&_agencies.inline_script.lock'
    language: bun
\`\`\`

## Important Details
- Step IDs: m, n, o, p (l is already finalize_lineage, which moves to the end)
- Finalize step summaries array needs updating: add results.m, results.n, etc.
- Match JSON keys to DB columns (check schema in new_pcms_schema.flow/)
- Use BATCH_SIZE = 100 for upserts
- Include proper ON CONFLICT handling

## After Creating
1. Check off the task in .ralph/ADD_FILES.md
2. Commit: \`git add -A && git commit -m "feat: add <script name>"\`
`;

loop({
  name: "add-files",
  taskFile: ".ralph/ADD_FILES.md",
  timeout: "10m",
  pushEvery: 4,
  maxIterations: 20,

  run(state) {
    if (state.hasTodos) {
      return work(WORK_PROMPT, { thinking: "high" });
    }
    return halt("All import scripts added");
  },
});
