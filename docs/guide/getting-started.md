# Getting Started

## Installation

```bash
pnpm add @gwenjs/input
```

## Module registration

Add the module in `gwen.config.ts`:

```ts
// gwen.config.ts
import { defineConfig } from '@gwenjs/core'

export default defineConfig({
  modules: [
    ['@gwenjs/input', {
      players: 1,
    }],
  ],
})
```

All composables (`useInput`, `useAction`, `defineAction`, etc.) are auto-imported when you use the module system.

## Manual plugin registration

If you are not using the module system, register the plugin directly:

```ts
import { createEngine } from '@gwenjs/core'
import { InputPlugin } from '@gwenjs/input'

const engine = await createEngine()
await engine.use(InputPlugin({
  players: 1,
}))
engine.start()
```

## First action

Define an action with `defineAction`, bind it to an input source with `bind`, and group it into an input context with `defineInputContext`:

```ts
// actions.ts
import { defineAction, defineInputContext, bind } from '@gwenjs/input'
import { Keys, GamepadButtons } from '@gwenjs/input/constants'

export const Jump = defineAction('Jump', { type: 'button' })
export const Move = defineAction('Move', { type: 'axis2d' })

export const GameplayContext = defineInputContext('gameplay', {
  priority: 0,
  bindings: [
    bind(Jump, Keys.Space),
    bind(Jump, GamepadButtons.South),
    bind(Move, Composite2D({ up: Keys.W, down: Keys.S, left: Keys.A, right: Keys.D })),
  ],
})
```

Register the context with the plugin:

```ts
// gwen.config.ts
import { GameplayContext } from './actions'

export default defineConfig({
  modules: [
    ['@gwenjs/input', {
      contexts: [GameplayContext],
      defaultActiveContexts: ['gameplay'],
    }],
  ],
})
```

## Reading input

Call `useAction()` inside `defineActor()` or `defineSystem()`:

```ts
import { defineActor } from '@gwenjs/core/actor'
import { useAction } from '@gwenjs/input'
import { Jump, Move } from './actions'

export const PlayerActor = defineActor(PlayerPrefab, () => {
  onUpdate(() => {
    const jump = useAction(Jump)
    const move = useAction(Move)

    if (jump.isJustTriggered) {
      applyJumpForce()
    }

    movePlayer(move.value.x, move.value.y)
  })
})
```

Or use `defineInputSchema` to co-locate actions with their bindings:

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

// actions.Jump : ActionRef<'button'>
// actions.Move : ActionRef<'axis2d'>
```
