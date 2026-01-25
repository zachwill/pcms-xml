# UX Reference Docs — Agent Guidelines

This directory contains interaction pattern references extracted from external UIs. These are **observational records**, not implementation specs.

## Purpose

Capture interaction mechanics from well-designed UIs so future work can reference them. The value is in the **patterns themselves**, not in how they might apply to our project.

## Rules

1. **Document what was observed, not what we might do with it.** No "Applicability to Salary Book" sections. No invented examples. No speculation.

2. **Stay concrete.** State machines, interaction inventories, spatial rules. If Gemini said "click X does Y", write that. Don't extrapolate.

3. **No project-specific mappings.** A future agent reading these docs should understand the pattern in isolation. They can decide applicability themselves.

4. **Preserve the source analysis.** These docs encode insights from video analysis. Don't lose information by summarizing too aggressively.

5. **Keep sections focused.** Each section covers one pattern. State machine, key insight, done. No tangents.

## What Belongs Here

- Interaction inventories (trigger → result)
- State machines (ASCII notation)
- Spatial layout rules (fixed, sticky, scrollable)
- Context propagation diagrams
- Progressive disclosure hierarchies

## What Does NOT Belong Here

- "How we could use this" speculation
- Project-specific examples (players, teams, contracts, etc.)
- Implementation recommendations
- Visual style notes (colors, fonts, spacing)
- Component library suggestions

## File Naming

`{source}-reference.md` — e.g., `anime-docs-reference.md`, `iconsax-reference.md`

## See Also

- `web/prompts/ux-reference.md` — prompt template for generating these docs
