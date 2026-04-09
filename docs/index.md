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

<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:24px 0 8px">
  <a href="https://www.npmjs.com/package/@gwenjs/input"><img src="https://img.shields.io/npm/v/@gwenjs/input?style=flat-square&color=crimson" alt="npm version" /></a>
  <a href="https://github.com/gwenjs/input/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/gwenjs/input/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <a href="https://gwenjs.github.io/input/"><img src="https://img.shields.io/badge/docs-gwenjs.github.io%2Finput-blue?style=flat-square" alt="Docs" /></a>
  <a href="https://www.mozilla.org/en-US/MPL/2.0/"><img src="https://img.shields.io/badge/license-MPL--2.0-orange?style=flat-square" alt="License: MPL-2.0" /></a>
</div>
