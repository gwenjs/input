# @gwenjs/input

Type-safe, composables-first input plugin for the GWEN game engine.

Handles keyboard, mouse, gamepad, touch, and gyroscope input through a unified action system with stackable input contexts, runtime rebinding, processor pipelines, and multi-player support.

---

## Installation

```sh
pnpm add @gwenjs/input
```

```sh
npm install @gwenjs/input
```

---

## Quick Start

### Module system (recommended)

```typescript
// gwen.config.ts
import { defineConfig } from '@gwenjs/app'

export default defineConfig({
  modules: [['@gwenjs/input', { players: 1 }]],
})
```

### Direct usage

```typescript
import { createEngine } from '@gwenjs/core'
import { InputPlugin } from '@gwenjs/input'
import '@gwenjs/input/augment'

const engine = createEngine({ ... })
await engine.use(InputPlugin({ players: 1 }))
```

---

## Defining Actions and Contexts

### `defineInputSchema` — recommended for most games

Co-locates actions and their default bindings in a single declaration. Returns fully-typed `ActionRef<T>` values.

```typescript
import { defineInputSchema, Keys, GamepadButtons, GamepadStick,
         Composite2D, DeadZone, Smooth, Scale, Hold } from '@gwenjs/input'

export const { actions, context: GameplayContext } = defineInputSchema('gameplay', {
  priority: 0,
  actions: {
    Jump:   { type: 'button', bindings: [Keys.Space, GamepadButtons.South] },
    Move:   { type: 'axis2d', bindings: [
      Composite2D({ up: Keys.W, down: Keys.S, left: Keys.A, right: Keys.D }),
      { source: GamepadStick.Left, processors: [DeadZone(0.15), Smooth(0.08)] },
    ]},
    Sprint: { type: 'button', bindings: [
      { source: Keys.ShiftLeft, interactions: [Hold({ holdTime: 0.1 })] },
    ]},
  },
})
```

### `defineAction` + `defineInputContext` — for multi-context action sharing

```typescript
import { defineAction, defineInputContext, bind, Keys, GamepadButtons } from '@gwenjs/input'

const Jump = defineAction('Jump', { type: 'button' })
const Move = defineAction('Move', { type: 'axis2d' })

export const GameplayContext = defineInputContext('gameplay', {
  priority: 0,
  bindings: [
    bind(Jump, Keys.Space),
    bind(Jump, GamepadButtons.South),
  ],
})
```

---

## Reading Actions

```typescript
import { usePlayer, useAction } from '@gwenjs/input'
import { actions } from './input'

// Via composable — player 0 by default
const jump = useAction(actions.Jump)   // ButtonActionState
const move = useAction(actions.Move)   // Axis2DActionState

onUpdate((dt) => {
  if (jump.isJustTriggered) player.jump()
  entity.velocity.x = move.value.x * speed
  entity.velocity.y = move.value.y * speed
})

// Per-player access
const p2 = usePlayer(1)
const p2Jump = p2.action(actions.Jump)
```

---

## Multi-Player

```typescript
import { forPlayers, usePlayer } from '@gwenjs/input'

// Create one system instance per player
defineConfig({
  systems: [...forPlayers(2, movementSystem)],
})

function movementSystem(playerIndex: number) {
  return defineSystem(() => {
    const player = usePlayer(playerIndex)
    const move = player.action(actions.Move)
    // ...
  })
}
```

---

## Processors

Applied in order to raw input values:

| Processor | Description |
|---|---|
| `DeadZone(threshold)` | Set to 0 if \|value\| < threshold |
| `Scale(factor)` | Multiply by factor |
| `Invert()` | Multiply by −1 |
| `InvertX()` / `InvertY()` | Invert single axis (axis2d only) |
| `Clamp(min, max)` | Clamp to range |
| `Normalize()` | Normalise axis2d to unit vector |
| `Smooth(factor)` | Lerp toward target per frame |
| `SwizzleXY()` | Swap x and y |

---

## Interactions

Applied to button bindings to control when `isJustTriggered` fires:

| Interaction | Description |
|---|---|
| `Press()` | Default — fires on first down frame |
| `Release()` | Fires on release frame |
| `Tap({ maxDuration? })` | Press + release within maxDuration |
| `Hold({ holdTime })` | Held for holdTime seconds |
| `DoubleTap({ maxGap? })` | Two taps within maxGap |
| `AllOf(...keys)` | All specified keys held simultaneously |
| `ChordedWith(actionRef, condition)` | Only fires if action is in given state |
| `Toggle()` | Press once = on, press again = off |
| `Repeat({ initialDelay?, rate })` | Auto-repeat while held |

---

## Rebinding

```typescript
const p1 = usePlayer(0)

// Interactive — resolves with the next input received
const source = await p1.captureNextInput({ timeout: 5000 })
if (source !== null) p1.rebind(actions.Jump, 0, source)

// Programmatic
p1.rebind(actions.Jump, 0, 'Enter')
p1.resetBinding(actions.Jump, 0)
p1.resetBindings()

// Serialise / restore
const snapshot = p1.exportBindings()
localStorage.setItem('bindings', JSON.stringify(snapshot))
p1.importBindings(JSON.parse(localStorage.getItem('bindings')!))
```

---

## Accessibility

```typescript
import { builtInProfiles } from '@gwenjs/input'

// Register profiles
InputPlugin({
  accessibilityProfiles: {
    'one-handed-left': builtInProfiles.oneHandedLeft,
    'custom': myCustomProfile,
  }
})

// Activate from settings UI
const input = useInput()
input.player(0).activateAccessibilityProfile('one-handed-left')

// List available profiles
input.getAccessibilityProfiles()  // ['one-handed-left', 'custom']

// Get remappable actions for UI
input.player(0).getRemappableActions()
// [{ name: 'Jump', type: 'button', bindings: [{ index: 0, displayName: 'Space', isOverridden: false }] }]
```

---

## Raw Device Access

Escape hatches for direct device reading without the action system:

```typescript
import { useKeyboard, useMouse, useGamepad, useTouch, useGyroscope, usePointer } from '@gwenjs/input'

const kb   = useKeyboard()
const mouse = useMouse()
const pad  = useGamepad(0)    // slot 0
const touch = useTouch()
const gyro = useGyroscope()
const ptr  = usePointer()     // unified mouse + touch

// Pointer state
ptr.position   // { x, y } canvas-relative
ptr.isPressed
ptr.type       // 'mouse' | 'touch'
ptr.delta      // { x, y } movement this frame

// Gyroscope
gyro.orientation    // { roll, pitch, yaw } in degrees
gyro.rotationRate   // { alpha, beta, gamma } in deg/s
gyro.acceleration   // { x, y, z } in m/s²
gyro.isAvailable
gyro.isPermitted
gyro.calibrate()           // set current orientation as zero
gyro.resetCalibration()
```

### iOS gyro permission

```typescript
button.onclick = async () => {
  const result = await useInput().requestMotionPermission()
  // 'granted' | 'denied' | 'unavailable'
}
```

---

## Input Recording / Playback

```typescript
const recorder = useInputRecorder()
const playback = useInputPlayback()

recorder.start()
// ... run scenario ...
recorder.stop()
const rec = recorder.export()

// Playback
playback.load(rec)
playback.play()
playback.loop = true       // loop for demo screens
playback.speed = 0.5       // half speed
playback.onComplete(() => backToMenu())
```

---

## Sub-path Exports

| Path | Contents |
|---|---|
| `@gwenjs/input` | Full public API |
| `@gwenjs/input/module` | Build-time module definition |
| `@gwenjs/input/processors` | Processor functions only |
| `@gwenjs/input/interactions` | Interaction functions only |
| `@gwenjs/input/constants` | `Keys`, `GamepadButtons`, `GamepadStick`, etc. |
| `@gwenjs/input/devices` | Device classes (`KeyboardDevice`, etc.) |
| `@gwenjs/input/augment` | Side-effect: extends `GwenProvides` types |

---

## Plugin Configuration

```typescript
InputPlugin({
  players: 2,
  contexts: [GameplayContext, MenuContext],
  defaultActiveContexts: ['gameplay'],
  canvas: document.getElementById('game') as HTMLCanvasElement,
  touch: {
    enabled: true,
    virtualJoysticks: [{ id: 'move-stick', side: 'left', size: 120 }],
    virtualButtons:   [{ id: 'jump-btn', label: '↑', position: { x: 80, y: 85 } }],
  },
  gyro: { smoothing: 0.1, deadZone: 0.02 },
  devOverlay: { position: 'bottom-right', opacity: 0.85 },
  onBindingsChanged(playerIndex, snapshot) {
    localStorage.setItem(`bindings-p${playerIndex}`, JSON.stringify(snapshot))
  },
  initialBindings: [
    JSON.parse(localStorage.getItem('bindings-p0') ?? 'null'),
  ],
})
```

---

## License

[MPL-2.0](https://www.mozilla.org/en-US/MPL/2.0/)
