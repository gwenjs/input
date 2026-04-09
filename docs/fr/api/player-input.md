# PlayerInput

Gestionnaire d'état d'entrée par joueur. Gère une pile de contextes, l'assignation des périphériques, l'évaluation des actions par frame, le rebinding à l'exécution et l'import/export de snapshots de bindings.

Obtenu via `usePlayer(index)` ou `useInput().player(index)`.

```ts
class PlayerInput {
  readonly index: number   // slot joueur (base 0)
}
```

## Gestion des contextes

### activateContext

```ts
activateContext(name: string): void
```

Active un contexte d'entrée enregistré par son nom.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Nom du contexte tel que défini dans `defineInputContext()`. |

**Lève** `Error` si le contexte n'a jamais été enregistré.

```ts
player.activateContext('gameplay')
player.activateContext('ui-pause-menu')
```

### deactivateContext

```ts
deactivateContext(name: string): void
```

Désactive un contexte d'entrée par son nom. Sans effet s'il n'est pas actif.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Nom du contexte à désactiver. |

### registerContext

```ts
registerContext(def: InputContextDef): void
```

Enregistre une définition de contexte à l'exécution (après la configuration du plugin).

| Paramètre | Type | Description |
|-----------|------|-------------|
| `def` | `InputContextDef` | Créé par `defineInputContext()` ou `defineInputSchema()`. |

### getActiveContexts

```ts
getActiveContexts(): string[]
```

Retourne les noms de tous les contextes actuellement actifs pour ce joueur, triés par priorité décroissante.

## Lecture des actions

### action

```ts
action<T extends ActionType>(ref: ActionRef<T>): ActionState<T>
```

Retourne l'état courant par frame d'une action pour ce joueur.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `ref` | `ActionRef<T>` | La référence d'action issue de `defineAction()` ou `defineInputSchema()`. |

```ts
const jump = player.action(Jump)   // ButtonActionState
const move = player.action(Move)   // Axis2DActionState

jump.isPressed         // true tant que maintenu
jump.isJustTriggered   // premier frame d'activation
jump.isJustReleased    // premier frame après relâchement
jump.holdTime          // secondes maintenu

move.value             // { x, y } traité
move.rawValue          // { x, y } avant processeurs
move.magnitude         // longueur euclidienne
```

## Rebinding à l'exécution

### rebind

```ts
rebind(action: ActionRef<ActionType>, bindingIndex: number, newSource: BindingSource): void
```

Remplace un binding spécifique pour ce joueur. N'affecte pas les autres joueurs.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `action` | `ActionRef<ActionType>` | L'action à remapper. |
| `bindingIndex` | `number` | Index base 0 dans la liste de bindings pour cette action. |
| `newSource` | `BindingSource` | La nouvelle source d'entrée. |

```ts
// Remapper le binding 0 de Jump de Space à KeyZ pour ce joueur
player.rebind(Jump, 0, Keys.KeyZ)
```

### resetBindings

```ts
resetBindings(): void
```

Efface tous les overrides de bindings du joueur, restaurant les valeurs par défaut du contexte.

### captureNextInput

```ts
captureNextInput(options?: { timeoutMs?: number }): Promise<BindingSource | null>
```

Attend le prochain événement d'entrée physique et le retourne comme `BindingSource`. Retourne `null` en cas de timeout.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `options.timeoutMs` | `number` | Millisecondes d'attente avant de résoudre `null`. Défaut : `5000`. |

Utile pour implémenter une UI « appuyez sur une touche pour remapper » :

```ts
const source = await player.captureNextInput({ timeoutMs: 5000 })
if (source) player.rebind(Jump, 0, source)
```

## Import/export des bindings

### exportBindings

```ts
exportBindings(): BindingsSnapshot
```

Retourne un snapshot sérialisable de tous les overrides de bindings du joueur.

### importBindings

```ts
importBindings(snapshot: BindingsSnapshot): void
```

Restaure les bindings depuis un snapshot précédemment exporté.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `snapshot` | `BindingsSnapshot` | Snapshot issu de `exportBindings()`. |

### getBinding

```ts
getBinding(action: ActionRef<ActionType>, bindingIndex: number): BindingSource
```

Retourne la source effective pour un binding donné (override ou valeur par défaut).

| Paramètre | Type | Description |
|-----------|------|-------------|
| `action` | `ActionRef<ActionType>` | L'action à inspecter. |
| `bindingIndex` | `number` | Index de binding base 0. |

## Accessibilité

### activateAccessibilityProfile

```ts
activateAccessibilityProfile(name: string): void
```

Applique un profil d'accessibilité nommé (un préréglage `BindingsSnapshot` enregistré via `InputPlugin({ accessibilityProfiles: {...} })`).

| Paramètre | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Nom du profil tel qu'enregistré dans la config du plugin. |

### getRemappableActions

```ts
getRemappableActions(): RemappableAction[]
```

Retourne la liste de toutes les actions remappables avec leurs bindings effectifs courants. Utile pour construire une UI de rebinding.

Chaque `RemappableAction` contient :
- `name: string` — nom lisible de l'action
- `type: ActionType` — `'button'` | `'axis1d'` | `'axis2d'`
- `bindings: Array<{ index, source, displayName, isOverridden }>`
