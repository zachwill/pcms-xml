# Dense UI Design: Mental Models for Coding Agents

*A framework for thinking thoroughly about complex interfaces — so you stop building "screens with buttons" and start building systems.*

---

## The Problem You're Solving

When you're asked to build a complex UI, your instinct is to:

1. Identify the "pages"
2. Put components on them
3. Wire up click handlers
4. Ship it

This produces interfaces that **look complete but feel hollow**. Buttons that don't account for when they *shouldn't* work. Screens that don't know what to show between two states. Components that function perfectly in isolation but feel disconnected when composed. Animations bolted on at the end instead of communicating meaning.

The root cause: **you're thinking in components and pages when you should be thinking in states, transitions, and couplings.**

The following mental models will slow you down at the right moments. That's the point.

---

## Mental Model 1: "It's Not Pages, It's States"

**The shortcut**: You think of a UI as a set of screens. Home screen, settings screen, detail screen. You build them. You add navigation between them.

**The reframe**: A UI is a **state machine that has visual consequences**. The screen is not the thing — it's the *shadow* of the thing. The state is the thing.

Ask yourself:

- What are ALL the states this system can be in?
- Not just the "happy path" states. The idle states. The transitioning states. The error states. The "waiting for the second half of a two-part input" states.
- What does the screen look like in EACH of those states?

**The Ferrari example**: Launch Control isn't a "launch screen." It's five states (IDLE → PRE_ARM → ARMED → STAGING → LAUNCH), each with different visuals, different valid inputs, and different exit conditions. STAGING isn't even a "screen" — it's a *moment* where two progress bars are filling while the system waits for a specific physical sequence.

**Practice**: Before you build any component, write out its state machine. If you can't enumerate every state and every transition, you don't understand the interaction yet.

```
Ask yourself:
- What states can this be in?
- What transitions exist between them?
- What INPUTS are valid in each state?
- What inputs are INVALID in each state (and what happens)?
- What does the user SEE in each state?
```

---

## Mental Model 2: "What Happens When the Wrong Thing Happens?"

**The shortcut**: You build for the happy path. User clicks the button, the thing happens, done.

**The reframe**: For every input, there are three possible outcomes:

1. **Valid and executed** — the normal case
2. **Invalid and rejected** — the input doesn't make sense right now
3. **Valid but conditional** — the input makes sense but preconditions aren't met

Most agents only build for #1. Good interfaces are defined by how they handle #2 and #3.

**The Ferrari example**: The frunk release button does *nothing* at speed. It doesn't show an error modal. It doesn't throw an exception. It doesn't disable itself visually and re-enable later. It simply does nothing. The lift system goes further — if you toggle it on and then accelerate past 40 km/h, it *actively deactivates itself* and lowers the suspension. That's not error handling — that's the system protecting its own invariants.

**Practice**: For every interactive element, fill in this table:

```
┌─────────────────────────────────────────────────────┐
│ Input: [name]                                       │
├──────────────┬──────────────────────────────────────┤
│ When valid   │ What happens                         │
│ When invalid │ What happens (and what does the      │
│              │ user see/feel/hear?)                  │
│ Edge cases   │ What if they spam it? Hold it?       │
│              │ Do it during a transition?            │
└──────────────┴──────────────────────────────────────┘
```

The rule: **the system never enters an error state, never shows a modal the user must dismiss at a critical moment, and never requires the user to "fix" something before continuing.** Invalid inputs are absorbed silently or acknowledged with a brief, non-blocking signal.

---

## Mental Model 3: "Inputs Are Richer Than You Think"

**The shortcut**: A button has one event: `onClick`. A slider has one value: its position. Done.

**The reframe**: Inputs have **dimensions** you're probably ignoring:

| Dimension | What It Means | Example |
|-----------|--------------|---------|
| **Duration** | How long was it held? | Tap (< 0.5s) = Neutral. Hold (≥ 0.5s) = Drive. |
| **Direction** | Which way was it moved? | Stick forward = Reverse. Stick back = Drive. |
| **Sequence** | What came before? | Paddle pull only means "manual" if currently in Drive. |
| **Timing** | How soon after the last input? | Second paddle pull within 5s resets timeout. After 5s, system reverts. |
| **Combination** | What else is happening simultaneously? | Brake + throttle held together = launch staging. |
| **Absence** | What happens when input STOPS? | Releasing throttle during staging aborts launch entirely. |

**The Ferrari example**: The gear joystick is a single physical control that produces four different outcomes depending on direction × duration. The launch sequence requires two simultaneous sustained inputs (brake + throttle) and the *release* of one of them (brake) is the actual trigger. The chrono's reset only works via long-press AND only from the paused state — the same physical gesture (press red button) means three different things depending on current state and duration.

**Practice**: For every input control, ask:
- Does **duration** matter? (Tap vs. hold)
- Does **direction** matter? (Up/down, left/right, push/pull)
- Does **sequence** matter? (Only valid after X)
- Does **release** matter? (What happens when they let go?)
- Does **combination** matter? (What if they're also doing Y?)

If you default to "it's just a click handler," you've shortcut.

---

## Mental Model 4: "Color Is Data, Not Decoration"

**The shortcut**: You pick a color palette because it looks good. Primary color for buttons, secondary for accents, neutral for backgrounds. You apply it consistently for visual harmony.

**The reframe**: In a dense interface, color is a **data channel**. Every color carries meaning. When something changes color, its *meaning* has changed — not just its appearance.

**The principle**: Define a semantic color map ONCE at the system level, then enforce it everywhere.

```
Yellow = Normal / Active / Standard operation
Green  = Efficiency / Healthy / OK
Red    = Performance / Warning / Limit / Danger
Grey   = Inactive / Disabled / Ghost / Unavailable
```

Now color becomes information the user processes unconsciously:
- The cluster ring is yellow? Normal driving.
- The ring turned red? You're in Sport mode, or approaching a limit.
- The ring turned green? You're in efficiency mode.
- A control is grey? It's not available right now.

**The Ferrari example**: When the E-Manettino rotates from TOUR to PERFO, the entire cluster accent shifts from yellow to red. The user doesn't need to read a label — the *color of everything* tells them the car's character has changed. During launch, the palette overrides to dark + orange. The user feels the escalation before reading a word.

**Practice**: If you find yourself choosing colors for aesthetic reasons inside a component, stop. Go to the system-level palette. Ask: "What does this color *mean* here?" If it doesn't mean anything, it's noise.

---

## Mental Model 5: "Animation Is State Transition Made Visible"

**The shortcut**: You add animations at the end for "polish." Fade in, slide up, bounce. They make things feel smooth.

**The reframe**: Every animation should answer one question: **"What is the system doing right now?"**

If an animation doesn't communicate a state change, remove it. If a state change has no animation, the user experiences a discontinuity — the system teleported between states and they missed it.

Three categories of meaningful animation:

| Type | Purpose | Example |
|------|---------|---------|
| **Transition** | "The system is moving from A to B" | Gear drum scroll: P slides out, R/N flash past, D slides in. The user sees the *sequence* between gears. |
| **Feedback** | "The system received your input" | Toggle produces a brief HUD overlay that fades after 2s. You know the toggle registered. |
| **Coaching** | "The system wants you to do something" | Torque meter indicates optimal moment to upshift. Bar fills encourage you to hold brake + throttle to 100%. |

**The test**: For every animation, ask: "If I removed this, would the user lose information about what the system is doing?" If yes, the animation is essential. If no, it's decoration — consider removing it for clarity.

---

## Mental Model 6: "Modules Are Coupled, Not Independent"

**The shortcut**: You build components in isolation. Each one manages its own state, renders its own UI, handles its own inputs. Clean separation of concerns.

**The reframe**: Clean component boundaries are good engineering. But **the user doesn't experience components — they experience a system.** The feel of a well-designed interface comes from how modules *influence each other*.

Map your couplings explicitly:

```
When [Module A] changes state...
├── [Module B] should visually update because...
├── [Module C] should enable/disable because...
└── [Module D] should override its display because...
```

**The Ferrari example**:
- Rotating the E-Manettino (steering pod) changes the Power Dial (left binnacle), the cluster ring color (center), the copilot power label, the range estimate, and the power cap.
- Entering Reverse (gear selector) triggers the rear camera (cluster overlay).
- Activating Launch (overhead pull) overrides the cluster, shifts the power dial to orange, AND auto-switches the multigraph to a 5-second chrono.
- Speed exceeding 40 km/h auto-deactivates the lift system.

None of these are "the same module." They're couplings across the system. If you built each module independently and never defined these connections, the cockpit would feel like six unrelated screens.

**Practice**: After defining all your modules, add a dedicated "Couplings" section. For each module, ask: "When this changes, what else in the system should react?" If the answer is "nothing," either the module is truly independent (rare) or you haven't thought about it enough (common).

---

## Mental Model 7: "Design the Reducer, Not the Component"

**The shortcut**: You start by building UI components. You figure out the state as you go. You put `useState` inside components and pass callbacks around.

**The reframe**: **Design the state and its transitions first. The UI is a derived view.**

```
State + Event → New State       (this is the hard part)
New State → What the UI shows   (this is the rendering part)
```

If you design the reducer first, you get:
- A complete enumeration of every possible state
- Every valid transition explicitly defined
- Every precondition check centralized (not scattered across click handlers)
- A single source of truth that the UI can never desync from

If you design the components first, you get:
- States discovered ad hoc as you build
- Transitions defined implicitly by whatever the click handler does
- Precondition checks scattered across the codebase (or missing)
- Race conditions between components that each think they own part of the state

**Practice**:

```
1. Define your types (enums, state shape)
2. Define your events (every possible input, named)
3. Write your reducer (every event × every state = what happens?)
4. Define your derived views (state → what the screen shows)
5. NOW build the components that render derived views and dispatch events
```

Step 3 is where most of the interesting design decisions live. That's where you discover: "Wait, what happens if they press Launch while the frunk is open?" The reducer forces you to answer every question.

---

## Mental Model 8: "Freeze the Frame"

**The shortcut**: You think about your UI as flows — the user does this, then this, then this. You build for the sequence.

**The reframe**: Pause the system at any arbitrary moment. Can you answer these questions?

```
1. What is the COMPLETE state of the system right now?
2. What does the screen look like?
3. What inputs are VALID right now?
4. What inputs are INVALID right now?
5. What happens next if the user does nothing?
6. Is there any ambiguity in any of the above?
```

If you can't answer all six clearly, the design has a gap.

**The Ferrari example**: Freeze the system at "Launch STAGING, brake 100%, throttle 87%." What do you see? Both bars on screen, brake full, throttle still climbing. What's valid? Continue holding, release brake (not yet — throttle not at 100%), release throttle (ABORTS to IDLE — not ARMED, full reset). What's invalid? Everything else — frunk, mode changes, gear selection. What happens if they do nothing? The system waits indefinitely in this state. No ambiguity.

**Practice**: Generate 3-5 "snapshot" moments for every complex interaction. For each one, write out the full state and verify all six questions. These snapshots double as test fixtures.

---

## Mental Model 9: "The Hierarchy of Feedback"

**The shortcut**: Input → something visible changes. Done.

**The reframe**: Dense interfaces need **layered feedback** so the user gets confirmation at multiple levels of attention:

| Level | Channel | Attention Required | Example |
|-------|---------|-------------------|---------|
| **Ambient** | Color/theme shift | None (peripheral vision) | Cluster turns red in Sport mode |
| **Glanceable** | Icon, indicator, position change | Brief glance | Gear letter changes in mini-display |
| **Focused** | Numeric, text, graph | Direct reading | Speed number updates, kW readout |
| **Transient** | Brief overlay that fades | Momentary attention | Climate toggle shows "22.0°" for 2s |
| **Physical** | Haptic, motion, resistance | Tactile | Paddle magnetic click, car vibration during staging |

A single input can produce feedback at multiple levels simultaneously. The driver who's staring at the road gets the ambient level. The driver who glances gets the glanceable level. The passenger studying the display gets the focused level.

**Practice**: For each state change, define feedback at a minimum of two levels. If a state change only has feedback at the "focused" level (you have to read text to know it happened), it will feel invisible during real use.

---

## Mental Model 10: "Absence Is a Feature"

**The shortcut**: You add elements to the screen to show information. More info = better. If there's space, fill it.

**The reframe**: In a dense interface, **what you remove is as important as what you display.** The Ferrari cockpit uses OLED black not as an aesthetic choice but as an information-design choice — the black disappears, and only the active, relevant elements exist.

Three forms of deliberate absence:

1. **Suppression during override**: When Launch activates, normal cluster content is suppressed. The driver doesn't need to see the compass right now. Showing it would be noise during a high-stakes moment.

2. **Ghost states instead of hidden states**: The gear drum shows adjacent gears as ghosts (30% opacity) rather than hiding them. The user sees context — they know what's above and below the current selection — without the adjacent gears competing for attention.

3. **Silent rejection instead of error UI**: Invalid inputs produce nothing. No modal, no toast, no red border. The system absorbs invalid input like a wall absorbs a thrown ball. Showing an error for pressing the frunk button at 120 km/h would be more distracting than doing nothing.

**Practice**: For every element on screen, ask: "In what states should this NOT be visible?" If the answer is "it should always be visible," challenge that assumption. During the highest-stakes moment of your interface, what is the *minimum* the user needs to see?

---

## The Process: Applying These Models

When building a dense UI, work in this order:

### Phase 1: Define the System

```
□ What are ALL the modules / controls / displays?
□ Where do they physically / spatially live relative to each other?
□ What are the types? (Enums, state shapes, value ranges)
□ What are ALL the events? (Every possible input, named)
□ What is the complete state object?
```

### Phase 2: Define the Behavior

```
□ For each module: what are its states?
□ For each state: what does the user see?
□ For each state: what inputs are valid?
□ For each valid input: what is the transition?
□ For each invalid input: what happens? (Usually: nothing)
□ For each transition: what animation communicates it?
□ Cross-module: when A changes, what else reacts?
```

### Phase 3: Validate with Snapshots

```
□ Pick 5 representative moments (idle, active, transitioning, error, edge case)
□ For each: write out the complete state
□ For each: describe exactly what every screen shows
□ For each: list valid and invalid inputs
□ Do any snapshots reveal ambiguity? Fix the state machine.
```

### Phase 4: Build

```
□ Implement the reducer / state management first
□ Implement derived view functions (state → display props)
□ Build rendering components that consume derived views
□ Wire events from components to the reducer
□ Test with snapshot states as fixtures
```

---

## The Audit: How to Know You Didn't Shortcut

After building, run through these questions. Every "no" is a gap:

```
States
  □ Can you enumerate every state the system can be in?
  □ Does every state have a defined visual representation?
  □ Are there any "impossible" states your data model allows?

Inputs
  □ Have you defined what EVERY input does in EVERY state?
  □ Have you handled tap vs. hold where duration matters?
  □ Have you handled simultaneous inputs where combination matters?
  □ Have you defined what happens for invalid inputs?

Transitions
  □ Does every state change have visual feedback?
  □ Does the feedback work at multiple attention levels?
  □ Are animations communicating state changes (not just decorating)?

Couplings
  □ Is there a dedicated coupling map between modules?
  □ When Module A changes, does Module B react correctly?
  □ Are precondition checks centralized, not scattered?

Snapshots
  □ Can you freeze the system at any moment and fully describe it?
  □ Are there test fixtures for key moments?
  □ Does any snapshot reveal ambiguity?

Color & Absence
  □ Does every color carry semantic meaning?
  □ Have you defined what gets SUPPRESSED during override states?
  □ Is invalid-input handling silent where appropriate?
```

---

*The Ferrari Luce cockpit has hundreds of controls and displays, but every single one follows these patterns. The thoroughness isn't because it's a Ferrari — it's because dense interfaces that skip these steps feel broken, even if every individual component works. The user doesn't experience components. They experience the system.*
