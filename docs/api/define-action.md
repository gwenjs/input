# defineAction / bind

Core functions for declaring type-safe actions and binding them to physical input sources.

## defineAction

```ts
function defineAction<T extends ActionType>(
  name: string,
  config: { type: T }
): ActionRef<T>
```

Creates a typed action reference with a stable unique symbol identity.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Human-readable name. Used in serialization and debug output. Must be unique within the game. |
| `config.type` | `ActionType` | Action value type: `'button'`, `'axis1d'`, or `'axis2d'`. |

**Returns** `ActionRef<T>` — an object with a unique `id` symbol, a `name` string, and the literal `type`.

```ts
import { defineAction } from '@gwenjs/input'

export const Jump    = defineAction('Jump',    { type: 'button' })
export const Throttle = defineAction('Throttle', { type: 'axis1d' })
export const Move    = defineAction('Move',    { type: 'axis2d' })
```

### ActionType

| Value | State type | Description |
|-------|------------|-------------|
| `'button'` | `ButtonActionState` | Digital on/off. Jump, shoot, confirm. |
| `'axis1d'` | `Axis1DActionState` | Single float in `[-1, 1]`. Throttle, scroll. |
| `'axis2d'` | `Axis2DActionState` | `{ x, y }` in `[-1, 1]`. Movement, aim. |

## bind

```ts
function bind<T extends ActionType>(
  action: ActionRef<T>,
  source: BindingSource,
  options?: BindingOptions
): BindingEntry
```

Creates a binding entry linking an action to a raw input source.

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | `ActionRef<T>` | The action to bind. |
| `source` | `BindingSource` | The input source (key code, button index, composite, etc.). |
| `options.processors` | `ProcessorDescriptor[]` | Transform the raw value. Applied in order. |
| `options.interactions` | `InteractionDescriptor[]` | Control `isJustTriggered` / `isJustReleased` semantics. |

```ts
import { bind } from '@gwenjs/input'
import { Keys, GamepadButtons, GamepadStick } from '@gwenjs/input/constants'
import { DeadZone, Smooth, Scale, Invert } from '@gwenjs/input/processors'
import { Hold, Tap, DoubleTap, Toggle, Repeat } from '@gwenjs/input/interactions'

bind(Jump, Keys.Space)
bind(Jump, GamepadButtons.South)
bind(Move, GamepadStick.Left, { processors: [DeadZone(0.15), Smooth(0.08)] })
bind(Sprint, Keys.ShiftLeft,  { interactions: [Hold({ holdTime: 0.1 })] })
bind(Fire, Keys.KeyF,          { interactions: [Repeat({ interval: 0.1 })] })
```

### BindingOptions

| Field | Type | Description |
|-------|------|-------------|
| `processors` | `ProcessorDescriptor[]` | Value transformers applied in order before the action state is written. |
| `interactions` | `InteractionDescriptor[]` | Gate the trigger semantics. Only one interaction can be active per binding at a time. |

### Built-in processors

| Processor | Description |
|-----------|-------------|
| `DeadZone(threshold)` | Returns 0 when `|value| ≤ threshold`. Default: `0.15`. |
| `Scale(factor)` | Multiplies the value by `factor`. |
| `Invert()` | Negates the value. |
| `Clamp(min, max)` | Clamps to `[min, max]`. |
| `Normalize()` | Maps magnitude to `[0, 1]` for 2D vectors. |
| `Smooth(speed)` | Lerps towards the target each frame. `speed` in `[0, 1]`. |
| `Swizzle(x, y)` | Reorders or mirrors axes of a 2D value. |

### Built-in interactions

| Interaction | Description |
|-------------|-------------|
| `Hold({ holdTime })` | Triggers only after the source has been held for `holdTime` seconds. |
| `Tap({ tapTime })` | Triggers only on quick taps (released within `tapTime` seconds). |
| `DoubleTap({ maxInterval })` | Triggers on two rapid presses within `maxInterval`. |
| `Toggle()` | Alternates `isPressed` between `true` and `false` on each press. |
| `Repeat({ interval })` | Re-triggers at `interval` seconds while held. |
| `Press()` | Default: triggers on press (isJustTriggered on rising edge). |
| `Release()` | Triggers on release instead of press. |
| `ChordedWith(otherSource)` | Only triggers when `otherSource` is also held. |

## defineInputContext

```ts
function defineInputContext(name: string, config: InputContextConfig): InputContextDef
```

Defines a named, prioritized set of action bindings.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Unique context name. Used with `player.activateContext(name)`. |
| `config.priority` | `number` | Higher values take precedence. Typical: gameplay = 0, menu = 10. |
| `config.bindings` | `BindingEntry[]` | Binding entries created with `bind()`. |

```ts
import { defineInputContext, bind } from '@gwenjs/input'

export const GameplayContext = defineInputContext('gameplay', {
  priority: 0,
  bindings: [
    bind(Jump, Keys.Space),
    bind(Jump, GamepadButtons.South),
  ],
})
```

## defineInputSchema

```ts
function defineInputSchema<const S extends ActionSchemaMap>(
  name: string,
  config: { priority: number; actions: S }
): { actions: RefsFromSchema<S>; context: InputContextDef }
```

Co-locates action definitions with their default bindings. This is the recommended pattern for most games — it reduces boilerplate and preserves the `ActionRef<T>` literal type through TypeScript const generic inference.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Context name. |
| `config.priority` | `number` | Context priority. |
| `config.actions` | `ActionSchemaMap` | Record of `{ type, bindings[] }` per action key. |

```ts
import { defineInputSchema, Composite2D } from '@gwenjs/input'
import { Keys, GamepadButtons, GamepadStick } from '@gwenjs/input/constants'

export const { actions, context: GameplayContext } = defineInputSchema('gameplay', {
  priority: 0,
  actions: {
    Jump: { type: 'button', bindings: [Keys.Space, GamepadButtons.South] },
    Move: {
      type: 'axis2d',
      bindings: [
        Composite2D({ up: Keys.W, down: Keys.S, left: Keys.A, right: Keys.D }),
        GamepadStick.Left,
      ],
    },
  },
})

// actions.Jump : ActionRef<'button'>  ✅  full TypeScript inference
// actions.Move : ActionRef<'axis2d'>  ✅
```

**Important:** The `type` field must be an inline string literal. Assigning it from a variable typed as `ActionType` loses the literal and degrades inference to `ActionRef<ActionType>`.
