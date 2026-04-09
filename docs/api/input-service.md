# InputService

The global input service — provides access to all `PlayerInput` instances and raw devices.

Retrieved via `useInput()` or `engine.inject('input')`.

```ts
class InputService
```

## Players

### player

```ts
player(index: number): PlayerInput
```

Returns the `PlayerInput` for the given zero-based player slot.

| Parameter | Type | Description |
|-----------|------|-------------|
| `index` | `number` | Zero-based player slot index (0–3). |

**Throws** `RangeError` if `index` is out of bounds.

### players

```ts
get players(): readonly PlayerInput[]
```

All active `PlayerInput` instances. Length matches the `players` count passed to `InputPlugin`.

### action

```ts
action<T extends ActionType>(ref: ActionRef<T>): ActionState<T>
```

Convenience shorthand for `input.player(0).action(ref)`.

## Devices

### keyboard

```ts
get keyboard(): KeyboardDevice
```

The keyboard device instance. See [`Devices — KeyboardDevice`](/guide/devices#keyboarddevice).

### mouse

```ts
get mouse(): MouseDevice
```

The mouse device instance. See [`Devices — MouseDevice`](/guide/devices#mousedevice).

### gamepad

```ts
get gamepad(): GamepadDevice
```

The gamepad device instance. See [`Devices — GamepadDevice`](/guide/devices#gamepaddevice).

### touch

```ts
get touch(): TouchDevice
```

The touch device instance. See [`Devices — TouchDevice`](/guide/devices#touchdevice).

### gyro

```ts
get gyro(): GyroDevice
```

The gyroscope device instance. See [`Devices — GyroDevice`](/guide/devices#gyrodevice).

### virtualControls

```ts
get virtualControls(): VirtualControlsOverlay | undefined
```

The virtual controls overlay instance. Present only when configured via `InputPlugin({ touch: { virtualJoysticks, virtualButtons } })`.

## Recording

### recorder

```ts
get recorder(): InputRecorder
```

The `InputRecorder` instance. Use to start/stop recording and export recordings. See [Recording & Playback](/guide/recording).

### playback

```ts
get playback(): InputPlayback
```

The `InputPlayback` instance. Use to load, play, seek, and stop recorded sessions.

## Motion permission

### requestMotionPermission

```ts
requestMotionPermission(): Promise<'granted' | 'denied' | 'unavailable'>
```

Requests iOS 13+ motion permission for the gyroscope. **Must be called from a user gesture handler** (e.g. a button click). Calling from `onUpdate()` will fail silently on iOS.

On platforms that do not require an explicit permission grant, resolves immediately with `'granted'`. If `DeviceOrientationEvent` is not available, resolves with `'unavailable'`.

```ts
button.onclick = async () => {
  const result = await useInput().requestMotionPermission()
  if (result === 'granted') enableGyroAim()
}
```

## Accessibility profiles

### getAccessibilityProfiles

```ts
getAccessibilityProfiles(): string[]
```

Returns the names of all registered accessibility profiles. Profiles are registered via `InputPlugin({ accessibilityProfiles: { ... } })`. Activate a profile for a player via `player.activateAccessibilityProfile(name)`.

```ts
const profiles = useInput().getAccessibilityProfiles()
// ['one-handed-left', 'one-handed-right', 'high-contrast']
```

## Debug

### debug

```ts
get debug(): InputDebugAPI | null
```

The debug API instance. Returns `null` in production (`import.meta.env.PROD`) or before the plugin finishes setup. Use this to build devtools integrations or debug overlays.

```ts
const debug = useInput().debug
if (debug) {
  debug.onFrame(snap => console.log(snap.players[0].actions))
}
```
