# Périphériques

`@gwenjs/input` fournit cinq classes de périphériques qui suivent l'état brut du matériel à chaque frame. Dans la plupart des cas, utilisez `useAction()` plutôt que de lire les périphériques directement — ceux-ci sont réservés aux accès d'échappatoire et aux cas avancés.

Accédez aux périphériques via `InputService` :

```ts
const input = useInput()
input.keyboard   // KeyboardDevice
input.mouse      // MouseDevice
input.gamepad    // GamepadDevice
input.touch      // TouchDevice
input.gyro       // GyroDevice
```

Ou via les composables dédiés : `useKeyboard()`, `useMouse()`, `useGamepad()`, `useTouch()`, `useGyroscope()`.

## KeyboardDevice

Suit l'état de chaque touche avec une machine à 4 états : `idle → justPressed → held → justReleased → idle`.

```ts
import { useKeyboard } from '@gwenjs/input'

const kb = useKeyboard()

kb.isJustPressed('Space')   // true uniquement sur le premier frame où la touche est enfoncée
kb.isPressed('KeyW')        // true tant qu'enfoncée (justPressed ou held)
kb.isHeld('ShiftLeft')      // true après le premier frame (exclut justPressed)
kb.isJustReleased('Escape') // true uniquement sur le premier frame après le relâchement
kb.getState('KeyA')         // 'idle' | 'justPressed' | 'held' | 'justReleased'
```

Les codes de touches suivent la spécification [W3C KeyboardEvent.code](https://developer.mozilla.org/fr/docs/Web/API/KeyboardEvent/code). Utilisez les constantes `Keys` de `@gwenjs/input/constants` pour l'autocomplétion :

```ts
import { Keys } from '@gwenjs/input/constants'
// Keys.Space, Keys.KeyW, Keys.ArrowUp, Keys.ShiftLeft, Keys.Enter, …
```

Le périphérique clavier enregistre un écouteur `blur` sur `window` et réinitialise tous les états lors de la perte de focus, évitant les touches bloquées.

## MouseDevice

Suit l'état des boutons, la position du curseur, le delta de frame et la molette.

```ts
import { useMouse } from '@gwenjs/input'

const mouse = useMouse()

// Position (relative au canvas si configuré, sinon espace écran)
mouse.position.x
mouse.position.y
mouse.position.screenX   // toujours espace écran
mouse.position.screenY

// Delta de frame (movementX/movementY accumulés, remis à zéro chaque frame)
mouse.delta.x
mouse.delta.y

// Molette (ticks accumulés cette frame, positif = défilement vers le bas)
mouse.wheel

// États des boutons (0 = gauche, 1 = milieu, 2 = droit)
mouse.isButtonJustPressed(0)
mouse.isButtonPressed(0)
mouse.isButtonJustReleased(0)
mouse.getButtonState(0)   // 'idle' | 'justPressed' | 'held' | 'justReleased'
```

## GamepadDevice

Encapsule l'API Web Gamepad avec un snapshot par frame. `navigator.getGamepads()` est appelé une fois par frame ; les états des boutons sont comparés entre frames pour la détection des fronts.

```ts
import { useGamepad } from '@gwenjs/input'

const gp = useGamepad()

// États des boutons — padIndex = slot de la manette (0–3)
gp.isButtonPressed(0, 0)       // pad 0, bouton 0 — maintenu
gp.isButtonJustPressed(0, 0)   // front montant
gp.isButtonJustReleased(0, 0)  // front descendant
gp.getButtonValue(0, 0)        // valeur analogique 0–1 (pour les gâchettes)

// Axes — zone morte appliquée (défaut 0.15, configurable via InputPlugin({ gamepad: { deadzone } }))
gp.getAxis(0, 0)               // pad 0, index d'axe 0
gp.getLeftStick(0)             // { x, y } — axes 0 et 1
gp.getRightStick(0)            // { x, y } — axes 2 et 3

// Connexion
gp.isConnected(0)
gp.connectedCount()
gp.getConnectedIndices()       // [0, 2] si les pads 0 et 2 sont connectés
```

Utilisez les constantes `GamepadButtons` pour des indices de boutons lisibles :

```ts
import { GamepadButtons, GamepadStick } from '@gwenjs/input/constants'
// GamepadButtons.South (0), .East (1), .West (2), .North (3)
// GamepadButtons.L1, .R1, .L2, .R2, .L3, .R3
// GamepadStick.Left, GamepadStick.Right
```

## TouchDevice

Suit les points de contact multi-touch et l'état des contrôles virtuels à l'écran.

```ts
import { useTouch } from '@gwenjs/input'

const touch = useTouch()

touch.isTouching()         // true si un point de contact est actif
touch.points               // Map<number, TouchPoint> — indexée par identifiant de toucher

for (const point of touch.points.values()) {
  point.position            // { x, y } — relatif au canvas
  point.deltaPosition       // { x, y } — déplacement cette frame
  point.phase               // 'began' | 'moved' | 'stationary' | 'ended'
}
```

Les joysticks virtuels et boutons configurés dans `InputPlugin({ touch: { virtualJoysticks, virtualButtons } })` sont automatiquement mappés vers des sources de binding utilisables avec `bind()`.

## GyroDevice

Lit l'orientation de l'appareil (roulis, tangage, lacet) et la vitesse de rotation via l'API `DeviceOrientationEvent`.

```ts
import { useGyroscope } from '@gwenjs/input'

const gyro = useGyroscope()

// Vérifiez la disponibilité avant de lire (devient true après le premier DeviceOrientationEvent)
if (gyro.isAvailable) {
  gyro.orientation.roll    // degrés
  gyro.orientation.pitch
  gyro.orientation.yaw
}
```

Sur iOS 13+, l'API `DeviceOrientationEvent` nécessite une autorisation explicite de l'utilisateur. Demandez-la depuis un geste utilisateur :

```ts
button.onclick = async () => {
  const result = await useInput().requestMotionPermission()
  if (result === 'granted') enableGyroAim()
}
```

Consultez [`InputService.requestMotionPermission()`](/fr/api/input-service#requestmotionpermission) pour les détails.
