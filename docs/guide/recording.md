# Recording & Playback

`@gwenjs/input` includes a built-in recording and playback system. Records are delta-encoded per-frame action state snapshots that can be replayed at any speed.

## Use cases

- **Deterministic replays** — ship replay files for speedrun validation or highlight reels.
- **Automated testing** — record a session once, replay it in CI to assert game outcomes.
- **Bug reproduction** — let players export a recording when they hit a bug, import it to reproduce exactly.
- **Tutorial playback** — pre-record a tutorial sequence and play it back as a ghost.

## Recording

Obtain the recorder via `useInputRecorder()` or `useInput().recorder`:

```ts
import { useInputRecorder } from '@gwenjs/input'

const recorder = useInputRecorder()

// Start recording
recorder.start()

// … play through the scenario …

// Stop and export
recorder.stop()
const recording = recorder.export()

// Serialize to JSON for storage
const json = JSON.stringify(recording)
localStorage.setItem('my-recording', json)
```

### Recorder API

| Method / Property | Description |
|-------------------|-------------|
| `start()` | Begin recording. Clears previous data. Throws if already recording. |
| `stop()` | End recording. The captured data is available via `export()`. |
| `export()` | Returns the `InputRecording` object. |
| `state` | Current state: `'idle'` or `'recording'`. |
| `frameCount` | Number of frames captured so far. |

## Playback

Obtain the playback instance via `useInputPlayback()` or `useInput().playback`:

```ts
import { useInputPlayback } from '@gwenjs/input'

const playback = useInputPlayback()

// Load a recording
const json = localStorage.getItem('my-recording')
if (json) {
  playback.load(JSON.parse(json))
  playback.play()
}
```

### Playback API

| Method / Property | Description |
|-------------------|-------------|
| `load(recording)` | Load a recording and reset the playback head to frame 0. |
| `play()` | Begin playback. Overrides live device input for all players. |
| `pause()` | Pause playback at the current frame. |
| `stop()` | Stop playback and restore live device input. |
| `seek(frame)` | Jump to a specific frame index. |
| `state` | Current state: `'idle'`, `'playing'`, or `'paused'`. |
| `isPlaying` | `true` while playback is active and not paused. |
| `currentFrame` | Integer frame index of the current playback head. |
| `frameCount` | Total frames in the loaded recording. |
| `loop` | When `true`, playback restarts after the last frame. Default: `false`. |
| `speed` | Playback speed multiplier. `1` = real-time, `0.5` = half speed, `2` = double. Default: `1`. |
| `onFrame(cb)` | Register a callback fired each frame with the current frame index. |
| `onComplete(cb)` | Register a callback fired when playback finishes. |

### Seeking

```ts
// Jump to frame 120 (2 seconds into a 60 fps recording)
playback.seek(120)
```

### Speed control

```ts
// Half speed for dramatic replay
playback.speed = 0.5
playback.play()
```

## Auto-play on boot

Pass a recording to the plugin config to start playback immediately when the engine boots:

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

- `holdTime` is not recorded or replayed. Systems depending on exact hold duration during playback will see `holdTime: 0`.
- The recording format is delta-encoded: only changed values are stored each frame, keeping file sizes small.
- Recordings are valid JSON and can be committed alongside test fixtures.
