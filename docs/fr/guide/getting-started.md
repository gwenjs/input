# Démarrage rapide

## Installation

```bash
pnpm add @gwenjs/input
```

## Enregistrement du module

Ajoutez le module dans `gwen.config.ts` :

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

Tous les composables (`useInput`, `useAction`, `defineAction`, etc.) sont auto-importés lorsque vous utilisez le système de modules.

## Enregistrement manuel du plugin

Si vous n'utilisez pas le système de modules, enregistrez le plugin directement :

```ts
import { createEngine } from '@gwenjs/core'
import { InputPlugin } from '@gwenjs/input'

const engine = await createEngine()
await engine.use(InputPlugin({
  players: 1,
}))
engine.start()
```

## Première action

Définissez une action avec `defineAction`, liez-la à une source d'entrée avec `bind`, et regroupez-la dans un contexte d'entrée avec `defineInputContext` :

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

Enregistrez le contexte avec le plugin :

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

## Lire les entrées

Appelez `useAction()` à l'intérieur de `defineActor()` ou `defineSystem()` :

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

Ou utilisez `defineInputSchema` pour co-localiser actions et bindings :

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
