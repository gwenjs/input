# Contextes d'entrée

Les contextes d'entrée permettent de changer l'ensemble de bindings actifs à l'exécution sans modifier les systèmes. Un contexte gameplay, un contexte menu de pause et un contexte cinématique peuvent tous être enregistrés simultanément — seuls les contextes actifs sont évalués à chaque frame.

## defineInputContext

```ts
function defineInputContext(name: string, config: InputContextConfig): InputContextDef
```

Définit un ensemble nommé et priorisé de bindings d'actions.

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
  priority: 10,  // priorité plus haute — surpasse le gameplay
  bindings: [
    bind(Confirm, Keys.Enter),
    bind(Back, Keys.Escape),
  ],
})
```

### InputContextConfig

| Champ | Type | Description |
|-------|------|-------------|
| `priority` | `number` | Des valeurs plus élevées ont la précédence. Typique : gameplay = 0, menu = 10. |
| `bindings` | `BindingEntry[]` | Toutes les entrées de binding pour ce contexte, créées avec `bind()`. |

## Activer et désactiver les contextes

Utilisez `activateContext` et `deactivateContext` sur une instance de `PlayerInput` :

```ts
import { usePlayer } from '@gwenjs/input'

const player = usePlayer(0)

// En entrant dans le menu de pause
player.activateContext('menu')

// En quittant le menu de pause
player.deactivateContext('menu')
```

## Empilement par priorité

Plusieurs contextes peuvent être actifs simultanément. Lorsque la même action est liée dans plusieurs contextes actifs, celui avec la plus haute priorité gagne. En cas d'égalité, le contexte activé le plus récemment gagne.

```
Contextes actifs :    gameplay (0)   vehicle (1)   menu (10)
                      ──────────────────────────────────────
Évalué en premier : ────────────────────────────────▶  menu (10)
Si non consommé :   ───────────────────────▶  vehicle (1)
Repli :             ──────────────▶  gameplay (0)
```

Cela signifie qu'un contexte menu peut surpasser les entrées du gameplay sans avoir à désactiver le contexte gameplay. Lorsque le menu est fermé, désactivez le contexte menu et les bindings du gameplay sont automatiquement restaurés.

## Enregistrement des contextes

Les contextes sont enregistrés globalement via la config du plugin, ou par joueur à l'exécution.

### Via la config du plugin (recommandé)

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

`defaultActiveContexts` liste les contextes actifs dès la première frame. Si omis, tous les contextes enregistrés sont actifs par défaut.

### À l'exécution par joueur

```ts
// Enregistrer un contexte absent de la config du plugin
player.registerContext(VehicleContext)
player.activateContext('vehicle')
```

## defineInputSchema pour les schémas multi-contextes

Lorsque vous souhaitez définir des actions avec leur contexte, utilisez `defineInputSchema`. C'est le pattern recommandé pour la plupart des jeux :

```ts
import { defineInputSchema, Composite2D } from '@gwenjs/input'
import { Keys, GamepadButtons, GamepadStick } from '@gwenjs/input/constants'

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

Enregistrez les deux contextes avec le plugin et activez-les selon les besoins.
