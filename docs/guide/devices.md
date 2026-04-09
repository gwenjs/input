# Devices

`@gwenjs/input` provides five device classes that track raw hardware state each frame. In most cases you should use `useAction()` rather than reading devices directly — devices are for escape-hatch access and advanced use cases.

Access devices via `InputService`:

```ts
const input = useInput()
input.keyboard   // KeyboardDevice
input.mouse      // MouseDevice
input.gamepad    // GamepadDevice
input.touch      // TouchDevice
input.gyro       // GyroDevice
```

Or use the dedicated composables: `useKeyboard()`, `useMouse()`, `useGamepad()`, `useTouch()`, `useGyroscope()`.

## KeyboardDevice

Tracks per-key state using a 4-state machine: `idle → justPressed → held → justReleased → idle`.

```ts
import { useKeyboard } from '@gwenjs/input'

const kb = useKeyboard()

kb.isJustPressed('Space')   // true on the first frame the key goes down
kb.isPressed('KeyW')        // true while held (justPressed or held)
kb.isHeld('ShiftLeft')      // true after the first frame (excludes justPressed)
kb.isJustReleased('Escape') // true on the first frame after release
kb.getState('KeyA')         // 'idle' | 'justPressed' | 'held' | 'justReleased'
```

Key codes follow the [W3C KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) spec. Use `Keys` constants from `@gwenjs/input/constants` for autocomplete:

```ts
import { Keys } from '@gwenjs/input/constants'
// Keys.Space, Keys.KeyW, Keys.ArrowUp, Keys.ShiftLeft, Keys.Enter, …
```

The keyboard device registers a `blur` listener on `window` and resets all states when the page loses focus, preventing stuck keys.

## MouseDevice

Tracks button states, cursor position, frame delta, and mouse wheel.

```ts
import { useMouse } from '@gwenjs/input'

const mouse = useMouse()

// Position (canvas-relative if a canvas was configured, otherwise screen-space)
mouse.position.x
mouse.position.y
mouse.position.screenX   // always screen-space
mouse.position.screenY

// Frame delta (accumulated movementX/movementY, reset each frame)
mouse.delta.x
mouse.delta.y

// Wheel (accumulated ticks this frame, positive = scroll down)
mouse.wheel

// Button states (0 = left, 1 = middle, 2 = right)
mouse.isButtonJustPressed(0)
mouse.isButtonPressed(0)
mouse.isButtonJustReleased(0)
mouse.getButtonState(0)   // 'idle' | 'justPressed' | 'held' | 'justReleased'
```

## GamepadDevice

Wraps the Web Gamepad API with per-frame snapshotting. `navigator.getGamepads()` is called once per frame; button states are compared between frames for edge detection.

```ts
import { useGamepad } from '@gwenjs/input'

const gp = useGamepad()

// Button states — padIndex = gamepad slot (0–3)
gp.isButtonPressed(0, 0)       // pad 0, button 0 — held
gp.isButtonJustPressed(0, 0)   // rising edge
gp.isButtonJustReleased(0, 0)  // falling edge
gp.getButtonValue(0, 0)        // analog value 0–1 (for triggers)

// Axes — deadzone applied (default 0.15, configurable via InputPlugin({ gamepad: { deadzone } }))
gp.getAxis(0, 0)               // pad 0, axis index 0
gp.getLeftStick(0)             // { x, y } — axes 0 and 1
gp.getRightStick(0)            // { x, y } — axes 2 and 3

// Connection
gp.isConnected(0)
gp.connectedCount()
gp.getConnectedIndices()       // [0, 2] if pads 0 and 2 are connected
```

Use `GamepadButtons` constants for readable button indices:

```ts
import { GamepadButtons, GamepadStick } from '@gwenjs/input/constants'
// GamepadButtons.South (0), .East (1), .West (2), .North (3)
// GamepadButtons.L1, .R1, .L2, .R2, .L3, .R3
// GamepadStick.Left, GamepadStick.Right
```

## TouchDevice

Tracks multi-touch points and virtual on-screen control state.

```ts
import { useTouch } from '@gwenjs/input'

const touch = useTouch()

touch.isTouching()         // true if any touch point is active
touch.points               // Map<number, TouchPoint> — keyed by touch identifier

for (const point of touch.points.values()) {
  point.position            // { x, y } — canvas-relative
  point.deltaPosition       // { x, y } — movement this frame
  point.phase               // 'began' | 'moved' | 'stationary' | 'ended'
}
```

Virtual joysticks and buttons configured in `InputPlugin({ touch: { virtualJoysticks, virtualButtons } })` are automatically mapped to binding sources you can use with `bind()`.

## GyroDevice

Reads device orientation (roll, pitch, yaw) and rotation rate from the `DeviceOrientationEvent` API.

```ts
import { useGyroscope } from '@gwenjs/input'

const gyro = useGyroscope()

// Check availability before reading (becomes true after first DeviceOrientationEvent)
if (gyro.isAvailable) {
  gyro.orientation.roll    // degrees
  gyro.orientation.pitch
  gyro.orientation.yaw
}
```

On iOS 13+, the `DeviceOrientationEvent` API requires an explicit user permission grant. Request it from a user gesture:

```ts
button.onclick = async () => {
  const result = await useInput().requestMotionPermission()
  if (result === 'granted') enableGyroAim()
}
```

See [`InputService.requestMotionPermission()`](/api/input-service#requestmotionpermission) for details.
