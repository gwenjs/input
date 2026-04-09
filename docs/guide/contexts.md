# Input Contexts

Input contexts let you switch the active set of bindings at runtime without modifying systems. A gameplay context, a pause-menu context, and a cutscene context can all be registered at once — only the active ones are evaluated each frame.

## defineInputContext

```ts
function defineInputContext(name: string, config: InputContextConfig): InputContextDef
```

Defines a named, prioritized set of action bindings.

```ts
import { defineInputContext, bind } from '@gwenjs/input'
import { Jump, Move, Confirm, Back } from './actions'
import { Keys, GamepadButtons } from '@gwenjs/input/constants'

export const GameplayContext = defineInputContext('gameplay', {
  priority: 0,
  bindings: [
    bind(Jump, Keys.Space),
    bind(Jump, GamepadButtons.South),
  ],
})

export const MenuContext = defineInputContext('menu', {
  priority: 10,  // higher priority — overrides gameplay
  bindings: [
    bind(Confirm, Keys.Enter),
    bind(Back, Keys.Escape),
  ],
})
```

### InputContextConfig

| Field | Type | Description |
|-------|------|-------------|
| `priority` | `number` | Higher values take precedence. Typical: gameplay = 0, in-vehicle = 1, menu = 10, cutscene = 20. |
| `bindings` | `BindingEntry[]` | All bindings for this context, created with `bind()`. |

## Activating and deactivating contexts

Use `activateContext` and `deactivateContext` on a `PlayerInput` instance:

```ts
import { usePlayer } from '@gwenjs/input'

const player = usePlayer(0)

// When entering the pause menu
player.activateContext('menu')

// When leaving the pause menu
player.deactivateContext('menu')
```

## Context priority stacking

Multiple contexts can be active simultaneously. When the same action is bound in multiple active contexts, the context with the highest `priority` wins. On ties, the most recently activated context wins.

```
Active contexts:        gameplay (0)   vehicle (1)   menu (10)
                        ──────────────────────────────────────
Evaluated first: ────────────────────────────────▶  menu (10)
If not consumed: ───────────────────────▶  vehicle (1)
Fallback: ──────────────▶  gameplay (0)
```

This means a menu context can override gameplay inputs without you needing to deactivate the gameplay context. When the menu is dismissed, deactivate the menu context and gameplay bindings are automatically restored.

## Registering contexts

Contexts are registered globally via the plugin config, or per-player at runtime.

### Via plugin config (recommended)

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    ['@gwenjs/input', {
      contexts: [GameplayContext, MenuContext, CutsceneContext],
      defaultActiveContexts: ['gameplay'],
    }],
  ],
})
```

`defaultActiveContexts` lists which contexts are active from frame 1. If omitted, all registered contexts are active by default.

### At runtime per player

```ts
// Register a context that wasn't in the plugin config
player.registerContext(VehicleContext)
player.activateContext('vehicle')
```

## defineInputSchema for multi-context schemas

When you want to define actions alongside their context, use `defineInputSchema`. This is the recommended pattern for most games:

```ts
import { defineInputSchema, Composite2D } from '@gwenjs/input'
import { Keys, GamepadButtons, GamepadStick } from '@gwenjs/input/constants'

// One schema per game state
export const { actions: GameActions, context: GameplayContext } =
  defineInputSchema('gameplay', {
    priority: 0,
    actions: {
      Jump: { type: 'button', bindings: [Keys.Space, GamepadButtons.South] },
      Move: { type: 'axis2d', bindings: [
        Composite2D({ up: Keys.W, down: Keys.S, left: Keys.A, right: Keys.D }),
        GamepadStick.Left,
      ]},
    },
  })

export const { actions: MenuActions, context: MenuContext } =
  defineInputSchema('menu', {
    priority: 10,
    actions: {
      Confirm: { type: 'button', bindings: [Keys.Enter, GamepadButtons.South] },
      Back:    { type: 'button', bindings: [Keys.Escape, GamepadButtons.East] },
    },
  })
```

Register both contexts with the plugin and activate them as needed.
