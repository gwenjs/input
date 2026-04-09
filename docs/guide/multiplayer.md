# Multiplayer

`@gwenjs/input` supports up to 4 local players. Each player gets an independent `PlayerInput` instance with its own context stack, binding overrides, and device assignment.

## Configuration

Set the player count in the plugin config:

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    ['@gwenjs/input', {
      players: 2,   // 1–4 players
      contexts: [GameplayContext],
      defaultActiveContexts: ['gameplay'],
    }],
  ],
})
```

## Accessing PlayerInput

### usePlayer(index)

```ts
import { usePlayer } from '@gwenjs/input'

const p1 = usePlayer(0)   // player 1
const p2 = usePlayer(1)   // player 2
```

### Via InputService

```ts
import { useInput } from '@gwenjs/input'

const input = useInput()
const p1 = input.player(0)
const p2 = input.player(1)

// Shorthand for player 0
const jump = input.action(Jump)  // same as input.player(0).action(Jump)
```

### Via engine injection

```ts
const p1 = engine.inject('player:0')
const p2 = engine.inject('player:1')
```

## Per-player actions

Pass the player index as the second argument to `useAction()`:

```ts
import { useAction } from '@gwenjs/input'

const p1Jump = useAction(Jump, 0)   // player 0
const p2Jump = useAction(Jump, 1)   // player 1
```

## Per-player contexts

Each player maintains its own context stack:

```ts
const p1 = usePlayer(0)
const p2 = usePlayer(1)

// Player 1 is in the pause menu, player 2 keeps playing
p1.activateContext('menu')
// p2's contexts are unaffected
```

## forPlayers

Use `forPlayers` to register a system once per player without duplicating logic:

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

`forPlayers(count, factory)` calls `factory(0)`, `factory(1)`, …, `factory(count - 1)` and returns the results as an array.

## Per-player rebinding

Each player can have independent binding overrides. This enables custom control schemes per player or per accessibility profile:

```ts
const p2 = usePlayer(1)

// Remap Jump for player 2 to a different key
p2.rebind(Jump, 0, Keys.KeyZ)

// Apply a named accessibility profile
p2.activateAccessibilityProfile('one-handed-left')
```

## Persisting bindings

Use `exportBindings` and `importBindings` to save and restore per-player settings:

```ts
// Save player 0's bindings to localStorage
const snapshot = p1.exportBindings()
localStorage.setItem('bindings-p0', JSON.stringify(snapshot))

// Restore on next boot via plugin config
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

See [`PlayerInput`](/api/player-input) for the full rebinding API.
