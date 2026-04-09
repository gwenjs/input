# Changelog

## [0.1.0](https://github.com/gwenjs/input/commits/input-v0.1.0) (2026-04-09)

### Features

* scaffold @gwenjs/input package ([0c24daf](https://github.com/gwenjs/input/commit/0c24daf))
* **types:** add core action types, ActionState, ActionSchemaMap, RefsFromSchema ([eb4532e](https://github.com/gwenjs/input/commit/eb4532e))
* **constants:** add Keys, GamepadButtons, GamepadStick, GyroAxis constants ([ac77937](https://github.com/gwenjs/input/commit/ac77937))
* **actions:** add defineAction and defineInputSchema with const generic inference ([50eb8dc](https://github.com/gwenjs/input/commit/50eb8dc))
* **contexts:** add bind, BindingEntry, composite/mouse/touch/gyro sources ([49ab312](https://github.com/gwenjs/input/commit/49ab312))
* **plugin:** add InputPluginConfig, normalizeConfig, InputPlugin shell, InputPluginHooks ([47e8fc3](https://github.com/gwenjs/input/commit/47e8fc3))
* **module:** update augment, module, and index barrel exports ([4983bed](https://github.com/gwenjs/input/commit/4983bed))
* **processors:** add DeadZone, Scale, Invert, Clamp, Normalize, Smooth, SwizzleXY + ProcessorPipeline ([23c5151](https://github.com/gwenjs/input/commit/23c5151))
* **interactions:** add Press, Release, Tap, Hold, DoubleTap, AllOf, ChordedWith, Toggle, Repeat + InteractionPipeline ([447441e](https://github.com/gwenjs/input/commit/447441e))
* **devices:** add KeyboardDevice, MouseDevice, GamepadDevice, TouchDevice stub, GyroDevice ([31ae52e](https://github.com/gwenjs/input/commit/31ae52e))
* **players:** add PlayerInput, InputService, binding resolver, wire plugin provides ([b9b99e2](https://github.com/gwenjs/input/commit/b9b99e2))
* **composables:** add useAction, usePlayer, useKeyboard, useMouse, useGamepad, useTouch, useGyro, usePointer ([d10dbc5](https://github.com/gwenjs/input/commit/d10dbc5))
* **touch:** implement TouchDevice, TouchGesture, VirtualControls overlay ([2af2aa2](https://github.com/gwenjs/input/commit/2af2aa2))
* **recording:** add InputRecorder, InputPlayback, InputRecording format ([823b4e7](https://github.com/gwenjs/input/commit/823b4e7))
* **debug:** add InputDebugAPI, InputDebugSnapshot, DevOverlay ([6ffe0b9](https://github.com/gwenjs/input/commit/6ffe0b9))
* implement captureNextInput scan, usePointer touch, remove stubs ([9a807a2](https://github.com/gwenjs/input/commit/9a807a2))
* spec compliance — forPlayers, accessibility, gyro APIs, engine hooks, useGyroscope, README, type tests ([f224d90](https://github.com/gwenjs/input/commit/f224d90))
* add comprehensive tests for full branch coverage ([acf3f57](https://github.com/gwenjs/input/commit/acf3f57))

### Bug Fixes

* **plugin:** move config normalization to closure, fix SSR fallback, add provides/providesHooks ([ace896e](https://github.com/gwenjs/input/commit/ace896e))
* **module:** remove unimplemented useAction/usePlayer from auto-imports ([1a7c260](https://github.com/gwenjs/input/commit/1a7c260))
* **devices:** correct gyro roll/pitch mapping, reset cachedRect in mouse attach, optional device teardown ([1e1e791](https://github.com/gwenjs/input/commit/1e1e791))
* **interactions:** fix Tap double-fire, ChordedWith pre-pass suppression, Repeat delay carry-over ([ea7a076](https://github.com/gwenjs/input/commit/ea7a076))
* **players:** two-pass ChordedWith eval, AllOf gamepad support, SSR guard ([ebfca93](https://github.com/gwenjs/input/commit/ebfca93))
* **composables:** fix usePlayer default, usePointer touch stub, stale comment, slot naming ([0865e67](https://github.com/gwenjs/input/commit/0865e67))
* **touch:** began→stationary transition, changedTouches, swipe fingers+velocity, pinch JSDoc, export types ([f142661](https://github.com/gwenjs/input/commit/f142661))
* **recording:** relative frame index, loop state reset, O(n²) apply, fromJSON validation ([e8ea1e1](https://github.com/gwenjs/input/commit/e8ea1e1))
* **debug:** playback state in snapshot, recFrame during recording, device event semantics, splice→shift ([6a55052](https://github.com/gwenjs/input/commit/6a55052))
* **typecheck:** fix EventListener casts, implicit any, and test type errors ([1d19003](https://github.com/gwenjs/input/commit/1d19003))
* **lint:** resolve all oxlint warnings — dead code, stale comments, unused vars ([8f37ae8](https://github.com/gwenjs/input/commit/8f37ae8))
* **build:** externalize @gwenjs/kit subpaths in vite config ([30120e7](https://github.com/gwenjs/input/commit/30120e7))
* **deps:** upgrade to @gwenjs/core@^0.2.0 and @gwenjs/kit@^0.2.0 ([a450c57](https://github.com/gwenjs/input/commit/a450c57))
* **ci:** remove lock file from gitignore and add pnpm-lock ([a0d679f](https://github.com/gwenjs/input/commit/a0d679f))
* **ci:** remove NODE_AUTH_TOKEN, OIDC handles npm auth ([9fba403](https://github.com/gwenjs/input/commit/9fba403))
