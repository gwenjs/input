# Multijoueur

`@gwenjs/input` supporte jusqu'à 4 joueurs locaux. Chaque joueur dispose d'une instance `PlayerInput` indépendante avec sa propre pile de contextes, ses overrides de bindings et son assignation de périphériques.

## Configuration

Définissez le nombre de joueurs dans la config du plugin :

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    ['@gwenjs/input', {
      players: 2,   // 1 à 4 joueurs
      contexts: [GameplayContext],
      defaultActiveContexts: ['gameplay'],
    }],
  ],
})
```

## Accéder à PlayerInput

### usePlayer(index)

```ts
import { usePlayer } from '@gwenjs/input'

const p1 = usePlayer(0)   // joueur 1
const p2 = usePlayer(1)   // joueur 2
```

### Via InputService

```ts
import { useInput } from '@gwenjs/input'

const input = useInput()
const p1 = input.player(0)
const p2 = input.player(1)

// Raccourci pour le joueur 0
const jump = input.action(Jump)  // équivalent à input.player(0).action(Jump)
```

### Via l'injection du moteur

```ts
const p1 = engine.inject('player:0')
const p2 = engine.inject('player:1')
```

## Actions par joueur

Passez l'index du joueur comme second argument à `useAction()` :

```ts
import { useAction } from '@gwenjs/input'

const p1Jump = useAction(Jump, 0)   // joueur 0
const p2Jump = useAction(Jump, 1)   // joueur 1
```

## Contextes par joueur

Chaque joueur maintient sa propre pile de contextes :

```ts
const p1 = usePlayer(0)
const p2 = usePlayer(1)

// Le joueur 1 est dans le menu de pause, le joueur 2 continue de jouer
p1.activateContext('menu')
// Les contextes de p2 ne sont pas affectés
```

## forPlayers

Utilisez `forPlayers` pour enregistrer un système une fois par joueur sans dupliquer la logique :

```ts
import { forPlayers } from '@gwenjs/input'
import { defineConfig } from '@gwenjs/core'

export default defineConfig({
  systems: [
    ...forPlayers(2, (playerIndex) => movementSystem(playerIndex)),
    ...forPlayers(2, (playerIndex) => cameraSystem(playerIndex)),
  ],
})
```

`forPlayers(count, factory)` appelle `factory(0)`, `factory(1)`, …, `factory(count - 1)` et retourne les résultats sous forme de tableau.

## Rebinding par joueur

Chaque joueur peut avoir des overrides de bindings indépendants. Cela permet des schémas de contrôle personnalisés par joueur ou des profils d'accessibilité :

```ts
const p2 = usePlayer(1)

// Remapper Jump pour le joueur 2 sur une touche différente
p2.rebind(Jump, 0, Keys.KeyZ)

// Appliquer un profil d'accessibilité nommé
p2.activateAccessibilityProfile('one-handed-left')
```

## Persister les bindings

Utilisez `exportBindings` et `importBindings` pour sauvegarder et restaurer les réglages par joueur :

```ts
// Sauvegarder les bindings du joueur 0 dans le localStorage
const snapshot = p1.exportBindings()
localStorage.setItem('bindings-p0', JSON.stringify(snapshot))

// Restaurer au prochain démarrage via la config du plugin
export default defineConfig({
  modules: [
    ['@gwenjs/input', {
      initialBindings: [
        JSON.parse(localStorage.getItem('bindings-p0') ?? 'null'),
      ],
    }],
  ],
})
```

Consultez [`PlayerInput`](/fr/api/player-input) pour l'API complète de rebinding.
