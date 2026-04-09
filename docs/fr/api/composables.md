# Composables

Tous les composables doivent être appelés dans un contexte moteur actif (`defineSystem()`, `engine.run()`, ou un hook de cycle de vie de plugin). Tous lèvent `GwenPluginNotFoundError` si `@gwenjs/input` n'est pas enregistré.

## Vue d'ensemble

| Composable | Retourne | Description |
|------------|----------|-------------|
| `useInput()` | `InputService` | Le service d'entrée global. |
| `useAction(ref, playerIndex?)` | `ActionState<T>` | État par frame d'une action pour un joueur. |
| `usePlayer(index?)` | `PlayerInput` | Gestionnaire d'entrée par joueur via son index. |
| `useKeyboard()` | `KeyboardDevice` | État brut du clavier. |
| `useMouse()` | `MouseDevice` | État brut de la souris (position, delta, boutons, molette). |
| `useGamepad(slot?)` | `GamepadDevice` | État brut des manettes. |
| `useTouch()` | `TouchDevice` | Points de contact et état des contrôles virtuels. |
| `useGyroscope()` | `GyroDevice` | Orientation et vitesse de rotation de l'appareil. |
| `usePointer()` | `PointerState` | Pointeur unifié souris + touch. |
| `useInputRecorder()` | `InputRecorder` | Enregistrer des sessions d'entrée. |
| `useInputPlayback()` | `InputPlayback` | Rejouer des sessions enregistrées. |
| `forPlayers(count, factory)` | `T[]` | Créer un élément par slot joueur. |

---

## useInput

```ts
function useInput(): InputService
```

Retourne l'`InputService` partagé. Utilisez-le quand vous avez besoin du service complet — tableau des joueurs, périphériques, recorder, playback ou profils d'accessibilité.

```ts
const input = useInput()
const p2 = input.player(1)
const snapshot = input.recorder.export()
```

---

## useAction

```ts
function useAction<T extends ActionType>(
  ref: ActionRef<T>,
  playerIndex?: number
): ActionState<T>
```

Retourne l'état par frame d'une action pour un joueur donné. Le composable le plus fréquemment utilisé.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `ref` | `ActionRef<T>` | — | La référence d'action. |
| `playerIndex` | `number` | `0` | Index du slot joueur. |

```ts
const jump = useAction(Jump)       // ButtonActionState pour le joueur 0
const move = useAction(Move, 1)    // Axis2DActionState pour le joueur 1
```

---

## usePlayer

```ts
function usePlayer(index?: number): PlayerInput
```

Retourne le `PlayerInput` pour le slot donné. Raccourci pour `useInput().player(index)`.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `index` | `number` | `0` | Slot joueur (base 0). |

```ts
const p2 = usePlayer(1)
p2.activateContext('vehicle')
```

---

## useKeyboard

```ts
function useKeyboard(): KeyboardDevice
```

Retourne le `KeyboardDevice` brut. Préférez `useAction()` pour la logique de jeu. Utilisez ceci pour un accès d'échappatoire aux états de touches bruts.

```ts
const kb = useKeyboard()
if (kb.isJustPressed('Space')) { ... }
```

---

## useMouse

```ts
function useMouse(): MouseDevice
```

Retourne le `MouseDevice` brut. Préférez `useAction()` ou `usePointer()` pour la logique de jeu.

```ts
const mouse = useMouse()
console.log(mouse.position.x, mouse.position.y)
console.log(mouse.delta.x, mouse.delta.y)
```

---

## useGamepad

```ts
function useGamepad(slot?: number): GamepadDevice
```

Retourne le `GamepadDevice`. Toutes les manettes partagent actuellement une instance ; passez l'index de la manette à chaque méthode.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `slot` | `number` | `0` | Réservé pour l'isolation future par slot. |

```ts
const gp = useGamepad()
if (gp.isButtonJustPressed(0, 0)) { ... }  // pad 0, bouton 0
```

---

## useTouch

```ts
function useTouch(): TouchDevice
```

Retourne le `TouchDevice` pour lire les points de contact et l'état des contrôles virtuels.

```ts
const touch = useTouch()
if (touch.isTouching()) {
  for (const point of touch.points.values()) {
    console.log(point.position, point.phase)
  }
}
```

---

## useGyroscope

```ts
function useGyroscope(): GyroDevice
```

Retourne le `GyroDevice`. Vérifiez `gyro.isAvailable` avant de lire les valeurs d'orientation.

```ts
const gyro = useGyroscope()
if (gyro.isAvailable) {
  console.log(gyro.orientation.roll, gyro.orientation.pitch)
}
```

---

## usePointer

```ts
function usePointer(): PointerState
```

État de pointeur unifié — abstrait souris et premier touch en une seule interface. Le touch a la priorité sur la souris quand un point de contact est actif.

**Retourne** `PointerState` :

| Champ | Type | Description |
|-------|------|-------------|
| `position` | `{ x: number; y: number }` | Position du pointeur relative au canvas. |
| `delta` | `{ x: number; y: number }` | Déplacement cette frame. |
| `isPressed` | `boolean` | `true` tant que le bouton / touch est maintenu. |
| `isJustPressed` | `boolean` | `true` sur le premier frame d'un appui. |
| `isJustReleased` | `boolean` | `true` sur le premier frame après le relâchement. |
| `type` | `'mouse' \| 'touch'` | Quel périphérique est actuellement actif. |

```ts
const pointer = usePointer()
if (pointer.isJustPressed) {
  handleTap(pointer.position)
}
```

---

## useInputRecorder

```ts
function useInputRecorder(): InputRecorder
```

Retourne l'`InputRecorder` du plugin actif. Raccourci pour `useInput().recorder`.

```ts
const recorder = useInputRecorder()
recorder.start()
// … jouer le scénario …
recorder.stop()
const rec = recorder.export()
```

---

## useInputPlayback

```ts
function useInputPlayback(): InputPlayback
```

Retourne l'`InputPlayback` du plugin actif. Raccourci pour `useInput().playback`.

```ts
const playback = useInputPlayback()
playback.load(myRecording)
playback.play()
```

---

## forPlayers

```ts
function forPlayers<T>(count: number, factory: (playerIndex: number) => T): T[]
```

Crée un élément par joueur en appelant `factory(playerIndex)` pour chaque index dans `[0, count)`. Utile pour enregistrer des systèmes paramétrés sans duplication.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `count` | `number` | Nombre de joueurs. Doit correspondre à `InputPlugin({ players: N })`. |
| `factory` | `(playerIndex: number) => T` | Appelée une fois par slot joueur. |

```ts
import { forPlayers } from '@gwenjs/input'

export default defineConfig({
  systems: [
    ...forPlayers(2, (i) => movementSystem(i)),
    ...forPlayers(2, (i) => cameraSystem(i)),
  ],
})
```
