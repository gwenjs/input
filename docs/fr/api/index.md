# useInput()

Composable qui retourne l'`InputService` global enregistré par `InputPlugin`.

```ts
function useInput(): InputService
```

**Doit être appelé dans un contexte moteur actif** (`defineSystem()`, `engine.run()`, ou un hook de cycle de vie de plugin).

**Lève** `GwenPluginNotFoundError` si `@gwenjs/input` n'est pas enregistré.

## Exemple

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

Pour la plupart des lectures d'actions, préférez `useAction(ref)` directement. Utilisez `useInput()` lorsque vous avez besoin de l'`InputService` complet — pour itérer sur tous les joueurs, accéder aux périphériques bruts, ou gérer l'enregistrement.

## usePlayer

```ts
function usePlayer(index?: number): PlayerInput
```

Raccourci pour `useInput().player(index)`. Retourne le `PlayerInput` pour le slot de joueur donné (base 0). Par défaut : joueur 0.

```ts
const p2 = usePlayer(1)
const jump = p2.action(Jump)
```

**Lève**
- `GwenPluginNotFoundError` — si `@gwenjs/input` n'est pas enregistré.
- `RangeError` — si `index` est hors bornes.
