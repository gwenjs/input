# Changelog

## [0.2.0](https://github.com/gwenjs/input/compare/input-v0.1.0...input-v0.2.0) (2026-04-09)


### Features

* **actions:** add defineAction and defineInputSchema with const generic inference ([50eb8dc](https://github.com/gwenjs/input/commit/50eb8dc6b98299861495d71c0bd69c2a38f5eda1))
* add comprehensive tests for full branch coverage ([acf3f57](https://github.com/gwenjs/input/commit/acf3f57fa5f08866029df07a78765ee54b3aa9fe))
* **composables:** add useAction, usePlayer, useKeyboard, useMouse, useGamepad, useTouch, useGyro, usePointer ([d10dbc5](https://github.com/gwenjs/input/commit/d10dbc5fd20ad766c91c6386fc75d368b663239e))
* **constants:** add Keys, GamepadButtons, GamepadStick, GyroAxis constants ([ac77937](https://github.com/gwenjs/input/commit/ac77937299d1dd8ee8ec0e5732c078f2974ea83b))
* **contexts:** add bind, BindingEntry, composite/mouse/touch/gyro sources ([49ab312](https://github.com/gwenjs/input/commit/49ab3127c6bba649b9f10e00b03b5c0b365522c1))
* **debug:** add InputDebugAPI, InputDebugSnapshot, DevOverlay ([6ffe0b9](https://github.com/gwenjs/input/commit/6ffe0b90befee74c7883bbadbcdbea33408351f0))
* **devices:** add KeyboardDevice, MouseDevice, GamepadDevice, TouchDevice stub, GyroDevice ([31ae52e](https://github.com/gwenjs/input/commit/31ae52e9b73efed5a2fda19ccc336fcd49eb6835))
* implement captureNextInput scan, usePointer touch, remove stubs ([9a807a2](https://github.com/gwenjs/input/commit/9a807a23a2d833539047160aa037c802d23c727d))
* **interactions:** add Press, Release, Tap, Hold, DoubleTap, AllOf, ChordedWith, Toggle, Repeat + InteractionPipeline ([447441e](https://github.com/gwenjs/input/commit/447441ec3dbd0b1095f85c9314edbb2296f1d3be))
* **module:** update augment, module, and index barrel exports ([4983bed](https://github.com/gwenjs/input/commit/4983bedf0fe5ec0d9654c8cd34bfaf0eda942317))
* **players:** add PlayerInput, InputService, binding resolver, wire plugin provides ([b9b99e2](https://github.com/gwenjs/input/commit/b9b99e2100c1158e29daf1a5aa09912f817f5125))
* **plugin:** add InputPluginConfig, normalizeConfig, InputPlugin shell, InputPluginHooks ([47e8fc3](https://github.com/gwenjs/input/commit/47e8fc3a65e876b1d4e5d3994ecdd03080170959))
* **processors:** add DeadZone, Scale, Invert, Clamp, Normalize, Smooth, SwizzleXY + ProcessorPipeline ([23c5151](https://github.com/gwenjs/input/commit/23c5151197ca310f37992c508807cffa4048d5aa))
* **recording:** add InputRecorder, InputPlayback, InputRecording format ([823b4e7](https://github.com/gwenjs/input/commit/823b4e7c5e99776db49b19c5295b353ceee58f77))
* scaffold @gwenjs/input package ([0c24daf](https://github.com/gwenjs/input/commit/0c24daf38cbc23546f4df40dfcfa7a2af4208aeb))
* spec compliance — forPlayers, accessibility, gyro APIs, engine hooks, useGyroscope, README, type tests ([f224d90](https://github.com/gwenjs/input/commit/f224d907be0e61012c86cd86122eaf330d7eb3fa))
* **touch:** implement TouchDevice, TouchGesture, VirtualControls overlay ([2af2aa2](https://github.com/gwenjs/input/commit/2af2aa2f8b1582467028d23286ae7a6e93e893ba))
* **types:** add core action types, ActionState, ActionSchemaMap, RefsFromSchema ([eb4532e](https://github.com/gwenjs/input/commit/eb4532e6ffc5f071d654bf1ccad5ec5931e4d195))


### Bug Fixes

* **build:** externalize @gwenjs/kit subpaths in vite config ([30120e7](https://github.com/gwenjs/input/commit/30120e7cf267024b24eb86a518848a759ebe085d))
* **ci:** remove lock file from gitignore and add pnpm-lock ([a0d679f](https://github.com/gwenjs/input/commit/a0d679f7f1f6cfd98f14f6f2afafab37a8b9a885))
* **ci:** remove NODE_AUTH_TOKEN, OIDC handles npm auth ([9fba403](https://github.com/gwenjs/input/commit/9fba403948b5c493367fede2f1c393dc11e2f2a5))
* **composables:** fix usePlayer default, usePointer touch stub, stale comment, slot naming ([0865e67](https://github.com/gwenjs/input/commit/0865e6722bc1d0334b847d102e726a2612b1d7c8))
* **debug:** playback state in snapshot, recFrame during recording, device event semantics, splice→shift ([6a55052](https://github.com/gwenjs/input/commit/6a550526f33e4141c8da6b16bca68e1f03aaecf3))
* **deps:** upgrade to @gwenjs/core@^0.2.0 and @gwenjs/kit@^0.2.0 ([a450c57](https://github.com/gwenjs/input/commit/a450c573e0301c4184419f3c9e353d001945bdd0))
* **devices:** correct gyro roll/pitch mapping, reset cachedRect in mouse attach, optional device teardown ([1e1e791](https://github.com/gwenjs/input/commit/1e1e791d882a07fde533d09b39a58b4fcfdf13d0))
* **interactions:** fix Tap double-fire, ChordedWith pre-pass suppression, Repeat delay carry-over ([ea7a076](https://github.com/gwenjs/input/commit/ea7a076586435f958524e7d6c7ec54d30dfdaa1c))
* **lint:** resolve all oxlint warnings — dead code, stale comments, unused vars ([8f37ae8](https://github.com/gwenjs/input/commit/8f37ae87d055a60c52b3f9614497186339beee06))
* **module:** remove unimplemented useAction/usePlayer from auto-imports (Phase 7) ([1a7c260](https://github.com/gwenjs/input/commit/1a7c2600465e48025933d67fdedc99829b63bb22))
* **players:** two-pass ChordedWith eval, AllOf gamepad support, SSR guard ([ebfca93](https://github.com/gwenjs/input/commit/ebfca93fc0db82baa1d52b95169acb8ff73b6d71))
* **plugin:** move config normalization to closure, fix SSR fallback, add provides/providesHooks ([ace896e](https://github.com/gwenjs/input/commit/ace896e725b0cad573abcf2a951add6ef8b56074))
* **recording:** relative frame index, loop state reset, O(n²) apply, fromJSON validation ([e8ea1e1](https://github.com/gwenjs/input/commit/e8ea1e1fcdcb0e6e266830d9caa91895d0c58b7c))
* **touch:** began→stationary transition, changedTouches, swipe fingers+velocity, pinch JSDoc, export types ([f142661](https://github.com/gwenjs/input/commit/f1426615a8c462da1330d46250f3f61008c291d0))
* **typecheck:** fix EventListener casts, implicit any, and test type errors ([1d19003](https://github.com/gwenjs/input/commit/1d19003574fd4c2a24ee5339390980a2159f881b))
