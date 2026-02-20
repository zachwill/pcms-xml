# DESIGN Loop Reset

This file now does two things:
1) Optional **override queue** (`- [ ] Fix: /route`) for forcing next assignments.
2) Lightweight **pass notes** so each route has a visible quality history.

If the override queue is empty, `agents/design.ts` auto-rotates this route cycle:
`/agents → /players → /teams → /agencies → /drafts → /draft-selections → /trades → /transactions → /team-summary → /system-values → /two-way-utility`.

---

## Required read order (every run)
- `web/AGENTS.md`
- `agents/AGENTS.md`
- `web/docs/agent_browser_playbook.md`
- `.ralph/DESIGN.md`

## Required reference pages (every run)
- `http://localhost:3000/` (Salary Book)
- `http://localhost:3000/ripcity/noah` (Noah)

Capture annotated screenshots and inspect them before touching the target route.

---

## Override queue (top = next assignment)

- [ ] Fix: /agents
- [ ] Fix: /players
- [ ] Fix: /drafts
- [ ] Fix: /draft-selections
- [ ] Fix: /trades
- [ ] Fix: /transactions
- [ ] Fix: /teams
- [ ] Fix: /agencies
- [ ] Fix: /team-summary
- [ ] Fix: /system-values
- [ ] Fix: /two-way-utility

---

## Pass notes (append newest note first)

### /agents
- _No reset pass yet._

### /players
- _No reset pass yet._

### /teams
- _No reset pass yet._

### /agencies
- _No reset pass yet._

### /drafts
- _No reset pass yet._

### /draft-selections
- _No reset pass yet._

### /trades
- _No reset pass yet._

### /transactions
- _No reset pass yet._

### /team-summary
- _No reset pass yet._

### /system-values
- _No reset pass yet._

### /two-way-utility
- _No reset pass yet._
