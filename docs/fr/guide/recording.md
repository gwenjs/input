# Enregistrement & Lecture

`@gwenjs/input` inclut un système intégré d'enregistrement et de lecture. Les enregistrements sont des snapshots d'état d'action par frame encodés en delta, rejouables à n'importe quelle vitesse.

## Cas d'usage

- **Replays déterministes** — livrez des fichiers de replay pour la validation de speedruns ou les moments forts.
- **Tests automatisés** — enregistrez une session une fois, rejouez-la en CI pour vérifier les résultats du jeu.
- **Reproduction de bugs** — laissez les joueurs exporter un enregistrement lors d'un bug, importez-le pour le reproduire exactement.
- **Lecture de tutoriel** — pré-enregistrez une séquence de tutoriel et jouez-la comme un fantôme.

## Enregistrement

Obtenez le recorder via `useInputRecorder()` ou `useInput().recorder` :

```ts
import { useInputRecorder } from '@gwenjs/input'

const recorder = useInputRecorder()

// Démarrer l'enregistrement
recorder.start()

// … jouer le scénario …

// Arrêter et exporter
recorder.stop()
const recording = recorder.export()

// Sérialiser en JSON pour le stockage
const json = JSON.stringify(recording)
localStorage.setItem('my-recording', json)
```

### API du recorder

| Méthode / Propriété | Description |
|---------------------|-------------|
| `start()` | Commence l'enregistrement. Efface les données précédentes. Lance une erreur si déjà en cours. |
| `stop()` | Termine l'enregistrement. Les données capturées sont disponibles via `export()`. |
| `export()` | Retourne l'objet `InputRecording`. |
| `state` | État courant : `'idle'` ou `'recording'`. |
| `frameCount` | Nombre de frames capturées jusqu'à présent. |

## Lecture

Obtenez l'instance de lecture via `useInputPlayback()` ou `useInput().playback` :

```ts
import { useInputPlayback } from '@gwenjs/input'

const playback = useInputPlayback()

// Charger un enregistrement
const json = localStorage.getItem('my-recording')
if (json) {
  playback.load(JSON.parse(json))
  playback.play()
}
```

### API de lecture

| Méthode / Propriété | Description |
|---------------------|-------------|
| `load(recording)` | Charge un enregistrement et réinitialise la tête de lecture à la frame 0. |
| `play()` | Démarre la lecture. Surpasse les entrées des périphériques en direct pour tous les joueurs. |
| `pause()` | Met la lecture en pause à la frame courante. |
| `stop()` | Arrête la lecture et restaure les entrées en direct. |
| `seek(frame)` | Saute à un index de frame spécifique. |
| `state` | État courant : `'idle'`, `'playing'` ou `'paused'`. |
| `isPlaying` | `true` pendant que la lecture est active et non en pause. |
| `currentFrame` | Index de frame entier de la tête de lecture. |
| `frameCount` | Nombre total de frames dans l'enregistrement chargé. |
| `loop` | Quand `true`, la lecture redémarre après la dernière frame. Défaut : `false`. |
| `speed` | Multiplicateur de vitesse. `1` = temps réel, `0.5` = demi-vitesse, `2` = double. Défaut : `1`. |
| `onFrame(cb)` | Enregistre un callback appelé à chaque frame avec l'index courant. |
| `onComplete(cb)` | Enregistre un callback appelé quand la lecture se termine. |

### Positionnement

```ts
// Sauter à la frame 120 (2 secondes dans un enregistrement à 60 fps)
playback.seek(120)
```

### Contrôle de la vitesse

```ts
// Demi-vitesse pour un replay dramatique
playback.speed = 0.5
playback.play()
```

## Lecture automatique au démarrage

Passez un enregistrement à la config du plugin pour démarrer la lecture immédiatement au démarrage du moteur :

```ts
import myRecording from './recordings/tutorial.json'

export default defineConfig({
  modules: [
    ['@gwenjs/input', {
      recording: myRecording,
    }],
  ],
})
```

## Notes

- `holdTime` n'est pas enregistré ni relu. Les systèmes dépendant de la durée de maintien exacte verront `holdTime: 0` pendant la lecture.
- Le format d'enregistrement est encodé en delta : seules les valeurs modifiées sont stockées par frame, gardant les fichiers compacts.
- Les enregistrements sont du JSON valide et peuvent être versionnés aux côtés des fixtures de test.
