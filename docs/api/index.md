# useInput()

Composable that returns the global `InputService` registered by `InputPlugin`.

```ts
function useInput(): InputService
```

**Must be called inside an active engine context** (`defineSystem()`, `engine.run()`, or a plugin lifecycle hook).

**Throws** `GwenPluginNotFoundError` if `@gwenjs/input` is not registered.

## Example

```ts
import { defineActor } from '@gwenjs/core/actor'
import { useInput } from '@gwenjs/input'
import { Jump } from './actions'

export const PlayerActor = defineActor(PlayerPrefab, () => {
  const input = useInput()

  onUpdate(() => {
    const p1 = input.player(0)
    const jump = p1.action(Jump)

    if (jump.isJustTriggered) applyJumpForce()
  })
})
```

For most per-action reads, prefer `useAction(ref)` directly. Use `useInput()` when you need access to the full `InputService` — for example, to iterate over all players, access raw devices, or manage recording.

## usePlayer

```ts
function usePlayer(index?: number): PlayerInput
```

Shorthand for `useInput().player(index)`. Returns the `PlayerInput` for the given zero-based player slot. Defaults to player 0.

```ts
const p2 = usePlayer(1)
const jump = p2.action(Jump)
```

**Throws**
- `GwenPluginNotFoundError` — if `@gwenjs/input` is not registered.
- `RangeError` — if `index` is out of bounds.
