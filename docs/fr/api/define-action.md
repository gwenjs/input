# defineAction / bind

Fonctions centrales pour déclarer des actions typées et les lier à des sources d'entrée physiques.

## defineAction

```ts
function defineAction<T extends ActionType>(
  name: string,
  config: { type: T }
): ActionRef<T>
```

Crée une référence d'action typée avec une identité symbole unique stable.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Nom lisible. Utilisé dans la sérialisation et la sortie de debug. Doit être unique dans le jeu. |
| `config.type` | `ActionType` | Type de valeur de l'action : `'button'`, `'axis1d'` ou `'axis2d'`. |

**Retourne** `ActionRef<T>` — un objet avec un symbole `id` unique, une chaîne `name` et le `type` littéral.

```ts
import { defineAction } from '@gwenjs/input'

export const Jump     = defineAction('Jump',     { type: 'button' })
export const Throttle = defineAction('Throttle', { type: 'axis1d' })
export const Move     = defineAction('Move',     { type: 'axis2d' })
```

### ActionType

| Valeur | Type d'état | Description |
|--------|-------------|-------------|
| `'button'` | `ButtonActionState` | Numérique on/off. Sauter, tirer, confirmer. |
| `'axis1d'` | `Axis1DActionState` | Flottant unique dans `[-1, 1]`. Accélérateur, défilement. |
| `'axis2d'` | `Axis2DActionState` | `{ x, y }` dans `[-1, 1]`. Déplacement, visée. |

## bind

```ts
function bind<T extends ActionType>(
  action: ActionRef<T>,
  source: BindingSource,
  options?: BindingOptions
): BindingEntry
```

Crée une entrée de binding liant une action à une source d'entrée brute.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `action` | `ActionRef<T>` | L'action à lier. |
| `source` | `BindingSource` | La source d'entrée (code de touche, indice de bouton, composite, etc.). |
| `options.processors` | `ProcessorDescriptor[]` | Transforment la valeur brute. Appliqués dans l'ordre. |
| `options.interactions` | `InteractionDescriptor[]` | Contrôlent la sémantique de `isJustTriggered` / `isJustReleased`. |

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

| Champ | Type | Description |
|-------|------|-------------|
| `processors` | `ProcessorDescriptor[]` | Transformateurs de valeur appliqués dans l'ordre avant l'écriture de l'état de l'action. |
| `interactions` | `InteractionDescriptor[]` | Conditionnent la sémantique de déclenchement. Une seule interaction peut être active par binding à la fois. |

### Processeurs intégrés

| Processeur | Description |
|------------|-------------|
| `DeadZone(threshold)` | Retourne 0 quand `|value| ≤ threshold`. Défaut : `0.15`. |
| `Scale(factor)` | Multiplie la valeur par `factor`. |
| `Invert()` | Inverse la valeur. |
| `Clamp(min, max)` | Plafonne à `[min, max]`. |
| `Normalize()` | Ramène la magnitude à `[0, 1]` pour les vecteurs 2D. |
| `Smooth(speed)` | Interpole linéairement vers la cible chaque frame. `speed` dans `[0, 1]`. |
| `Swizzle(x, y)` | Réordonne ou inverse les axes d'une valeur 2D. |

### Interactions intégrées

| Interaction | Description |
|-------------|-------------|
| `Hold({ holdTime })` | Se déclenche uniquement après que la source soit maintenue `holdTime` secondes. |
| `Tap({ tapTime })` | Se déclenche uniquement sur les appuis rapides (relâché dans `tapTime` secondes). |
| `DoubleTap({ maxInterval })` | Se déclenche sur deux appuis rapides consécutifs dans `maxInterval`. |
| `Toggle()` | Alterne `isPressed` entre `true` et `false` à chaque appui. |
| `Repeat({ interval })` | Se redéclenche toutes les `interval` secondes tant que maintenu. |
| `Press()` | Défaut : se déclenche à l'appui (isJustTriggered sur front montant). |
| `Release()` | Se déclenche au relâchement plutôt qu'à l'appui. |
| `ChordedWith(otherSource)` | Se déclenche uniquement quand `otherSource` est aussi maintenu. |

## defineInputContext

```ts
function defineInputContext(name: string, config: InputContextConfig): InputContextDef
```

Définit un ensemble nommé et priorisé de bindings d'actions.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Nom unique du contexte. Utilisé avec `player.activateContext(name)`. |
| `config.priority` | `number` | Les valeurs plus élevées ont la précédence. Typique : gameplay = 0, menu = 10. |
| `config.bindings` | `BindingEntry[]` | Entrées de binding créées avec `bind()`. |

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

Co-localise les définitions d'actions avec leurs bindings par défaut. C'est le pattern recommandé pour la plupart des jeux — il réduit le boilerplate et préserve le type littéral `ActionRef<T>` grâce à l'inférence const generic de TypeScript.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Nom du contexte. |
| `config.priority` | `number` | Priorité du contexte. |
| `config.actions` | `ActionSchemaMap` | Enregistrement de `{ type, bindings[] }` par clé d'action. |

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

// actions.Jump : ActionRef<'button'>  ✅  inférence TypeScript complète
// actions.Move : ActionRef<'axis2d'>  ✅
```

**Important :** Le champ `type` doit être un littéral de chaîne inline. L'affecter depuis une variable typée `ActionType` perd le littéral et dégrade l'inférence vers `ActionRef<ActionType>`.
