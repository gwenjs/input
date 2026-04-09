# Interactions & Processeurs

Les interactions et les processeurs modifient le comportement d'un binding — les interactions contrôlent **quand** une action se déclenche, les processeurs transforment la **valeur** avant qu'elle n'atteigne votre système.

Les deux s'utilisent via des tableaux dans les options de `bind()` :

```typescript
bind(Action, Source, {
  interactions: [...],
  processors: [...],
})
```

---

## Interactions

Les interactions conditionnent les sémantiques `isJustTriggered` / `isPressed` / `isJustReleased` d'un binding.  
Par défaut (sans interaction), un bouton déclenche `isJustTriggered` à chaque appui.

Plusieurs interactions peuvent être combinées dans le tableau — elles sont évaluées dans l'ordre.

### Press *(défaut)*

Déclenche `isJustTriggered` sur la première frame où le bouton est enfoncé. `isPressed` reste vrai tant que le bouton est maintenu.

```typescript
import { Press } from '@gwenjs/input'

bind(Tir, Keys.Space, { interactions: [Press()] })
```

C'est le comportement implicite par défaut et il est rarement nécessaire de l'écrire explicitement.

---

### Release

Déclenche `isJustTriggered` sur la frame où le bouton est **relâché** (pas à l'appui).

```typescript
import { Release } from '@gwenjs/input'

bind(Confirmer, Keys.Enter, { interactions: [Release()] })
```

---

### Tap

Déclenche `isJustTriggered` si le bouton est relâché en moins de `tapTime` secondes.  
Les appuis longs sont ignorés.

```typescript
import { Tap } from '@gwenjs/input'

bind(Dash, GamepadButton.South, { interactions: [Tap({ tapTime: 0.2 })] })
```

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `tapTime` | `number` | `0.2` | Durée max d'appui (secondes) pour qu'un tap soit détecté. |

---

### Hold

Déclenche `isJustTriggered` une fois que le bouton est maintenu pendant `holdTime` secondes.  
`isPressed` reste vrai jusqu'à ce que le bouton soit relâché.

```typescript
import { Hold } from '@gwenjs/input'

bind(Sprint, Keys.ShiftLeft, { interactions: [Hold({ holdTime: 0.3 })] })
bind(OuvrirMenu, GamepadButton.Options, { interactions: [Hold({ holdTime: 0.5 })] })
```

| Option | Type | Description |
|--------|------|-------------|
| `holdTime` | `number` | Durée de maintien requise en secondes. |

---

### DoubleTap

Déclenche `isJustTriggered` lorsque deux taps se produisent en moins de `maxGap` secondes.

```typescript
import { DoubleTap } from '@gwenjs/input'

bind(Esquive, Keys.ArrowLeft, { interactions: [DoubleTap({ maxGap: 0.25 })] })
bind(Esquive, Keys.ArrowRight, { interactions: [DoubleTap()] }) // défaut 0.3s
```

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `maxGap` | `number` | `0.3` | Temps max entre les deux taps (secondes). |

---

### Toggle

Bascule `isPressed` à chaque appui. Premier appui → actif, second appui → inactif.

- `isJustTriggered` se déclenche lors de l'activation.
- `isJustReleased` se déclenche lors de la désactivation.

```typescript
import { Toggle } from '@gwenjs/input'

bind(Accroupissement, Keys.ControlLeft, { interactions: [Toggle()] })
bind(Visée, GamepadButton.LeftTrigger, { interactions: [Toggle()] })
```

---

### Repeat

Déclenche `isJustTriggered` de façon répétée tant que le bouton est maintenu, comme l'auto-répétition du clavier.

- Premier déclenchement immédiat à l'appui.
- Attend `delay` secondes, puis se déclenche toutes les `interval` secondes.

```typescript
import { Repeat } from '@gwenjs/input'

bind(SelectionSuivante, Keys.ArrowDown, {
  interactions: [Repeat({ interval: 0.1, delay: 0.4 })]
})
```

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `interval` | `number` | *(requis)* | Temps entre les déclenchements répétés (secondes). |
| `delay` | `number` | identique à `interval` | Délai initial avant le début de la répétition. |

---

### AllOf — Raccourcis clavier

Déclenche uniquement lorsque **toutes les touches spécifiées** sont maintenues simultanément.  
Conçu pour les raccourcis clavier comme <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>.

```typescript
import { AllOf } from '@gwenjs/input'

bind(Annuler, Keys.KeyZ, {
  interactions: [AllOf(Keys.ControlLeft, Keys.ShiftLeft)]
})
bind(ToutSelectionner, Keys.KeyA, {
  interactions: [AllOf(Keys.ControlLeft)]
})
```

La touche du binding (`Keys.KeyZ`) est le déclencheur principal ; les touches passées à `AllOf` sont les modificateurs requis.

---

### ChordedWith — Combo inter-actions

Déclenche uniquement lorsqu'une autre **action** satisfait une condition.  
Utile pour les combos de gameplay sans polluer la logique des systèmes.

```typescript
import { ChordedWith } from '@gwenjs/input'

// Dérapage ne se déclenche que si Saut est maintenu
bind(Derapage, GamepadStick.LeftX, {
  interactions: [ChordedWith(Saut, 'isPressed')]
})

// Parade se déclenche uniquement sur la première frame où Sprint est déclenché
bind(Parade, Keys.KeyP, {
  interactions: [ChordedWith(Sprint, 'isJustTriggered')]
})
```

| Argument | Type | Description |
|----------|------|-------------|
| `actionRef` | `ActionRef` | L'action qui doit satisfaire `condition`. |
| `condition` | `'isPressed' \| 'isJustTriggered'` | L'état requis de cette action. |

---

## Processeurs

Les processeurs transforment la **valeur** d'un binding avant qu'elle soit lue par les systèmes.  
Ils s'appliquent aux sources d'axes (`axis1d`, `axis2d`) et certains aussi aux boutons.

Les processeurs s'appliquent dans l'ordre — chaînez-les pour combiner les effets :

```typescript
bind(Déplacement, GamepadStick.Left, {
  processors: [DeadZone(0.15), Normalize(), Scale(1.5)]
})
```

---

### DeadZone

Ramène à zéro les valeurs en dessous d'un seuil. Prévient le drift des sticks.

- `axis1d` : si `|valeur| < seuil` → `0`
- `axis2d` : zone morte circulaire sur la magnitude

```typescript
import { DeadZone } from '@gwenjs/input'

bind(Déplacement, GamepadStick.Left, { processors: [DeadZone(0.15)] })
```

---

### Scale

Multiplie la valeur par un facteur.

```typescript
import { Scale } from '@gwenjs/input'

bind(Déplacement, GamepadStick.Left, { processors: [Scale(2)] })    // 2x sensible
bind(Vue, MouseDelta(), { processors: [Scale(0.5)] })                // demi-vitesse
```

---

### Invert / InvertX / InvertY

Inverse la direction d'un axe.

```typescript
import { Invert, InvertX, InvertY } from '@gwenjs/input'

bind(VueY, MouseDelta(), { processors: [InvertY()] })              // vol inversé
bind(Déplacement, GamepadStick.Left, { processors: [InvertX()] })  // inverse X
bind(Gaz, GamepadAxis.LeftTrigger, { processors: [Invert()] })     // axis1d
```

| Fonction | S'applique à | Effet |
|----------|-------------|-------|
| `Invert()` | `axis1d`, `axis2d` | Multiplie tous les axes par `-1` |
| `InvertX()` | `axis2d` uniquement | Multiplie X par `-1` |
| `InvertY()` | `axis2d` uniquement | Multiplie Y par `-1` |

---

### Clamp

Limite la valeur à `[min, max]`. Pour `axis2d`, chaque axe est limité indépendamment.

```typescript
import { Clamp } from '@gwenjs/input'

bind(Déplacement, GamepadStick.Left, { processors: [Clamp(-0.8, 0.8)] })
```

---

### Normalize

Normalise un vecteur 2D à une magnitude unitaire (longueur ≤ 1). Aucun effet sur `axis1d` ou les boutons.

```typescript
import { Normalize } from '@gwenjs/input'

bind(Déplacement, GamepadStick.Left, { processors: [Normalize()] })
```

Utilisez après `DeadZone` pour ré-étendre la plage utilisable :

```typescript
processors: [DeadZone(0.15), Normalize()]
```

---

### Smooth

Lisse les changements de valeur via un lerp par frame.  
`factor = 1` signifie instantané (pas de lissage). Défaut : `0.1`.

```typescript
import { Smooth } from '@gwenjs/input'

bind(Déplacement, GamepadStick.Left, { processors: [Smooth(0.08)] })
bind(Vue, MouseDelta(), { processors: [Smooth(0.15)] })
```

::: info État par binding
Chaque binding maintient son propre état de lissage — plusieurs bindings sur la même source ont chacun leur propre valeur lissée.
:::

---

### SwizzleXY

Permute les composantes X et Y d'un axe 2D. Aucun effet sur `axis1d` ou les boutons.

```typescript
import { SwizzleXY } from '@gwenjs/input'

bind(Vue, GamepadStick.Right, { processors: [SwizzleXY()] })
```

---

## Combiner interactions et processeurs

Interactions et processeurs peuvent être utilisés ensemble sur le même binding :

```typescript
// Sprint : maintien 0.3s, stick lissé et deadzone
bind(Sprint, GamepadStick.Left, {
  interactions: [Hold({ holdTime: 0.3 })],
  processors: [DeadZone(0.1), Smooth(0.12)],
})

// Annuler : Ctrl+Shift+Z avec auto-répétition
bind(Annuler, Keys.KeyZ, {
  interactions: [AllOf(Keys.ControlLeft, Keys.ShiftLeft), Repeat({ interval: 0.15, delay: 0.5 })],
})
```
