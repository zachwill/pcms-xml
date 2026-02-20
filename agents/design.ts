#!/usr/bin/env bun
import { loop, work, halt, supervisor, type State } from "./core";

/**
 * design.ts — nonstop visual convergence loop for non-Salary-Book surfaces.
 *
 * Reset goals:
 * - Keep iterating forever across non-Salary-Book, non-Noah routes.
 * - Always compare against Salary Book + Noah via agent-browser evidence.
 * - Fix one assigned route per iteration, commit, repeat.
 */

const TASK_FILE = ".ralph/DESIGN.md";

const REQUIRED_READS = [
  "web/AGENTS.md",
  "agents/AGENTS.md",
  "web/docs/agent_browser_playbook.md",
  TASK_FILE,
];

const ROUTE_CYCLE = [
  "/agents",
  "/players",
  "/teams",
  "/agencies",
  "/drafts",
  "/draft-selections",
  "/trades",
  "/transactions",
  "/team-summary",
  "/system-values",
  "/two-way-utility",
];

const FORBIDDEN_PATH_PREFIXES = [
  "web/app/views/salary_book/",
  "web/app/controllers/salary_book",
  "web/app/helpers/salary_book",
  "web/test/integration/salary_book",
  "web/app/views/ripcity/noah/",
  "web/app/controllers/ripcity/noah",
  "web/app/javascript/ripcity/noah",
];

function bullets(items: string[]): string {
  return items.map((x) => `- ${x}`).join("\n");
}

function gitStdout(args: string[]): string {
  const result = Bun.spawnSync({ cmd: ["git", ...args], stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) return "";
  return Buffer.from(result.stdout).toString("utf8").trim();
}

function gitLines(args: string[]): string[] {
  const out = gitStdout(args);
  if (!out) return [];
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

function pendingChangedPaths(): string[] {
  const unstaged = gitLines(["diff", "--name-only"]);
  const staged = gitLines(["diff", "--cached", "--name-only"]);
  return Array.from(new Set([...unstaged, ...staged]));
}

function guardrailErrors(): string[] {
  const pending = pendingChangedPaths();
  const forbidden = pending.filter((path) =>
    FORBIDDEN_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
  );

  if (forbidden.length === 0) return [];
  return [
    "Diff includes Salary Book or Noah implementation paths (read-only in this loop):",
    ...forbidden.map((path) => `  - ${path}`),
  ];
}

function extractRoute(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/\/(?:[a-z0-9-]+)(?:\/:?[a-z0-9_-]+)?/i);
  return match?.[0] ?? null;
}

function chooseRoute(state: State): string {
  // Priority 1: explicit override via unchecked task in .ralph/DESIGN.md
  const todoRoute = extractRoute(state.nextTodo);
  if (todoRoute) return todoRoute;

  // Priority 2: CLI context override, e.g. --context "/players"
  const contextRoute = extractRoute(state.context);
  if (contextRoute) return contextRoute;

  // Priority 3: deterministic rotation
  const idx = (state.iteration - 1) % ROUTE_CYCLE.length;
  return ROUTE_CYCLE[idx];
}

function workerPrompt(route: string, nextTodo: string | null): string {
  const todoBlock = nextTodo
    ? `Assigned todo: ${nextTodo}`
    : `No unchecked override todo found. Assigned route from cycle: ${route}`;

  const routeSlug = route.replace(/^\//, "").replace(/\//g, "_") || "root";

  return `
Read the following first:
${bullets(REQUIRED_READS)}

Previous design direction drifted. Reset to exemplar behavior and visual language.

${todoBlock}

Your task (single route only):
1) Use agent-browser to inspect BOTH reference pages first:
   - http://localhost:3000/
   - http://localhost:3000/ripcity/noah
2) Capture annotated screenshots for those references:
   - /tmp/agent-browser/reference-salary-book.png
   - /tmp/agent-browser/reference-noah.png
3) Use the read tool on both annotated screenshots so you actually inspect the visual labels.
4) Inspect target route with agent-browser:
   - http://localhost:3000${route}
   - capture /tmp/agent-browser/${routeSlug}-before.png (annotated)
   - use the read tool on that screenshot
5) Implement fixes on ${route} so it converges toward Salary Book + Noah:
   - command bar structure + density
   - main canvas scan speed
   - sidebar base/overlay behavior
   - row hover + numeric typography consistency
   - patch boundaries and interaction predictability
6) Capture after screenshot:
   - /tmp/agent-browser/${routeSlug}-after.png (annotated)
   - use the read tool on the after screenshot and sanity check your own result
7) Update ${TASK_FILE}:
   - If there is an unchecked "Fix: ${route}" task, check it off.
   - Add a brief pass note under that route with what changed.
8) Commit:
   - git add -A && git commit -m "design: ${route} converge toward salary/noah"

Rules:
- Do not edit Salary Book or Noah implementation files.
- Use agent-browser evidence; no code-only design guesses.
- One coherent route outcome per iteration.
- If Rails is down, start it or note blocker in ${TASK_FILE} before committing.
`.trim();
}

const SUPERVISOR_PROMPT = `
You are supervising the non-Salary-Book design convergence loop.

Read:
${bullets(REQUIRED_READS)}

Audit the most recent design commit(s) and verify:
1) The worker focused on exactly one assigned non-Salary/Noah route.
2) /tmp/agent-browser includes fresh annotated evidence files:
   - reference-salary-book.png
   - reference-noah.png
   - <route>-before.png
   - <route>-after.png
3) Changes improve command bar, main canvas density, and sidebar behavior toward exemplar patterns.
4) Worker did not edit Salary Book or Noah implementation files.

If drift is present:
- Add/adjust unchecked override tasks in ${TASK_FILE} using format: "- [ ] Fix: /route".
- Keep queue focused on broken routes first (/agents, /players, /drafts, etc.).

Commit any supervisor backlog edits:
  git add -A && git commit -m "design: supervisor route correction"
`.trim();

loop({
  name: "design",
  taskFile: TASK_FILE,
  timeout: "18m",
  pushEvery: 2,
  maxIterations: 200,
  maxConsecutiveTimeouts: 4,
  continuous: true,

  supervisor: supervisor(SUPERVISOR_PROMPT, {
    every: 6,
    provider: "openai-codex",
    model: "gpt-5.3-codex",
    thinking: "high",
    timeout: "18m",
  }),

  run(state) {
    const errors = guardrailErrors();
    if (errors.length > 0) {
      return halt(errors.join("\n"));
    }

    const route = chooseRoute(state);

    return work(workerPrompt(route, state.nextTodo), {
      provider: "openai-codex",
      model: "gpt-5.3-codex",
      thinking: "high",
      timeout: "18m",
    });
  },
});
