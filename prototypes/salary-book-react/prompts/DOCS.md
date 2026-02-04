# Prompt: UX Reference Documentation

Use this prompt when converting Gemini video analysis into a UX reference doc.

---

## Input

You'll receive a Gemini analysis of a UI, typically containing:
- Interaction inventory
- State machine
- Spatial layout rules
- Context propagation
- Progressive disclosure
- Key UX patterns

## Output

Write a markdown file for `prototypes/salary-book-react/docs/ux/{source}-reference.md`.

## Structure

```markdown
# {Source Name} — UX Reference Analysis

> One-line description of what this UI demonstrates.

## Why This Reference Exists

Bullet list of the key patterns this UI exemplifies.

---

## 1. {Pattern Name}

### Pattern
What it is.

### State Machine (if applicable)
```
STATE_A
    --[Trigger]--> STATE_B
```

### Key Insight
The non-obvious takeaway.

---

## N. Interaction Inventory

| Element | Trigger | Result |
| :--- | :--- | :--- |
| ... | ... | ... |

---

## References

- Source: {description of source material}
- Related: {other relevant docs}
```

## Rules

1. **Document only what was observed.** If Gemini said "click X does Y", write that. Don't invent examples.

2. **No project mappings.** Do not write "Applicability to Salary Book" or "How this applies to our tool" sections. The reader will determine applicability.

3. **No speculation.** Don't extrapolate patterns that weren't in the analysis. Don't suggest features.

4. **Preserve state machines.** Use the ASCII notation from the source. These are valuable.

5. **Keep interaction inventories complete.** Every trigger/result pair from the source should appear.

6. **No visual style notes.** Colors, fonts, spacing — skip these. We care about mechanics.

7. **Be concise.** Each pattern section should be scannable. State machine + key insight + done.

## Anti-Patterns (Do NOT Do These)

❌ "This maps directly to our Salary Book where..."
❌ "For example, a player name could..."
❌ "We could implement this as..."
❌ "Transferable: ..." / "Does NOT Transfer: ..."
❌ Inventing domain-specific examples
❌ Adding "Implementation Notes" sections
❌ Suggesting TypeScript types or code patterns

## Good Examples

See existing docs in `prototypes/salary-book-react/docs/ux/` after cleanup:
- `anime-docs-reference.md`
- `iconsax-reference.md`
- `command-palette-reference.md`
