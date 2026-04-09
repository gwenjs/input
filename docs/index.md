---
layout: home

hero:
  name: "@gwenjs/input"
  text: "Input for GWEN"
  tagline: Keyboard, mouse, gamepad, touch and gyroscope — unified action system, stackable contexts, runtime rebinding.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/

features:
  - title: Type-safe actions
    details: Define typed actions with defineAction and ActionRef — button, axis1d, and axis2d. Full TypeScript inference flows from defineAction through useAction.
  - title: Stackable input contexts
    details: Declare named contexts with priorities. Activate and deactivate them at runtime per player — gameplay, menus, vehicles, cutscenes, all coexist cleanly.
  - title: Runtime rebinding + accessibility profiles
    details: Players can remap any binding at runtime. Ship named accessibility presets and let players activate them with a single call.
  - title: Multi-player support
    details: Up to 4 local players, each with independent context stacks and rebindings. Access each via usePlayer(index) or engine.inject('player:0').
  - title: Recording & playback
    details: Record input sessions and replay them at any speed. Perfect for deterministic replays, automated testing, and reproducing reported bugs.
  - title: Full composable suite
    details: useInput, useAction, usePlayer, useKeyboard, useMouse, useGamepad, useTouch, useGyroscope, usePointer, useInputRecorder, useInputPlayback, forPlayers.
---
