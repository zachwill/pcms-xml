#!/usr/bin/env bun
import { loop, work, generate, supervisor } from "./core";

/**
 * entities.ts — BrickLink-style entity explorer (Rails + Datastar)
 *
 * Goal:
 * - Build link-rich entity pages (players/teams/agents/...) in `web/`
 * - Keep URLs clean + canonical (slug-first) with numeric fallbacks
 * - Treat Postgres warehouses/functions as the product API
 *
 * Task tracking:
 * - .ralph/ENTITIES.md
 *
 * Usage:
 *   bun agents/entities.ts
 *   bun agents/entities.ts --once
 *   bun agents/entities.ts --dry-run
 */

const TASK_FILE = ".ralph/ENTITIES.md";

loop({
  name: "entities",
  taskFile: TASK_FILE,
  timeout: "15m",
  pushEvery: 4,
  maxIterations: 250,
  continuous: false,

  supervisor: supervisor(
    `
You are the supervisor for the Rails entity explorer (BrickLink-style navigation).

Every 4 commits, review progress and keep the backlog healthy.

REVIEW INPUTS:
1) ${TASK_FILE} (current backlog)
2) web/AGENTS.md (URL conventions + posture)
3) reference/sites/bricklink.txt (information architecture inspiration)
4) reference/datastar/basecamp.md + reference/datastar/insights.md (Rails + Datastar patterns)
5) Current web/ entity controllers/views/routes (what exists)

SUPERVISOR CHECKLIST:
- Are we building canonical slug routes + numeric fallbacks + 301 redirects?
- Are entity pages link-rich (players ↔ teams ↔ agents) and progressively enhanced?
- Are we keeping business logic in SQL (pcms.* warehouses/functions), not Ruby?
- Are tasks sized as “one solid vertical slice per TODO”?
- Are we avoiding tool creep (Salary Book parity belongs in .ralph/RAILS.md)?

IF BACKLOG NEEDS ADJUSTMENT:
- Reorder tasks if dependencies are wrong
- Split tasks that are too big
- Add pointers to relevant files/queries
- Move completed items to "Done"

AFTER REVIEW:
- Update ${TASK_FILE} if needed
- git add -A && git commit -m "entities: supervisor review"
    `,
    {
      every: 4,
      provider: "openai-codex",
      model: "gpt-5.2",
      thinking: "xhigh",
      timeout: "15m",
    },
  ),

  run(state) {
    if (state.hasTodos) {
      return work(
        `
You are building BrickLink-style entity navigation in the Rails app in web/.

CURRENT TASK:
${state.nextTodo}

Read the full context at the top of ${TASK_FILE} before coding.

KEY REFERENCES:
- web/AGENTS.md — Rails app conventions + URL rules
- reference/sites/bricklink.txt — link graph + tabbed, data-dense pages
- reference/datastar/basecamp.md — Basecamp-ish Rails patterns translated to Datastar
- reference/datastar/insights.md — Datastar conventions (signals flatcase, patch by stable IDs)

GUARDRAILS:
- Canonical routes are slug-only (e.g. /teams/bos). Keep numeric fallbacks that 301.
- Slugs live in the Slug table (aliases allowed; one canonical per entity).
- Prefer HTML-first pages; Datastar enhances in-page UX only when needed.
- Don’t re-implement cap/CBA math in Ruby—use pcms.* warehouses/functions.

EXECUTION:
1) Read relevant existing files in web/ first (routes/controllers/views/helpers)
2) Implement the task completely
3) Check off the completed item in ${TASK_FILE}
4) If the task reveals follow-up work, add it as a new TODO (small + concrete)
5) Commit and exit:
   git add -A && git commit -m "entities: <short summary>"
        `,
        {
          provider: "google-antigravity",
          model: "claude-opus-4-5-thinking",
          thinking: "high",
          timeout: "10m",
        },
      );
    }

    const contextBlock = state.context ? `\nFocus area: ${state.context}\n` : "";

    return generate(
      `
${TASK_FILE} has no unchecked tasks.
${contextBlock}

Review what exists in web/ and generate the next batch of entity-explorer tasks.

INPUTS:
- web/AGENTS.md
- reference/sites/bricklink.txt
- reference/datastar/basecamp.md + insights.md
- Current state of web/ routes + entity pages

TASK SHAPE:
- Prefer vertical slices: route + controller + query + view + cross-links
- Keep each TODO shippable in 1–2 commits

After writing tasks:
- git add -A && git commit -m "entities: generate backlog"
      `,
      {
        provider: "google-antigravity",
        model: "claude-opus-4-5-thinking",
        thinking: "high",
        timeout: "10m",
      },
    );
  },
});
