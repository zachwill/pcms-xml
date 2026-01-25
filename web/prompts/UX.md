I'm attaching a video of a UI. I need you to act as a UX analyst, not a designer.

Your job: Extract the interaction patterns and state machine logic from what you observe. I do NOT care about:
- Colors, fonts, shadows, gradients
- Whether things look "good" or "modern"
- Visual styling opinions

I DO care about:
- What happens when the user does X (click, hover, scroll, drag)
- What state changes occur and how they propagate
- Navigation flow (what pushes, what replaces, what pops)
- Spatial relationships (what's sticky, what scrolls, what's fixed)
- Information hierarchy (what's always visible vs. revealed on demand)
- Hover/focus affordances (what previews, what highlights, what expands)
- Transitions (not the animation style, but: does it slide, does it fade, is it instant?)

Output format:

1. Interaction Inventory — A table of every distinct interaction you observe:
2. State Machine — Describe the modes/states the UI can be in and what transitions between them. Use a simple
notation like:
  ```
    STATE_A --[user action]--> STATE_B
    STATE_B --[user action]--> STATE_A
  ```
3. Spatial Layout Rules — What's fixed? What's sticky? What scrolls independently? What's the relationship
between panels/regions?
4. Context Propagation — How does selecting/focusing something in one area affect what's shown in another area?
Is it:
    - Immediate (selection drives detail view)?
    - Lazy (hover previews, click commits)?
    - Bidirectional (changes in detail affect main view)?
5. Progressive Disclosure — What information is hidden by default and revealed through interaction? What's the hierarchy of "drill down"?
6. Key UX Patterns — Name the patterns you observe (e.g., "master-detail", "scroll-spy", "faceted filtering", "command palette", "contextual sidebar"). Just name them and describe how they're implemented here.

Do NOT:
- Suggest improvements
- Comment on visual design quality
- Recommend technologies or frameworks
- Add anything that isn't directly observable in the video

Be exhaustive. If you see 15 different click targets, document all 15. If there are subtle hover states, note them. I need the interaction spec, not a summary.
