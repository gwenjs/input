# Actions

Les actions sont l'abstraction centrale de `@gwenjs/input`. Au lieu de vérifier des codes de touches bruts dans votre logique de jeu, vous définissez des actions nommées et les associez à des sources d'entrée dans des contextes. Cela découple la logique de jeu des contrôles physiques et permet le rebinding à l'exécution.

## defineAction

```ts
function defineAction<T extends ActionType>(
  name: string,
  config: { type: T }
): ActionRef<T>
```

Crée une référence d'action typée avec une identité symbole stable.

```ts
import { defineAction } from '@gwenjs/input'

export const Jump     = defineAction('Jump',     { type: 'button' })
export const Throttle = defineAction('Throttle', { type: 'axis1d' })
export const Move     = defineAction('Move',     { type: 'axis2d' })
```

### ActionType

| Type      | Forme de la valeur                   | Cas d'usage                       |
|-----------|--------------------------------------|-----------------------------------|
| `button`  | `ButtonActionState`                  | Sauter, tirer, confirmer, annuler |
| `axis1d`  | `Axis1DActionState` — `value: number` | Accélérateur, frein, molette     |
| `axis2d`  | `Axis2DActionState` — `value: {x,y}` | Déplacement, visée, caméra       |

### ActionRef

Chaque appel à `defineAction` retourne un `ActionRef<T>` :

```ts
interface ActionRef<T extends ActionType> {
  readonly id: symbol     // identité unique — pas de collision de noms
  readonly name: string   // utilisé dans la sortie de debug et la sérialisation
  readonly type: T        // type littéral préservé pour l'inférence TypeScript complète
}
```

Exportez les objets `ActionRef` depuis un module partagé. N'appelez pas `defineAction` plus d'une fois pour la même action logique — le symbole `id` doit être stable.

## bind

```ts
function bind<T extends ActionType>(
  action: ActionRef<T>,
  source: BindingSource,
  options?: BindingOptions
): BindingEntry
```

Crée une entrée de binding qui associe une action à une source d'entrée, avec optionnellement des processeurs et des interactions.

```ts
import { bind } from '@gwenjs/input'
import { Keys, GamepadButtons, GamepadStick } from '@gwenjs/input/constants'
import { DeadZone, Smooth } from '@gwenjs/input/processors'
import { Hold } from '@gwenjs/input/interactions'

bind(Jump, Keys.Space)
bind(Jump, GamepadButtons.South)
bind(Move, GamepadStick.Left, { processors: [DeadZone(0.15), Smooth(0.08)] })
bind(Sprint, Keys.ShiftLeft, { interactions: [Hold({ holdTime: 0.1 })] })
```

### Types de BindingSource

| Source | Type | Exemple |
|--------|------|---------|
| Touche clavier | `string` | `Keys.Space`, `'KeyW'`, `'ArrowUp'` |
| Bouton souris | `number` | `0` (gauche), `1` (milieu), `2` (droit) |
| Bouton manette | `number` | `GamepadButtons.South` (0), `GamepadButtons.East` (1) |
| Axe manette | `string` | `GamepadStick.Left`, `GamepadStick.Right` |
| Composite 2D | `CompositeSource` | `Composite2D({ up, down, left, right })` |
| Composite 1D | `Composite1DSource` | `Composite({ negative, positive })` |
| Delta souris | `MouseDeltaSource` | `MouseDelta()` |
| Molette souris | `MouseWheelSource` | `MouseWheel()` |
| Geste tactile | `GestureSource` | `TouchGesture.Tap()`, `TouchGesture.Swipe()` |
| Contrôle virtuel | `VirtualSource` | `VirtualJoystick('id')`, `VirtualButton('id')` |
| Axe gyroscope | `GyroSource` | `GyroAxis.Roll`, `GyroAxis.Pitch` |

### BindingOptions

| Option | Type | Description |
|--------|------|-------------|
| `processors` | `ProcessorDescriptor[]` | Transforment la valeur brute avant qu'elle n'atteigne l'état de l'action. Ex : `DeadZone(0.15)`, `Smooth(0.1)`, `Invert()`, `Scale(2)`, `Clamp(-1, 1)`, `Normalize()`. |
| `interactions` | `InteractionDescriptor[]` | Contrôlent le déclenchement de `isJustTriggered`/`isJustReleased`. Ex : `Hold({ holdTime: 0.3 })`, `Tap({ tapTime: 0.2 })`, `DoubleTap()`, `Toggle()`, `Repeat({ interval: 0.1 })`. |

## defineInputSchema (recommandé)

Pour la plupart des jeux, co-localisez les définitions d'actions avec leurs bindings grâce à `defineInputSchema` :

```ts
import { defineInputSchema, Composite2D } from '@gwenjs/input'
import { Keys, GamepadButtons, GamepadStick } from '@gwenjs/input/constants'
import { DeadZone, Smooth } from '@gwenjs/input/processors'

export const { actions, context: GameplayContext } = defineInputSchema('gameplay', {
  priority: 0,
  actions: {
    Jump: {
      type: 'button',
      bindings: [Keys.Space, GamepadButtons.South],
    },
    Move: {
      type: 'axis2d',
      bindings: [
        Composite2D({ up: Keys.W, down: Keys.S, left: Keys.A, right: Keys.D }),
        { source: GamepadStick.Left, processors: [DeadZone(0.15), Smooth(0.08)] },
      ],
    },
  },
})

// actions.Jump : ActionRef<'button'>  ✅
// actions.Move : ActionRef<'axis2d'>  ✅
```

## Lire l'état d'une action

```ts
import { useAction } from '@gwenjs/input'
import { actions } from './actions'

onUpdate(() => {
  const jump = useAction(actions.Jump) // ButtonActionState
  const move = useAction(actions.Move) // Axis2DActionState

  if (jump.isJustTriggered) { /* premier frame où l'action se déclenche */ }
  if (jump.isPressed)        { /* chaque frame tant que maintenu */ }
  if (jump.isJustReleased)   { /* premier frame après relâchement */ }
  console.log(jump.holdTime)  // secondes maintenu

  console.log(move.value.x, move.value.y) // traité [-1, 1]
  console.log(move.rawValue)              // avant processeurs
  console.log(move.magnitude)             // longueur euclidienne
})
```
