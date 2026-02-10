# The Ferrari Luce Interface: Complete Technical Reference

---

## 0 — Mental Model: The "Phygital Cockpit"

Before any detail, internalize four design patterns that govern every decision in this system:

1. **Tactile hardware, digital state.** Physical controls are almost always *momentary* — sticks spring back to center, toggles snap to neutral, rotaries click between detents. The controls produce *impulses* (events). State lives in software. The hardware never "holds" a position for the system.

2. **High-contrast digital feedback on OLED black.** Every screen assumes a pure-black background that vanishes into its bezel. Visual elements are sparse, typographically strict, and color-coded by meaning — not decoration.

3. **Strict safety gating.** Actions are validated against preconditions before execution. Invalid inputs are silently ignored or produce a brief warning. The system never errors, never crashes, never enters an ambiguous state.

4. **Layered state machines.** The cockpit runs many concurrent state machines (gear, drive mode, powertrain mode, launch sequence, passenger chrono, etc.) that influence each other through well-defined couplings. No module is truly independent.

A key consequence: **every physical input maps to a named event, every event is validated against the current state, and every valid transition produces multi-modal feedback** (visual change + physical sensation + implied audio).

---

## 1 — Global Design System

### 1.1 Typography

| Role | Name | Style | Usage |
|------|------|-------|-------|
| Heritage Serif | Bodoni-like, high-contrast | ALL CAPS, large weight | Static labels ("Ferrari", "Luce"), gear letters, brand moments |
| Telemetry Mono | Space Mono-like, fixed-width | Tabular numerals, technical | All live data: speed, range, temperature, power, timers, graph axes |

**ASCII strategy:** Heritage = ALL CAPS or bold variants. Telemetry = fixed-width characters, always.

### 1.2 Color Palette

| Name | Hex | Terminal | Semantic Role |
|------|-----|---------|---------------|
| OLED Black | `#000000` | Default | Background — always pure black to merge with bezels |
| Giallo Modena | `#FCD116` | `\033[93m` | Primary active: tachometer arc, Prancing Horse, normal-state highlights |
| Rosso Corsa | `#FF2800` | `\033[91m` | Limit / performance / warning: redline, Sport mode, Launch Control |
| Verde Signal | `#00FF00` | `\033[92m` | Efficiency: Range mode, battery health, regen indicators |
| Grigio | `#666666` | `\033[90m` | Inactive: disabled elements, ghost values, bezels, faded neighbors |

Colors are *semantic, not decorative.* The mode system (Section 5.3) shifts accent colors globally — layout stays constant, palette shifts.

### 1.3 Motion Rules

| Context | Motion Type | Description |
|---------|-------------|-------------|
| Gear changes | Drum scroll | Letters slide through a viewport; intermediate gears pass as ghosts. Never an instant swap. |
| Mode changes | Color migration | Accent color shifts + label updates. Layout is constant. No page transitions. |
| Speed / power | Continuous arc fill | Ring fills/drains smoothly. Regen dips counter-clockwise into a "charge zone." |
| Launch sequence | Dramatic palette override | Screen darkens, orange overlay, checklist appears, white flash (100ms) on launch. |
| Toggle feedback | Transient HUD | Brief on-screen indicator (slider, icon) appears and fades after ~2s. |

### 1.4 Input Semantics

Physical controls produce discrete events with timing metadata:

| Hardware Type | Events Produced | Duration Matters? |
|---------------|----------------|-------------------|
| Momentary stick (gear) | `TAP`, `HOLD` | Yes — tap < 0.5s vs hold ≥ 0.5s changes meaning |
| Spring toggle (climate) | `UP`, `DOWN` | No — each actuation is one step |
| Rotary detent (Manettino) | `ROTATE_CW`, `ROTATE_CCW` | No — each click is one position |
| Paddle (shifter) | `PULL` | No — but triggers a 5s timeout state |
| Button (P, Launch, SOS) | `PRESS`, `LONG_PRESS` | Yes — chrono reset requires 2s hold |

---

## 2 — System Architecture

### 2.1 Component Tree

```
MobileKeyApp
CarWakeSystem
CockpitRoot
├── DriverCluster (3-tunnel layout)
│   ├── LeftTunnel (battery / range)
│   ├── CenterTunnel (speed / power ring)
│   └── RightTunnel (nav / g-force)
├── GearSelectorModule
│   ├── MiniDisplay (drum viewport)
│   └── JoystickInput (momentary + top button)
├── SteeringWheelControls
│   ├── Manettino (left pod — dynamics)
│   ├── EManettino (right pod — powertrain)
│   └── PaddleShifters (column-fixed blades)
├── CenterBridge
│   ├── ComfortConsole (windows / locks / frunk)
│   └── AuxToggles + LaunchRing + SOS
└── CopilotBox
    ├── MainDisplay (telemetry + mode labels + graphs)
    ├── ClimateTogglesRow (5 spring toggles)
    └── RoundSidecar (clock / chrono / compass / g-force)
        ├── YellowButton (mode cycle)
        └── RedButton (action / chrono)
```

### 2.2 State Management Pattern

Use a single authoritative `CarState` object updated through a pure reducer:

```
nextState = reduce(previousState, event, timestamp_ms)
```

All precondition checks (speed lockouts, mode prerequisites, sequence validation) live inside the reducer. UI components are derived views:

```
clusterTheme    = deriveClusterTheme(state)
gearDisplay     = deriveGearDisplay(state)
launchOverlay   = deriveLaunchOverlay(state)
copilotLabels   = deriveCopilotLabels(state)
```

This guarantees that the UI can never desync from safety logic.

### 2.3 Type Definitions

```ts
// Gear supports both automatic and manual-override representations
type Gear = "P" | "R" | "N" | "D" | { kind: "D_MANUAL"; gear: 1|2|3|4|5|6|7|8 };

type DriveMode      = "WET" | "ICE" | "DRY" | "SPORT" | "ESC_OFF";
type PowertrainMode = "RANGE" | "TOUR" | "PERFO";
type HeadlightMode  = "OFF" | "AUTO" | "HIGH";
type FanLevel       = "LO" | "MED" | "HI";
type SeatHeatLevel  = 0 | 1 | 2 | 3;

type LaunchState = "IDLE" | "PRE_ARM" | "ARMED" | "STAGING" | "LAUNCH";
type SidecarMode = "CLOCK" | "CHRONO" | "COMPASS" | "G_FORCE";
type ChronoState = "RESET" | "RUNNING" | "PAUSED";

// Color mapping (mode → accent color)
const MODE_COLORS: Record<DriveMode, string> = {
  WET:     "#00FF00",
  ICE:     "#00FFFF",
  DRY:     "#FCD116",
  SPORT:   "#FF2800",
  ESC_OFF: "#FF0000"
};

const POWER_COLORS: Record<PowertrainMode, string> = {
  RANGE: "#00FF00",
  TOUR:  "#FCD116",
  PERFO: "#FF2800"
};
```

---

## 3 — Cockpit Spatial Map

```
┌────────────────────────── DASHBOARD ──────────────────────────┐
│                                                                │
│  ┌──────────┬────────────────┬──────────┐    ┌──────────────┐ │
│  │  LEFT    │    CENTER      │  RIGHT   │    │  COPILOT BOX │ │
│  │  Battery │  Speed/Power   │  Nav/G   │    │  Square LCD  │ │
│  │  Range   │  Ring Dial     │  Compass │    │  + Graphs    │ │
│  └──────────┴────────────────┴──────────┘    └──────┬───────┘ │
│         DRIVER CLUSTER                              (●)       │
│                                                   Sidecar     │
│                                                   Round LCD   │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  STEERING WHEEL                                                │
│  ├─ Left pod:  Manettino (red rotary, 5 detents)              │
│  ├─ Right pod: E-Manettino (silver rotary, 3 positions)       │
│  └─ Behind:    Paddle blades (+/−), fixed to column           │
│                                                                │
├──────────────────────── CENTER CONSOLE ────────────────────────┤
│                                                                │
│  ┌──────────────┐ ┌───┐                                       │
│  │ Gear Display  │ │ ● │ Joystick (momentary)                 │
│  └──────────────┘ └───┘                                       │
│                                                                │
│  ┌─────┐ ┌─────┐  (●)     (●)                                │
│  │ ╲╱  │ │ ╲╱  │  Frunk   Door                               │
│  └─────┘ └─────┘  Release  Lock                              │
│  Drv Win  Pas Win                                             │
│                                                                │
│  [LIGHTS] [PARK] [LIFT]  ◉ LAUNCH ◉  [ SOS ]                │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

---

## 4 — Canonical State Object

```json
{
  "time_ms": 0,

  "system": {
    "mobile_key_state": "DISCONNECTED",
    "ignition": "OFF"
  },

  "vehicle": {
    "speed_kmh": 0.0,
    "max_speed_kmh": 320,
    "speed_unit": "km/h"
  },

  "drivetrain": {
    "current_gear": "P",
    "drive_mode": "DRY",
    "powertrain_mode": "TOUR",
    "manual_timeout_remaining_ms": 0,
    "gear_animation_state": "IDLE",
    "gear_scroll_progress": 0.0
  },

  "power": {
    "battery_soc_pct": 78,
    "battery_kwh": 62.4,
    "battery_temp_c": 42.0,
    "current_power_kw": 0.0,
    "max_power_available_kw": 500,
    "range_remaining_km": 408,
    "is_regenerating": false,
    "regen_kw": 0.0,
    "regen_level": "STANDARD"
  },

  "launch": {
    "state": "IDLE",
    "checklist": {
      "battery_temp_ok": true,
      "traction_mode_ok": true,
      "power_potential_pct": 100
    },
    "staging": {
      "brake_pressure_pct": 0,
      "throttle_position_pct": 0
    },
    "results": {
      "timer_ms": 0,
      "distance_m": 0,
      "zero_to_100_ms": null
    }
  },

  "climate": {
    "driver_temp_c": 21.0,
    "passenger_temp_c": 21.0,
    "is_synced": false,
    "fan_level": "MED",
    "driver_seat_heat": 0,
    "passenger_seat_heat": 0
  },

  "windows": {
    "driver_pct": 100,
    "passenger_pct": 100,
    "door_ajar": false
  },

  "systems": {
    "is_frunk_open": false,
    "is_lift_active": false,
    "is_park_assist_active": false,
    "headlight_mode": "AUTO",
    "door_lock_state": "LOCKED",
    "sos_triggered": false
  },

  "copilot": {
    "main_display_mode": "TELEMETRY",
    "telemetry_window_s": 30,
    "sidecar_mode": "CLOCK",
    "chrono": {
      "state": "RESET",
      "value_ms": 0
    },
    "compass_heading_deg": 330
  },

  "cluster": {
    "left_mode": "BATTERY",
    "center_mode": "SPEED",
    "right_mode": "NAV",
    "brightness_pct": 80
  }
}
```

**Battery display thresholds** (derived from `battery_soc_pct`):

| SOC Range | Color | Animation |
|-----------|-------|-----------|
| 100% – 30% | Verde Signal | Steady |
| 29% – 15% | Giallo Modena | Steady |
| Below 15% | Rosso Corsa | Blink (0.5s interval) |

---

## 5 — Module Specifications

---

### Module 1: Digital Key (Mobile App Entry)

The root state of the entire system. The interface begins on a smartphone before the car awakens.

**Visual Interface**
- Background: Deep black
- Center element: Ferrari Prancing Horse in silver/chrome
- Animation: Subtle pulse / "breathing" effect on the logo
- Transition: Logo morphs into the car's wake sequence upon authentication

**State Machine**

```
DISCONNECTED
    │
    ├─ [APP_OPEN] ─→ CONNECTING
    │                    │
    │                    ├─ [BIOMETRIC_OK] ─→ AUTHENTICATED
    │                    │                        │
    │                    │                        └─→ Emits CAR_WAKE_REQUESTED
    │                    │                             • Exterior lights illuminate
    │                    │                             • Door handles present
    │                    │                             • Cluster begins boot animation
    │                    │
    │                    └─ [BIOMETRIC_FAIL] ─→ DISCONNECTED
    │
    └─ [APP_CLOSED] ─→ DISCONNECTED
```

---

### Module 2: Gear Selector (Center Console)

Replaces the traditional gear stick with a minimalist sculptural interaction.

**Hardware**
- **The Stick**: Short, glossy black joystick nub. Momentary — always returns to center after actuation.
- **Top Button**: Dedicated PARK selector on top of the stick.
- **Mini Display**: Small high-resolution rectangular screen positioned directly left of the stick.

**Display States**

| State | Content |
|-------|---------|
| Idle / Intro | Prancing Horse on Giallo Modena field |
| Active | Selected gear letter in Heritage Serif, bold, glow |
| Transitioning | Drum scroll animation (see below) |

**The Drum Viewport**

Only one gear letter is fully visible at a time. Adjacent gears appear as ghosts above and below:

```
┌─────────┐
│    N    │  ← Grigio, 30% opacity
│─────────│
│    D    │  ← White, Heritage Serif, bold, glow
│─────────│
│         │
└─────────┘
```

**The Drum Scroll Animation**

Gear changes are *never* an instant label swap. The display scrolls like a mechanical drum:

- **P → D**: 'P' slides upward out of frame. 'R' and 'N' scroll past as ghosts (rapid, ~100ms each). 'D' slides in from below and snaps to center with a slight overshoot-settle.
- Use a **linked-list** data structure: each gear node holds references to `previous` and `next` for smooth bidirectional traversal.
- `scroll_progress` (0.0 → 1.0) drives the animation. Intermediate values render the transitioning letters at proportional vertical offsets.

**Input Mapping**

| Physical Action | Duration | Resulting Gear | Precondition |
|----------------|----------|---------------|--------------|
| Top Button Press | Any | PARK | `speed_kmh == 0` |
| Pull Stick Back | Hold ≥ 0.5s | DRIVE | Brake applied |
| Push Stick Forward | Hold ≥ 0.5s | REVERSE | `speed_kmh == 0`, brake applied |
| Push Stick Forward | Tap < 0.5s | NEUTRAL | Currently in D or R |

**State Machine**

```
PARK (P)
    ├─ [JOYSTICK_BACK_HOLD] ─→ DRIVE (D)
    └─ [JOYSTICK_FWD_HOLD, speed==0] ─→ REVERSE (R)

DRIVE (D)
    ├─ [JOYSTICK_FWD_TAP] ─→ NEUTRAL (N)
    ├─ [GEAR_P_PRESS, speed==0] ─→ PARK (P)
    └─ [PADDLE_UP or PADDLE_DOWN] ─→ DRIVE_MANUAL(n)
                                          │
                                          └─ See Module 8 (Paddle Shifters)

REVERSE (R)
    ├─ [JOYSTICK_FWD_TAP] ─→ NEUTRAL (N)
    ├─ [GEAR_P_PRESS, speed==0] ─→ PARK (P)
    └─ Entering R triggers REAR_CAMERA_REQUESTED event

NEUTRAL (N)
    ├─ [JOYSTICK_BACK_HOLD] ─→ DRIVE (D)
    └─ [GEAR_P_PRESS] ─→ PARK (P)
```

**Safety rules**: Reject `P` and `R` when `speed_kmh > 5`. Ignore the input silently — no error state.

---

### Module 3: Steering Wheel — Manettino (Left Pod)

Controls the vehicle's dynamic stability character.

**Hardware**: Solid red anodized rotary switch. 5 firm detent positions. Each `ROTATE_CW` or `ROTATE_CCW` moves exactly one position.

**States (Clockwise)**

| Position | Name | Stability | Throttle | Accent Color |
|----------|------|-----------|----------|-------------|
| 1 | WET | Maximum TC | Dampened | Verde |
| 2 | ICE | High TC | Dampened | Cyan |
| 3 | DRY | Balanced | Linear | Giallo |
| 4 | SPORT | Reduced TC | Sharp | Rosso |
| 5 | ESC OFF | TC Disabled | Direct | Rosso (persistent warning) |

**Cross-effects**: Changing the Manettino updates the cluster accent color and modifies Launch Control eligibility (Launch requires SPORT or ESC_OFF).

**Feedback**: Dashboard highlight migrates to match the current position. A brief mode label appears on the cluster for ~2s, then fades.

---

### Module 4: Steering Wheel — E-Manettino (Right Pod)

Controls the powertrain's energy strategy.

**Hardware**: Silver rotary knob with center push-button. 3 positions with smooth detents.

**States**

| Position | UI Color | Regen Level | Power Cap | Cooling |
|----------|----------|-------------|-----------|---------|
| RANGE | Verde Signal | High | Limited | Eco |
| TOUR | Giallo Modena | Standard | Standard | Standard |
| PERFO | Rosso Corsa | Low | Maximum kW | Maximum |

**Cross-effects**: Changes `powertrain_mode` in state. This affects:
- Cluster ring color (center tunnel)
- Copilot "POWER: {mode}" label
- `max_power_available_kw` value
- Range estimate calculation

---

### Module 5: Driver Instrument Cluster (3-Tunnel Digital Display)

A fully digital screen mimicking the layout of three analog gauge "tunnels."

**Layout**

```
┌──────────────────┬────────────────────────┬──────────────────┐
│   LEFT TUNNEL    │     CENTER TUNNEL      │   RIGHT TUNNEL   │
│                  │                        │                  │
│  Battery/Range   │     Speed/Power        │   Nav/G-Force    │
│                  │                        │                  │
│     408 km       │       125 km/h         │    Compass/Map   │
│   (Green Arc)    │    (Yellow Ring)       │    (Crosshair)   │
└──────────────────┴────────────────────────┴──────────────────┘
```

#### Center Tunnel — Speed & Power Ring

**Geometry**: A perfect circle centered in the screen.

**The Ring**: No physical needle. A colored sector arc fills the outer ring clockwise from 6 o'clock as speed increases.

```
        . - - - .
     /     120     \      ← Speed: Large, White, Telemetry Mono
    |   ◜███████◝   |     ← Ring fills clockwise proportional to speed
    |     km/h      |     ← Unit: Small, Grigio
     \             /
        ' - - - '
```

**Ring color logic** (derived from current modes):

```ts
function getRingColor(driveMode: DriveMode, powertrainMode: PowertrainMode): string {
  if (driveMode === "SPORT" || driveMode === "ESC_OFF") return ROSSO_CORSA;
  if (powertrainMode === "PERFO") return ROSSO_CORSA;
  if (powertrainMode === "RANGE") return VERDE_SIGNAL;
  return GIALLO_MODENA;
}
```

**Regen visualization**: When `is_regenerating == true`, the arc extends *counter-clockwise* from the current position into a dedicated "charge zone" segment, colored Verde Signal.

**Additional elements**:
- Ghost tick marks at 0 (6 o'clock) and max positions
- Fill percent: `speed_kmh / max_speed_kmh`

#### Left Tunnel — Battery & Efficiency

A vertical bar gauge curved slightly to hug the bezel. Battery icon silhouette "drains" (fills with black from top) as charge drops.

```
[█████████] 100%   ← Verde Signal
[██████   ]  60%   ← Giallo Modena
[██       ]  20%   ← Giallo Modena
[█        ]  10%   ← Rosso Corsa + Blink
```

**Threshold rules** (from Section 4):

| SOC Range | Color | Animation |
|-----------|-------|-----------|
| 100% – 30% | `#00FF00` | Steady |
| 29% – 15% | `#FCD116` | Steady |
| Below 15% | `#FF2800` | Blink at 0.5s interval |

**Numeric display**: Range in km below the bar, Telemetry Mono.

#### Right Tunnel — Navigation / G-Force

Contextual display area. Default shows compass heading or minimap. During active driving, can show a g-force crosshair.

#### Theme Override (Launch Control)

When `launch.state` is ARMED or beyond, the cluster enters a dramatic override:
- Background darkens further
- All text shifts to Rosso Corsa / orange
- Checklist and staging bars overlay the center tunnel
- Normal speed ring is suppressed

---

### Module 6: Co-Pilot Box

A retro-futuristic enclosure mounted on the passenger dashboard. Contains three sub-components: a main rectangular display, a row of climate toggles, and a small round sidecar screen.

#### 6A: Main Rectangular Display

**Layout**

```
┌──────────────────────────────────────────┐
│ MODE: SPORT                              │  ← Drive mode, in MODE_COLORS[mode]
│                                          │
│ 153 km/h                                 │  ← Large white, Telemetry Mono
│                          ┌─────────────┐ │
│ POWER: PERFO | 316 kW   │  ╱╲_╱╲___╱  │ │  ← Speed graph (30s rolling window)
│                          └─────────────┘ │
│                          ┌─────────────┐ │
│                          │ _╱╲_╱╲__╱╲  │ │  ← Power/Regen graph
│                          └─────────────┘ │
└──────────────────────────────────────────┘
```

**Elements**:
- **Top Left**: Current drive mode in its accent color
- **Mid Left**: Current speed, large white Telemetry Mono
- **Bottom Left**: Powertrain mode + live kW consumption
- **Right Column**: Two rolling telemetry graphs
  - Top: Speed vs time (30-second rolling window)
  - Bottom: Power/Regen vs time (positive = discharge, negative = regen)

**Graph specification**:
- X-axis: Time (rolling 30s window, right edge = now)
- Y-axis: Value (km/h or kW)
- Line: Thin, antialiased, colored by current mode accent
- Grid: Subtle at 25% opacity
- New data point pushed every 100ms

#### 6B: Climate Toggle Row

Located directly below the main display. Five heavy metal toggle switches with spring-loaded momentary ON-OFF-ON action — they snap back to center after every actuation.

| # | Function | Up Action | Down Action | On-Screen Feedback |
|---|----------|-----------|-------------|-------------------|
| 1 | Passenger Temp | +0.5°C | −0.5°C | Vertical slider showing `21.0°` |
| 2 | Fan Speed | +1 level | −1 level | Text: `LO` / `MED` / `HI` |
| 3 | Sync | Toggle on/off | Toggle on/off | Lock icon (links passenger to driver settings) |
| 4 | Display Mode | Cycle forward | Cycle backward | Mode label flash |
| 5 | Seat Heat | +1 level (wraps 3→0) | −1 level | Seat icon + heat waves (0–3 bars) |

**UX rule**: Each toggle produces a transient HUD overlay on the main display that fades after ~2 seconds.

#### 6C: Round Sidecar Display

A small circular screen attached to the side of the main box. Two physical buttons control it.

**Buttons**:
- **Yellow (side)**: Cycles mode: CLOCK → CHRONO → COMPASS → G_FORCE → CLOCK
- **Red (top)**: Contextual action (primarily controls chrono)

**Display Modes**

| Mode | Visual | Description |
|------|--------|-------------|
| CLOCK | White face, black hands, red second hand | Analog watch. Second hand sweeps smoothly (no tick). |
| CHRONO | Yellow face, red hand | Stopwatch. Digital readout: `MM:SS.ss` |
| COMPASS | Black face, red N-triangle | Heading in center: `330° NW` |
| G_FORCE | Concentric circle grid | Yellow "marble" dot moves opposite to acceleration vector |

**ASCII Renderings**

```
   CLOCK              CHRONO             COMPASS            G_FORCE
  .------.           .------.           .------.           .------.
 / 12     \         /        \         / 330°   \         /  ○     \
|9   |  3  |       | 02:14.55 |       |   NW     |       |    ●    |
|    |     |       |    ●     |       |   ▲ N    |       |  ○   ○  |
 \  6    /         \        /         \        /         \       /
  '------'          '------'           '------'           '------'
```

**Chrono State Machine**

```
RESET (00:00.00)
    │
    └─ [RED_PRESS] ─→ RUNNING
                          │
                          ├─ [RED_PRESS] ─→ PAUSED
                          │                     │
                          │                     ├─ [RED_PRESS] ─→ RUNNING (resume)
                          │                     │
                          │                     └─ [RED_LONG_PRESS ≥ 2s] ─→ RESET
                          │
                          └─ [YELLOW_PRESS] ─→ Mode cycles, but timer
                                                continues running in background
```

**Critical**: Pressing YELLOW while CHRONO is RUNNING cycles the *display mode* but does NOT stop the timer. The chrono continues counting in state even when not visible. Returning to CHRONO mode reveals the running time.

---

### Module 7: Comfort Console (Center Bridge)

Located on the center console below the gear selector. Contains high-frequency utility controls.

**Hardware Layout**

```
┌─────────────────────────────────────────┐
│  ┌─────┐  ┌─────┐   (●)       (●)      │
│  │ ╲╱  │  │ ╲╱  │   🧳         🔒      │
│  └─────┘  └─────┘                       │
│  Driver    Passenger  Frunk     Door     │
│  Window    Window     Release   Lock     │
└─────────────────────────────────────────┘
```

**Window Toggles**: Two curved rectangular switches with concave surfaces.
- Pull up → Close window (increase `window_pct`)
- Push down → Open window (decrease `window_pct`)

**Window Auto-Drop Logic**:

```ts
function onDoorStateChange(door_ajar: boolean, state: CarState): CarState {
  if (door_ajar) {
    // Drop windows slightly to clear frameless door seal
    return { ...state, windows: {
      ...state.windows,
      driver_pct: Math.min(state.windows.driver_pct, 95),
      door_ajar: true
    }};
  } else {
    // Door closed — restore previous position
    return { ...state, windows: {
      ...state.windows,
      driver_pct: state.windows._saved_driver_pct,
      door_ajar: false
    }};
  }
}
```

**Frunk Release**:

```
FRUNK_CLOSED
    │
    └─ [FRUNK_PRESS] ─→ Check speed
                            │
                            ├─ [speed_kmh > 0] ─→ Ignored (safety lockout)
                            │
                            └─ [speed_kmh == 0] ─→ FRUNK_OPEN
                                                       │
                                                       └─ [Physical close + FRUNK_PRESS] ─→ FRUNK_CLOSED
```

**Door Lock**: Toggles `door_lock_state` between LOCKED and UNLOCKED. Produces a transient lock/unlock icon on the cluster.

---

### Module 8: Paddle Shifters (Manual Override)

Two tall, vertical metallic blades fixed to the steering column. They do **not** rotate with the wheel.

**Hardware**:
- Right Paddle (+): Upshift
- Left Paddle (−): Downshift

**Behavior in DRIVE**:

```
AUTOMATIC (gear displays "D")
    │
    │  Car shifts automatically based on speed/load/mode
    │
    └─ [PADDLE_UP or PADDLE_DOWN] ─→ TEMPORARY_MANUAL
                                          │
                                          │ Gear display changes from "D" to number ("3", "4")
                                          │ Using type: { kind: "D_MANUAL", gear: n }
                                          │ Timer starts: manual_timeout_remaining_ms = 5000
                                          │
                                          ├─ [Any PADDLE within timeout] ─→ Stay in TEMP_MANUAL
                                          │                                   (shift + reset timer)
                                          │
                                          ├─ [Timeout expires + steady throttle] ─→ AUTOMATIC
                                          │     Gear display smoothly transitions back to "D"
                                          │
                                          └─ [MANUAL_MODE_TOGGLE *or* hold both paddles] ─→ PERMANENT_MANUAL
                                                                                                │
                                                                                                │ No auto-upshift
                                                                                                │ Will ride rev limiter
                                                                                                │ Gear display stays numeric
                                                                                                │
                                                                                                └─ [MANUAL_MODE_TOGGLE again] ─→ AUTOMATIC
```

**Display note**: During manual modes, the gear mini-display shows the number in Heritage Serif with the same drum-scroll animation used for letter gears. Shifting from "3" to "4" scrolls the drum upward.

---

### Module 9: Pilot Auxiliary Toggles

Located flanking the Launch Control ring on the center console.

**Layout**:

```
[LIGHTS]  [PARK]  [LIFT]    ◉ LAUNCH ◉    [ SOS ]
  Left of ring                              Right of ring
```

**Toggle Functions**

| Toggle | Icon | States | Behavior |
|--------|------|--------|----------|
| Lights | Headlight beam | OFF → AUTO → HIGH (cycles) | Each press advances one step. AUTO is default after ignition. |
| Park Assist | P + cone | OFF / ON | Activates proximity sensors + 360° camera mosaic |
| Lift | Car + up arrow | OFF / ON | Raises front suspension for speed bumps/ramps |
| SOS | "SOS" text | Momentary | Emergency beacon / call trigger. Requires confirmation in production. |

**Lift System State Machine**:

```
LIFT_INACTIVE
    │
    └─ [LIFT_TOGGLE] ─→ Check speed
                            │
                            ├─ [speed_kmh > 40] ─→ Rejected
                            │                       Brief warning on cluster: "Speed too high"
                            │
                            └─ [speed_kmh ≤ 40] ─→ LIFT_ACTIVE
                                                       │
                                                       │ Cluster shows "Vehicle Raising" animation
                                                       │ Suspension physically raises
                                                       │
                                                       ├─ [speed_kmh > 40] ─→ Auto-lower → LIFT_INACTIVE
                                                       │   (System forces deactivation for safety)
                                                       │
                                                       └─ [LIFT_TOGGLE] ─→ LIFT_INACTIVE
                                                            Suspension lowers
```

---

### Module 10: Launch Control

The most complex state machine in the cockpit. A multi-step gated sequence that unlocks maximum acceleration.

**Hardware Trigger**: A sculptural silver ring labeled "LAUNCH" on the center console.

**Complete State Machine**

```
┌──────────────────────────────────────────────────────────────────┐
│                            IDLE                                   │
│                                                                   │
│  The default state. LAUNCH press is ignored here.                │
│                                                                   │
│  Active when ANY of:                                             │
│    • speed_kmh > 0                                               │
│    • drive_mode ∉ {SPORT, ESC_OFF}                               │
│                                                                   │
│  Display: Standard cluster (no launch overlay)                   │
└──────────────────────────────────────────────────────────────────┘
         │
         │  [speed_kmh == 0 AND drive_mode ∈ {SPORT, ESC_OFF}]
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                          PRE_ARM                                  │
│                                                                   │
│  System is eligible. Waiting for user to press LAUNCH.           │
│  No visual change yet — user may not intend to launch.           │
│                                                                   │
│  Transitions:                                                     │
│    • [LAUNCH_PRESS] → ARMED                                      │
│    • [speed_kmh > 0] → IDLE                                      │
│    • [drive_mode changes to ineligible] → IDLE                   │
└──────────────────────────────────────────────────────────────────┘
         │
         │  [LAUNCH_PRESS]
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                           ARMED                                   │
│                                                                   │
│  Visual Changes:                                                  │
│    • Cluster darkens — standard gauges suppressed                │
│    • All text shifts to Rosso Corsa / orange                     │
│    • Center display shows: "BOOST READY"                         │
│    • Checklist overlay appears:                                   │
│                                                                   │
│    ┌──────────────────────────────────────┐                      │
│    │          BOOST READY                 │                      │
│    │                                      │                      │
│    │  BATTERY TEMP    [OK]  /  [⚠ >80°C] │                      │
│    │  TRACTION MODE   [OK]  /  [⚠ WRONG] │                      │
│    │  POWER POTENTIAL  [100%]             │                      │
│    └──────────────────────────────────────┘                      │
│                                                                   │
│  Transitions:                                                     │
│    • [LAUNCH_PRESS again] → IDLE (user cancels)                  │
│    • [speed_kmh > 0] → IDLE (car moved)                          │
│    • [brake_pressure ≥ threshold] → STAGING                      │
│    • [any checklist item fails] → remain ARMED, show warning     │
└──────────────────────────────────────────────────────────────────┘
         │
         │  [User presses brake firmly — begins two-foot maneuver]
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                          STAGING                                  │
│                                                                   │
│  The "Two-Foot" Maneuver: Hold brake with left foot,            │
│  floor accelerator with right foot.                              │
│                                                                   │
│  Display:                                                         │
│    ┌──────────────────────────────────────┐                      │
│    │          BOOST READY                 │                      │
│    │                                      │                      │
│    │  BRAKE    [████████████████]  100%   │  ← Must reach 100%  │
│    │  THROTTLE [████████████████]  100%   │  ← Must reach 100%  │
│    └──────────────────────────────────────┘                      │
│                                                                   │
│  Physical feedback:                                               │
│    • Car vibrates (torque building against brakes)               │
│    • Rear suspension "hunches" (squats lower)                    │
│    • Power builds at limiter — audible whine                     │
│                                                                   │
│  Transitions:                                                     │
│    • [Throttle released] → IDLE ← STRICT RESET (not back to     │
│                                    ARMED — full abort required)  │
│    • [Brake released while throttle ≥ 100%] → LAUNCH            │
└──────────────────────────────────────────────────────────────────┘
         │
         │  [User releases brake pedal — stored energy unleashes]
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                           LAUNCH                                  │
│                                                                   │
│  Immediate effects:                                               │
│    • Screen flashes WHITE for 100ms                              │
│    • Transitions to "big numbers only" high-contrast mode        │
│    • Brake bar drops to 0% instantly                             │
│                                                                   │
│  Display:                                                         │
│    ┌──────────────────────────────────────┐                      │
│    │          L A U N C H                 │  ← Flashing label   │
│    │                                      │                      │
│    │            0.00 s                    │  ← Timer counting up │
│    │            0 M                       │  ← Distance counting │
│    └──────────────────────────────────────┘                      │
│                                                                   │
│  Active tracking:                                                 │
│    • Elapsed time: counting up in ms, displayed as ss.xx         │
│    • Distance: counting up in meters                             │
│    • 0–100 km/h split: captured automatically when crossed       │
│                                                                   │
│  Transitions:                                                     │
│    • [Throttle released] → IDLE                                  │
│    • [Speed stabilizes / user brakes] → IDLE                    │
│    • Results saved to launch.results before returning to IDLE    │
└──────────────────────────────────────────────────────────────────┘
```

**Critical implementation rules**:
1. The `LaunchController` is a strict step-by-step validator. Releasing throttle during STAGING resets to IDLE — not ARMED. The entire sequence must restart.
2. The checklist is evaluated continuously during ARMED. If battery temp exceeds 80°C mid-arm, the warning appears but the system does not force-exit — the driver decides.
3. LAUNCH results (`timer_ms`, `distance_m`, `zero_to_100_ms`) persist in state after returning to IDLE so they can be displayed on the copilot screen.

---

### Module 11: HUD Overlays (Contextual)

Not a dedicated module but a system of conditional overlays triggered by other modules:

| Triggering Condition | Overlay Content |
|---------------------|-----------------|
| `current_gear == "R"` | Rear camera view with dynamic trajectory lines on cluster |
| `is_park_assist_active` | 360° camera mosaic with proximity-colored zones (green/yellow/red) |
| Navigation active | Turn-by-turn arrows on cluster right tunnel (or projected on windshield) |
| `launch.state ∈ {ARMED, STAGING, LAUNCH}` | Launch overlay suppresses normal cluster — see Module 10 |

---

## 6 — Cross-Module Couplings

These dependencies are where "systems thinking" matters. Building modules in isolation will produce a cockpit that doesn't feel integrated.

### 6.1 Gear ↔ Camera System
Entering REVERSE emits `REAR_CAMERA_REQUESTED`. Even if the camera subsystem isn't implemented, the event hook must exist so the cluster knows to show the overlay.

### 6.2 DriveMode / PowertrainMode ↔ Cluster Theme
`SPORT` / `PERFO` push orange/red accents across the cluster. `RANGE` pushes green efficiency emphasis. The layout never changes — only colors, labels, and threshold emphasis shift. Implement as:
```ts
const theme = deriveClusterTheme(state.drivetrain.drive_mode, state.drivetrain.powertrain_mode);
// theme contains: ringColor, accentColor, emphasisLabels
```

### 6.3 Launch ↔ Everything
Launch overrides the cluster theme, adds its own overlay, suppresses "busy" UI elements. Launch press is silently ignored unless all prerequisites are met. During STAGING and LAUNCH, other non-critical controls (climate, display mode) should still function but their visual feedback is suppressed.

### 6.4 Speed ↔ Safety Lockouts
A single speed check gates multiple systems:
- `speed > 0`: Frunk press ignored, P gear rejected, R gear rejected
- `speed > 5`: Reverse rejected
- `speed > 40`: Lift auto-deactivates or rejects activation

Centralize this in the reducer — don't scatter speed checks across UI components.

### 6.5 Manual Paddles ↔ Gear Display
The gear mini-display must support both `"D"` (automatic) and `{ kind: "D_MANUAL", gear: n }` (manual override) rendering. The drum animation applies to numeric shifts too (scrolling "3" to "4"). The 5-second timeout that reverts to automatic triggers a smooth "4" → "D" drum transition.

### 6.6 Chrono ↔ Sidecar Mode Cycling
The chrono timer runs independently of display mode. Pressing YELLOW to cycle away from CHRONO does not stop the timer. This means `chrono.state` and `chrono.value_ms` must be updated by the reducer's time-tick logic regardless of `sidecar_mode`.

---

## 7 — Complete Event List

Every physical input in the cockpit, named as a dispatchable event:

**Mobile Key**
- `APP_OPEN`, `BIOMETRIC_OK`, `BIOMETRIC_FAIL`, `APP_CLOSED`

**Gear Selector**
- `GEAR_P_PRESS` (top button)
- `JOYSTICK_BACK_TAP`, `JOYSTICK_BACK_HOLD`
- `JOYSTICK_FWD_TAP`, `JOYSTICK_FWD_HOLD`

**Steering Wheel Modes**
- `MANETTINO_CW`, `MANETTINO_CCW`
- `EMANETTINO_CW`, `EMANETTINO_CCW`, `EMANETTINO_PRESS`

**Paddle Shifters**
- `PADDLE_UP`, `PADDLE_DOWN`
- `MANUAL_MODE_TOGGLE` (M button or both-paddle hold)

**Comfort Console**
- `WINDOW_DRIVER_UP`, `WINDOW_DRIVER_DOWN`
- `WINDOW_PASS_UP`, `WINDOW_PASS_DOWN`
- `FRUNK_PRESS`, `LOCK_PRESS`
- `DOOR_AJAR_CHANGED(boolean)`

**Auxiliary Toggles**
- `HEADLIGHT_TOGGLE`, `PARK_ASSIST_TOGGLE`, `LIFT_TOGGLE`, `SOS_PRESS`

**Launch Control**
- `LAUNCH_PRESS`
- `BRAKE_PRESSURE_CHANGED(pct)`, `THROTTLE_CHANGED(pct)`

**Co-Pilot Climate**
- `PASS_TEMP_UP`, `PASS_TEMP_DOWN`
- `FAN_UP`, `FAN_DOWN`
- `SYNC_TOGGLE`
- `DISPLAY_MODE_FWD`, `DISPLAY_MODE_BACK`
- `SEAT_HEAT_UP`, `SEAT_HEAT_DOWN`

**Sidecar**
- `SIDECAR_YELLOW_PRESS`
- `SIDECAR_RED_PRESS`, `SIDECAR_RED_LONG_PRESS`

**System / Continuous**
- `TICK(delta_ms)` — drives chrono counting, manual-override timeout, animation progress
- `SPEED_UPDATED(kmh)` — from vehicle sensors, triggers lockout re-evaluation

---

## 8 — Rendering Contracts

Each display surface has a "must support" contract — the minimum set of visual states an implementation must handle.

### 8.1 Gear Mini-Display

Must render:
- [ ] Idle logo screen (Prancing Horse on Giallo field)
- [ ] Active gear letter (Heritage Serif, white, bold, glow)
- [ ] Drum scroll animation with ghost letters at partial opacity
- [ ] Manual override numbers ("1"–"8") with same drum animation
- [ ] Transition animation between any two valid gear states

### 8.2 Driver Cluster (3-Tunnel)

Must render:
- [ ] Three-tunnel layout simultaneously (never collapses to fewer)
- [ ] Center ring fill proportional to speed, colored by mode
- [ ] Regen counter-fill segment (Verde, counter-clockwise)
- [ ] Left battery bar with color thresholds + blink animation at <15%
- [ ] Right tunnel contextual content (compass/nav/g-force)
- [ ] Full theme recolor when drive_mode or powertrain_mode changes
- [ ] Launch overlay that suppresses normal content during ARMED/STAGING/LAUNCH

### 8.3 Co-Pilot Main Display

Must render:
- [ ] Left text stack: mode label (colored), speed (white, large), power info
- [ ] Right telemetry graphs: two rolling-window line charts
- [ ] Transient HUD overlays for climate toggle feedback (fade after ~2s)
- [ ] Content updates reflecting cross-module state (mode changes, speed changes)

### 8.4 Round Sidecar

Must render:
- [ ] All four modes: CLOCK, CHRONO, COMPASS, G_FORCE
- [ ] Smooth analog clock (no ticking second hand)
- [ ] Chrono with MM:SS.ss precision, correct button behavior
- [ ] Compass with heading degrees and cardinal direction
- [ ] G-force marble that moves opposite to acceleration vector

---

## 9 — Implementation Classes

### GearSelector

```
GearSelector
├── Properties
│   ├── current_gear: Gear
│   ├── gear_sequence: LinkedList<GearNode>  // P ↔ R ↔ N ↔ D
│   ├── animation_state: "IDLE" | "SCROLLING"
│   └── scroll_progress: float (0.0 – 1.0)
├── Methods
│   ├── handleInput(event, duration_ms) → Gear | null
│   ├── transitionTo(target: Gear) → void  // initiates drum animation
│   ├── renderFrame(delta_ms) → DisplayFrame
│   └── getVisibleGears() → { prev: Gear|null, current: Gear, next: Gear|null }
├── Events Emitted
│   └── onGearChanged(old_gear, new_gear)
└── Invariants
    └── Rejects P and R when speed > 0; rejects R when speed > 5
```

### Manettino

```
Manettino
├── Properties
│   ├── position: DriveMode
│   ├── positions: ["WET", "ICE", "DRY", "SPORT", "ESC_OFF"]  // ordered
│   └── color_map: Record<DriveMode, HexColor>
├── Methods
│   ├── rotate(direction: "CW" | "CCW") → DriveMode
│   ├── getActiveColor() → HexColor
│   └── getStabilityMultiplier() → float  // 1.0 for WET → 0.0 for ESC_OFF
├── Events Emitted
│   └── onPositionChanged(old_mode, new_mode)
└── Invariants
    └── Cannot rotate past ends (WET is min, ESC_OFF is max)
```

### EManettino

```
EManettino
├── Properties
│   ├── position: PowertrainMode
│   ├── positions: ["RANGE", "TOUR", "PERFO"]
│   └── color_map: Record<PowertrainMode, HexColor>
├── Methods
│   ├── rotate(direction: "CW" | "CCW") → PowertrainMode
│   ├── getActiveColor() → HexColor
│   └── getMaxPowerKw() → number
├── Events Emitted
│   └── onPositionChanged(old_mode, new_mode)
└── Cross-Effects
    └── Updates range_remaining_km estimate, cluster ring color, copilot power label
```

### PaddleShiftController

```
PaddleShiftController
├── Properties
│   ├── mode: "AUTOMATIC" | "TEMP_MANUAL" | "PERM_MANUAL"
│   ├── current_manual_gear: 1–8 | null
│   └── timeout_remaining_ms: number
├── Methods
│   ├── handlePaddle(direction: "UP" | "DOWN") → Gear
│   ├── handleManualToggle() → void
│   ├── tick(delta_ms) → void  // decrements timeout, reverts if expired
│   └── getCurrentGearDisplay() → Gear
├── Events Emitted
│   └── onShiftModeChanged(old_mode, new_mode)
│   └── onGearNumberChanged(old_n, new_n)
└── Invariants
    └── TEMP_MANUAL reverts to AUTOMATIC after 5s of no paddle input + steady throttle
    └── PERM_MANUAL never auto-reverts — only explicit toggle
```

### LaunchController

```
LaunchController
├── Properties
│   ├── state: LaunchState
│   ├── checklist: { battery_temp_ok, traction_ok, power_pct }
│   ├── staging: { brake_pct, throttle_pct }
│   └── results: { timer_ms, distance_m, zero_to_100_ms }
├── Methods
│   ├── handleLaunchPress() → void
│   ├── updateStaging(brake_pct, throttle_pct) → void
│   ├── tick(delta_ms, current_speed) → void  // updates timer + distance during LAUNCH
│   ├── validatePreconditions(state: CarState) → ChecklistResult
│   └── abort() → void  // forces return to IDLE
├── Events Emitted
│   ├── onStateChanged(old_state, new_state)
│   ├── onChecklistUpdated(checklist)
│   └── onLaunchComplete(results)
└── Invariants
    └── Throttle release during STAGING → reset to IDLE (not ARMED)
    └── LAUNCH_PRESS during ARMED → return to IDLE (cancel)
    └── Any speed > 0 during PRE_ARM or ARMED → return to IDLE
```

### ClusterRenderer

```
ClusterRenderer
├── Properties
│   ├── theme: { ringColor, accentColor, textColor }
│   ├── launch_overlay_active: boolean
│   └── battery_blink_state: boolean
├── Methods
│   ├── deriveTheme(drive_mode, powertrain_mode, launch_state) → Theme
│   ├── renderCenterTunnel(speed, max_speed, is_regen, regen_amount) → void
│   ├── renderLeftTunnel(soc_pct, range_km) → void
│   ├── renderRightTunnel(mode, heading, g_lateral, g_longitudinal) → void
│   └── renderLaunchOverlay(launch_state, checklist, staging, results) → void
├── Tick Behavior
│   └── Battery blink toggles every 500ms when soc < 15%
└── Invariants
    └── Three tunnels always rendered (never collapse)
    └── Launch overlay suppresses normal center content
```

### CopilotBox

```
CopilotBox
├── MainDisplay
│   ├── Properties: mode_label, speed, power_label, power_kw
│   ├── Methods
│   │   ├── render(state) → void
│   │   ├── pushSpeedDataPoint(timestamp, kmh) → void
│   │   └── pushPowerDataPoint(timestamp, kw) → void
│   └── Graph Config: 30s rolling window, 100ms sample rate
├── ClimateRow
│   ├── Methods
│   │   └── handleToggle(toggle_id, direction: "UP"|"DOWN") → StateUpdate
│   └── Transient HUD: each toggle shows overlay for ~2s, then fades
└── Sidecar
    ├── Properties
    │   ├── mode: SidecarMode
    │   ├── chrono_state: ChronoState
    │   ├── chrono_value_ms: number
    │   └── compass_heading: float
    ├── Methods
    │   ├── cycleMode() → void  // YELLOW button
    │   ├── handleAction(duration_ms) → void  // RED button
    │   ├── tick(delta_ms) → void  // increments chrono if RUNNING
    │   └── renderCurrentMode() → void
    └── Invariants
        └── Chrono ticks in background regardless of visible sidecar mode
        └── RED_LONG_PRESS (≥2s) resets chrono ONLY from PAUSED state
```

---

## 10 — Example State Snapshots (Test Fixtures)

### 10.1 Highway Cruising in RANGE Mode

```json
{
  "time_ms": 3847200,
  "vehicle": { "speed_kmh": 112.0 },
  "drivetrain": {
    "current_gear": "D",
    "drive_mode": "DRY",
    "powertrain_mode": "RANGE"
  },
  "power": {
    "battery_soc_pct": 64,
    "current_power_kw": 38.2,
    "range_remaining_km": 312,
    "is_regenerating": false
  },
  "launch": { "state": "IDLE" },
  "copilot": {
    "sidecar_mode": "COMPASS",
    "chrono": { "state": "RESET", "value_ms": 0 }
  }
}
```

Expected cluster: Green-accented ring at ~35% fill. Left tunnel green at 64%. Normal layout, no overlays.

### 10.2 Launch Control — Staging (Ready to Launch)

```json
{
  "time_ms": 812345,
  "vehicle": { "speed_kmh": 0.0 },
  "drivetrain": {
    "current_gear": "D",
    "drive_mode": "SPORT",
    "powertrain_mode": "PERFO"
  },
  "power": {
    "battery_soc_pct": 84,
    "battery_temp_c": 58.5,
    "current_power_kw": 0.0,
    "max_power_available_kw": 500
  },
  "launch": {
    "state": "STAGING",
    "checklist": { "battery_temp_ok": true, "traction_mode_ok": true, "power_potential_pct": 100 },
    "staging": { "brake_pressure_pct": 100, "throttle_position_pct": 100 }
  },
  "copilot": {
    "sidecar_mode": "CHRONO",
    "chrono": { "state": "RUNNING", "value_ms": 14502 }
  }
}
```

Expected cluster: Dark override, orange text, "BOOST READY", both bars at 100%. Car is vibrating, rear squatting. Next action: release brake to launch.

### 10.3 Manual Downshift in Sport Mode

```json
{
  "time_ms": 2100000,
  "vehicle": { "speed_kmh": 87.0 },
  "drivetrain": {
    "current_gear": { "kind": "D_MANUAL", "gear": 3 },
    "drive_mode": "SPORT",
    "powertrain_mode": "TOUR",
    "manual_timeout_remaining_ms": 4200
  },
  "power": {
    "battery_soc_pct": 71,
    "current_power_kw": 185.0,
    "is_regenerating": false
  },
  "launch": { "state": "IDLE" }
}
```

Expected gear display: "3" in Heritage Serif on mini-display. Cluster ring in Rosso accent. Timer counting down — will revert to "D" in 4.2s unless another paddle input.

---

## 11 — Transferable Design Principles

These principles extend beyond the Ferrari Luce to any complex interactive system:

### 11.1 State Machine Discipline
Every control maps to a finite state machine. There are no ambiguous states — the system always knows exactly where it is and what transitions are valid. If you can't draw the state diagram, you don't understand the interaction.

### 11.2 Precondition-First Design
Build validators before actions. The Lift system checks speed before raising. Launch Control validates a checklist before staging. The Frunk button does nothing at speed — it doesn't throw an error, it doesn't show a modal, it simply does nothing.

### 11.3 Temporal Input Handling
Duration matters. A tap on the gear joystick means NEUTRAL; a hold means DRIVE. Input handlers must track press duration and distinguish between `TAP` and `HOLD` as fundamentally different events.

### 11.4 Semantic Color (Not Decorative)
The palette carries meaning everywhere it appears:
- Yellow = Normal / Active / Standard
- Green = Efficiency / OK / Healthy
- Red = Performance / Warning / Limit
- Grey = Inactive / Disabled / Ghost

If a UI element changes color, its *meaning* has changed.

### 11.5 Animation as Communication
The gear drum scroll isn't decorative — it communicates that gears exist in a sequence and that the system is transitioning through intermediate states. Every animation should answer the question: "What is the system doing right now?"

### 11.6 Graceful Rejection
Invalid inputs are silently ignored or produce a brief, non-blocking warning. The system never enters an error state, never shows a modal dialog, never requires the user to "dismiss" something before continuing. Design for the driver who just hit the wrong button at 200 km/h.

### 11.7 Multi-Modal Feedback
Every valid input produces feedback across multiple channels simultaneously:
- **Visual**: Screen updates, color shifts, animations
- **Physical**: Haptic vibration, suspension changes, control resistance
- **Audio**: (Implied) confirmation tones, engine note modulation

No input should feel "silent."

### 11.8 Nested State Machines
Complex interactions emerge from layered state machines. Launch Control has an outer machine (IDLE → ARMED → STAGING → LAUNCH) and inner machines (checklist items, brake/throttle percentages). The reducer handles all layers coherently because they share one state tree.

---

## 12 — Implementation Non-Negotiables

An acceptance checklist. If these behaviors are absent, the implementation does not match the cockpit:

- [ ] **Momentary hardware semantics**: Sticks return to center. Toggles snap back. The UI must not depend on a control "staying" in position.
- [ ] **Drum scroll gear animation**: Gear changes are never instant label swaps. Intermediate gears scroll past as ghosts.
- [ ] **Launch gating with strict reset**: The full IDLE → PRE_ARM → ARMED → STAGING → LAUNCH sequence must be validated step by step. Throttle release during STAGING resets to IDLE, not ARMED.
- [ ] **Manual paddle override with timeout**: Temporary manual reverts to automatic after 5s. Permanent manual requires explicit toggle.
- [ ] **Safety lockouts tied to speed**: Frunk at 0 only. Lift deactivates above 40. P/R gear rejected while moving. Centralized in the reducer.
- [ ] **Theme as mode-derived color, not layout swap**: Changing from TOUR to SPORT recolors accents. It does not change the screen layout.
- [ ] **Sidecar chrono runs in background**: Timer keeps counting when mode is cycled away from CHRONO. Long-press reset only works from PAUSED.
- [ ] **Cross-module event propagation**: Entering R triggers camera overlay. Mode changes propagate to cluster theme AND copilot labels. Launch suppresses cluster. These are not optional integrations.
