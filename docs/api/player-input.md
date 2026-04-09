# PlayerInput

Per-player input state manager. Manages a context stack, device assignment, per-frame action evaluation, runtime rebinding, and binding snapshot import/export.

Obtained via `usePlayer(index)` or `useInput().player(index)`.

```ts
class PlayerInput {
  readonly index: number   // zero-based player slot
}
```

## Context management

### activateContext

```ts
activateContext(name: string): void
```

Activates a registered input context by name.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Context name as defined in `defineInputContext()`. |

**Throws** `Error` if the context was never registered.

```ts
player.activateContext('gameplay')
player.activateContext('ui-pause-menu')
```

### deactivateContext

```ts
deactivateContext(name: string): void
```

Deactivates an input context by name. No-op if not currently active.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Context name to deactivate. |

### registerContext

```ts
registerContext(def: InputContextDef): void
```

Registers a context definition at runtime (i.e. after plugin setup).

| Parameter | Type | Description |
|-----------|------|-------------|
| `def` | `InputContextDef` | Created by `defineInputContext()` or `defineInputSchema()`. |

### getActiveContexts

```ts
getActiveContexts(): string[]
```

Returns the names of all currently active contexts for this player, sorted by descending priority.

## Reading actions

### action

```ts
action<T extends ActionType>(ref: ActionRef<T>): ActionState<T>
```

Returns the current per-frame state of an action for this player.

| Parameter | Type | Description |
|-----------|------|-------------|
| `ref` | `ActionRef<T>` | The action reference from `defineAction()` or `defineInputSchema()`. |

```ts
const jump = player.action(Jump)   // ButtonActionState
const move = player.action(Move)   // Axis2DActionState

jump.isPressed         // true while held
jump.isJustTriggered   // first frame activated
jump.isJustReleased    // first frame released
jump.holdTime          // seconds held

move.value             // { x, y } processed
move.rawValue          // { x, y } before processors
move.magnitude         // Euclidean length
```

## Runtime rebinding

### rebind

```ts
rebind(action: ActionRef<ActionType>, bindingIndex: number, newSource: BindingSource): void
```

Replaces a specific binding for this player. Does not affect other players.

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | `ActionRef<ActionType>` | The action to rebind. |
| `bindingIndex` | `number` | Zero-based index into the binding list for this action. |
| `newSource` | `BindingSource` | The new input source. |

```ts
// Remap Jump binding 0 from Space to KeyZ for this player
player.rebind(Jump, 0, Keys.KeyZ)
```

### resetBindings

```ts
resetBindings(): void
```

Clears all per-player binding overrides, restoring context defaults.

### captureNextInput

```ts
captureNextInput(options?: { timeoutMs?: number }): Promise<BindingSource | null>
```

Waits for the next physical input event and returns it as a `BindingSource`. Returns `null` on timeout.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.timeoutMs` | `number` | Milliseconds to wait before resolving `null`. Default: `5000`. |

Use this to implement a "press a key to rebind" UI:

```ts
const source = await player.captureNextInput({ timeoutMs: 5000 })
if (source) player.rebind(Jump, 0, source)
```

## Binding import/export

### exportBindings

```ts
exportBindings(): BindingsSnapshot
```

Returns a serializable snapshot of all per-player binding overrides.

### importBindings

```ts
importBindings(snapshot: BindingsSnapshot): void
```

Restores bindings from a previously exported snapshot.

| Parameter | Type | Description |
|-----------|------|-------------|
| `snapshot` | `BindingsSnapshot` | Snapshot from `exportBindings()`. |

### getBinding

```ts
getBinding(action: ActionRef<ActionType>, bindingIndex: number): BindingSource
```

Returns the effective source for a given binding (override or default).

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | `ActionRef<ActionType>` | The action to inspect. |
| `bindingIndex` | `number` | Zero-based binding index. |

## Accessibility

### activateAccessibilityProfile

```ts
activateAccessibilityProfile(name: string): void
```

Applies a named accessibility profile (a `BindingsSnapshot` preset registered via `InputPlugin({ accessibilityProfiles: {...} })`).

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Profile name as registered in plugin config. |

### getRemappableActions

```ts
getRemappableActions(): RemappableAction[]
```

Returns a list of all remappable actions with their current effective bindings. Useful for building a rebinding UI.

Each `RemappableAction` has:
- `name: string` — human-readable action name
- `type: ActionType` — `'button'` | `'axis1d'` | `'axis2d'`
- `bindings: Array<{ index, source, displayName, isOverridden }>`
