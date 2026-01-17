/**
 * Finalize Lineage - Aggregates results from all import steps
 * 
 * This step runs last and:
 * 1. Aggregates errors from all previous steps
 * 2. Counts total records processed
 * 3. Returns final summary
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TableResult {
  table: string;
  attempted: number;
  success: boolean;
  error?: string;
}

interface StepSummary {
  dry_run?: boolean;
  tables?: TableResult[];
  errors?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export async function main(
  dry_run = false,
  summaries: StepSummary[] = []
) {
  const startedAt = new Date().toISOString();

  // Aggregate errors and record counts from all step summaries
  const allErrors: string[] = [];
  let recordCount = 0;

  for (const s of summaries) {
    // Collect errors array from each step
    for (const err of s?.errors ?? []) {
      allErrors.push(err);
    }

    // Collect table-level errors and count records
    for (const t of s?.tables ?? []) {
      recordCount += Number(t.attempted ?? 0);
      if (!t.success) {
        allErrors.push(`${t.table}: ${t.error ?? "unknown error"}`);
      }
    }
  }

  const status = allErrors.length > 0 ? "FAILED" : "SUCCESS";

  return {
    dry_run,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    tables: [],
    errors: allErrors,
    status,
    record_count: recordCount,
    error_count: allErrors.length,
  };
}
