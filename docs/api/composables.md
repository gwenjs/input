# Composables

All composables must be called inside an active engine context (`defineSystem()`, `engine.run()`, or a plugin lifecycle hook). All throw `GwenPluginNotFoundError` if `@gwenjs/input` is not registered.

## Overview

| Composable | Returns | Description |
|------------|---------|-------------|
| `useInput()` | `InputService` | The global input service. |
| `useAction(ref, playerIndex?)` | `ActionState<T>` | Per-frame state of an action for one player. |
| `usePlayer(index?)` | `PlayerInput` | Per-player input manager by slot index. |
| `useKeyboard()` | `KeyboardDevice` | Raw keyboard state. |
| `useMouse()` | `MouseDevice` | Raw mouse state (position, delta, buttons, wheel). |
| `useGamepad(slot?)` | `GamepadDevice` | Raw gamepad state (all pads). |
| `useTouch()` | `TouchDevice` | Touch points and virtual controls state. |
| `useGyroscope()` | `GyroDevice` | Device orientation and rotation rate. |
| `usePointer()` | `PointerState` | Unified mouse + touch pointer. |
| `useInputRecorder()` | `InputRecorder` | Record input sessions. |
| `useInputPlayback()` | `InputPlayback` | Replay recorded sessions. |
| `forPlayers(count, factory)` | `T[]` | Create one item per player slot. |

---

## useInput

```ts
function useInput(): InputService
```

Returns the shared `InputService`. Use when you need the full service — players array, devices, recorder, playback, or accessibility profiles.

```ts
const input = useInput()
const p2 = input.player(1)
const snapshot = input.recorder.export()
```

---

## useAction

```ts
function useAction<T extends ActionType>(
  ref: ActionRef<T>,
  playerIndex?: number
): ActionState<T>
```

Returns the per-frame state of an action for a given player. The most commonly used composable.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ref` | `ActionRef<T>` | — | The action reference. |
| `playerIndex` | `number` | `0` | Player slot index. |

```ts
const jump = useAction(Jump)       // ButtonActionState for player 0
const move = useAction(Move, 1)    // Axis2DActionState for player 1
```

---

## usePlayer

```ts
function usePlayer(index?: number): PlayerInput
```

Returns the `PlayerInput` for the given slot. Shorthand for `useInput().player(index)`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `index` | `number` | `0` | Player slot (0-based). |

```ts
const p2 = usePlayer(1)
p2.activateContext('vehicle')
```

---

## useKeyboard

```ts
function useKeyboard(): KeyboardDevice
```

Returns the raw `KeyboardDevice`. Prefer `useAction()` for game logic. Use this for escape-hatch access to raw key states.

```ts
const kb = useKeyboard()
if (kb.isJustPressed('Space')) { ... }
```

---

## useMouse

```ts
function useMouse(): MouseDevice
```

Returns the raw `MouseDevice`. Prefer `useAction()` or `usePointer()` for game logic.

```ts
const mouse = useMouse()
console.log(mouse.position.x, mouse.position.y)
console.log(mouse.delta.x, mouse.delta.y)
```

---

## useGamepad

```ts
function useGamepad(slot?: number): GamepadDevice
```

Returns the `GamepadDevice`. Currently all pads share one device instance; pass the pad index to each method.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `slot` | `number` | `0` | Reserved for future per-slot isolation. |

```ts
const gp = useGamepad()
if (gp.isButtonJustPressed(0, 0)) { ... }  // pad 0, button 0
```

---

## useTouch

```ts
function useTouch(): TouchDevice
```

Returns the `TouchDevice` for reading touch points and virtual control state.

```ts
const touch = useTouch()
if (touch.isTouching()) {
  for (const point of touch.points.values()) {
    console.log(point.position, point.phase)
  }
}
```

---

## useGyroscope

```ts
function useGyroscope(): GyroDevice
```

Returns the `GyroDevice`. Check `gyro.isAvailable` before reading orientation values.

```ts
const gyro = useGyroscope()
if (gyro.isAvailable) {
  console.log(gyro.orientation.roll, gyro.orientation.pitch)
}
```

---

## usePointer

```ts
function usePointer(): PointerState
```

Unified pointer state — abstracts mouse and first touch into a single interface. Touch takes priority over mouse when any touch point is active.

**Returns** `PointerState`:

| Field | Type | Description |
|-------|------|-------------|
| `position` | `{ x: number; y: number }` | Canvas-relative pointer position. |
| `delta` | `{ x: number; y: number }` | Movement this frame. |
| `isPressed` | `boolean` | `true` while button / touch is held. |
| `isJustPressed` | `boolean` | `true` on the first frame of a press. |
| `isJustReleased` | `boolean` | `true` on the first frame after release. |
| `type` | `'mouse' \| 'touch'` | Which device is currently active. |

```ts
const pointer = usePointer()
if (pointer.isJustPressed) {
  handleTap(pointer.position)
}
```

---

## useInputRecorder

```ts
function useInputRecorder(): InputRecorder
```

Returns the `InputRecorder` for the active plugin. Shorthand for `useInput().recorder`.

```ts
const recorder = useInputRecorder()
recorder.start()
// … play the scenario …
recorder.stop()
const rec = recorder.export()
```

---

## useInputPlayback

```ts
function useInputPlayback(): InputPlayback
```

Returns the `InputPlayback` for the active plugin. Shorthand for `useInput().playback`.

```ts
const playback = useInputPlayback()
playback.load(myRecording)
playback.play()
```

---

## forPlayers

```ts
function forPlayers<T>(count: number, factory: (playerIndex: number) => T): T[]
```

Creates one item per player by calling `factory(playerIndex)` for each index in `[0, count)`. Useful for registering parameterised systems without duplication.

| Parameter | Type | Description |
|-----------|------|-------------|
| `count` | `number` | Number of players. Should match `InputPlugin({ players: N })`. |
| `factory` | `(playerIndex: number) => T` | Called once per player slot. |

```ts
import { forPlayers } from '@gwenjs/input'

export default defineConfig({
  systems: [
    ...forPlayers(2, (i) => movementSystem(i)),
    ...forPlayers(2, (i) => cameraSystem(i)),
  ],
})
```
