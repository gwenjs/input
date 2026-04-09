# InputService

Le service d'entrée global — fournit l'accès à toutes les instances `PlayerInput` et aux périphériques bruts.

Récupéré via `useInput()` ou `engine.inject('input')`.

```ts
class InputService
```

## Joueurs

### player

```ts
player(index: number): PlayerInput
```

Retourne le `PlayerInput` pour le slot de joueur donné (base 0).

| Paramètre | Type | Description |
|-----------|------|-------------|
| `index` | `number` | Index du slot joueur base 0 (0–3). |

**Lève** `RangeError` si `index` est hors bornes.

### players

```ts
get players(): readonly PlayerInput[]
```

Toutes les instances `PlayerInput` actives. La longueur correspond au `players` passé à `InputPlugin`.

### action

```ts
action<T extends ActionType>(ref: ActionRef<T>): ActionState<T>
```

Raccourci pour `input.player(0).action(ref)`.

## Périphériques

### keyboard

```ts
get keyboard(): KeyboardDevice
```

L'instance du périphérique clavier. Voir [Périphériques — KeyboardDevice](/fr/guide/devices#keyboarddevice).

### mouse

```ts
get mouse(): MouseDevice
```

L'instance du périphérique souris. Voir [Périphériques — MouseDevice](/fr/guide/devices#mousedevice).

### gamepad

```ts
get gamepad(): GamepadDevice
```

L'instance du périphérique manette. Voir [Périphériques — GamepadDevice](/fr/guide/devices#gamepaddevice).

### touch

```ts
get touch(): TouchDevice
```

L'instance du périphérique tactile. Voir [Périphériques — TouchDevice](/fr/guide/devices#touchdevice).

### gyro

```ts
get gyro(): GyroDevice
```

L'instance du périphérique gyroscope. Voir [Périphériques — GyroDevice](/fr/guide/devices#gyrodevice).

### virtualControls

```ts
get virtualControls(): VirtualControlsOverlay | undefined
```

L'instance de l'overlay des contrôles virtuels. Présent uniquement si configuré via `InputPlugin({ touch: { virtualJoysticks, virtualButtons } })`.

## Enregistrement

### recorder

```ts
get recorder(): InputRecorder
```

L'instance `InputRecorder`. Utilisez-la pour démarrer/arrêter l'enregistrement et exporter les sessions. Voir [Enregistrement & Lecture](/fr/guide/recording).

### playback

```ts
get playback(): InputPlayback
```

L'instance `InputPlayback`. Utilisez-la pour charger, lire, positionner et arrêter les sessions enregistrées.

## Permission de mouvement

### requestMotionPermission

```ts
requestMotionPermission(): Promise<'granted' | 'denied' | 'unavailable'>
```

Demande la permission de mouvement iOS 13+ pour le gyroscope. **Doit être appelé depuis un gestionnaire de geste utilisateur** (ex : un clic de bouton). Appeler depuis `onUpdate()` échouera silencieusement sur iOS.

Sur les plateformes ne nécessitant pas de permission explicite, résout immédiatement avec `'granted'`. Si `DeviceOrientationEvent` n'est pas disponible, résout avec `'unavailable'`.

```ts
button.onclick = async () => {
  const result = await useInput().requestMotionPermission()
  if (result === 'granted') enableGyroAim()
}
```

## Profils d'accessibilité

### getAccessibilityProfiles

```ts
getAccessibilityProfiles(): string[]
```

Retourne les noms de tous les profils d'accessibilité enregistrés. Les profils sont enregistrés via `InputPlugin({ accessibilityProfiles: { ... } })`. Activez un profil pour un joueur via `player.activateAccessibilityProfile(name)`.

```ts
const profiles = useInput().getAccessibilityProfiles()
// ['one-handed-left', 'one-handed-right', 'high-contrast']
```

## Debug

### debug

```ts
get debug(): InputDebugAPI | null
```

L'instance de l'API debug. Retourne `null` en production (`import.meta.env.PROD`) ou avant que le plugin ne termine son initialisation. Utilisez-la pour construire des intégrations devtools ou des overlays de debug.

```ts
const debug = useInput().debug
if (debug) {
  debug.onFrame(snap => console.log(snap.players[0].actions))
}
```
