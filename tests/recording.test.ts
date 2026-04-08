import { describe, it, expect, beforeEach, vi } from "vitest";
import { InputRecorder } from "../src/recording/recorder.js";
import { InputPlayback } from "../src/recording/playback.js";
import { InputRecording } from "../src/recording/types.js";
import { PlayerInput } from "../src/players/player-input.js";
import { InputContext } from "../src/contexts/input-context.js";
import { KeyboardDevice } from "../src/devices/keyboard.js";
import { MouseDevice } from "../src/devices/mouse.js";
import { GamepadDevice } from "../src/devices/gamepad.js";
import { TouchDevice } from "../src/devices/touch.js";
import { GyroDevice } from "../src/devices/gyro.js";
import { defineAction } from "../src/actions/define-action.js";
import { bind } from "../src/contexts/binding.js";
import { defineInputContext } from "../src/contexts/define-input-context.js";

function makeDevices() {
  return {
    keyboard: new KeyboardDevice(),
    mouse: new MouseDevice(),
    gamepad: new GamepadDevice(),
    touch: new TouchDevice(),
    gyro: new GyroDevice(),
  };
}

function makePlayer(index = 0) {
  const devices = makeDevices();
  const context = new InputContext();
  const player = new PlayerInput(index, context, devices, { type: "keyboard+mouse", slot: 0 });
  return { player, context, devices };
}

describe("InputRecorder", () => {
  let player: PlayerInput;
  let recorder: InputRecorder;

  beforeEach(() => {
    const { player: p } = makePlayer();
    player = p;
    recorder = new InputRecorder([player], 60);
  });

  it("initializes in idle state", () => {
    expect(recorder.state).toBe("idle");
    expect(recorder.frameCount).toBe(0);
  });

  it("starts recording", () => {
    recorder.start();

    expect(recorder.state).toBe("recording");
  });

  it("throws when starting while already recording", () => {
    recorder.start();

    expect(() => recorder.start()).toThrow();
  });

  it("stops recording", () => {
    recorder.start();
    recorder.stop();

    expect(recorder.state).toBe("idle");
  });

  it("captures frames during recording", () => {
    recorder.start();
    recorder._captureFrame(0);
    recorder._captureFrame(1);
    recorder._captureFrame(2);
    recorder.stop();

    expect(recorder.frameCount).toBe(3);
  });

  it("exports recording", () => {
    recorder.start();
    recorder._captureFrame(0);
    recorder.stop();

    const recording = recorder.export();

    expect(recording.version).toBe(1);
    expect(recording.frameCount).toBe(1);
    expect(recording.targetFps).toBe(60);
    expect(recording.playerCount).toBe(1);
  });

  it("throws when exporting while recording", () => {
    recorder.start();

    expect(() => recorder.export()).toThrow();
  });

  it("throws when exporting with no frames", () => {
    expect(() => recorder.export()).toThrow();
  });

  it("records action changes only (delta encoding)", () => {
    // Create a fresh player+recorder for this test
    const { context, devices, player: p } = makePlayer();
    const freshRecorder = new InputRecorder([p], 60);
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    p.activateContext("gameplay");

    freshRecorder.start();

    // Frame 0: no input (no change → no frame stored)
    p._updateFrame(0.016);
    freshRecorder._captureFrame(0);

    // Frame 1: press space → change stored
    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();
    p._updateFrame(0.016);
    freshRecorder._captureFrame(1);

    freshRecorder.stop();
    devices.keyboard.detach(window);

    const recording = freshRecorder.export();

    // Delta encoding: only frame 1 is stored (it has a change)
    expect(recording.frames.length).toBeGreaterThan(0);
    const changeFrame = recording.frames.find((f) => f.index === 1);
    expect(changeFrame).toBeDefined();
    expect(changeFrame!.changes.length).toBeGreaterThan(0);
  });

  it("stores action names in recording", () => {
    const { context, player } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    recorder.start();
    player._updateFrame(16);
    recorder._captureFrame(0);
    recorder.stop();

    const recording = recorder.export();

    // Action names are only recorded if there's a change or if they're registered
    expect(recording.actionNames).toBeDefined();
    expect(Array.isArray(recording.actionNames)).toBe(true);
  });
});

describe("InputPlayback", () => {
  let player: PlayerInput;
  let playback: InputPlayback;

  beforeEach(() => {
    const { player: p } = makePlayer();
    player = p;
    playback = new InputPlayback([player]);
  });

  it("initializes in idle state", () => {
    expect(playback.state).toBe("idle");
    expect(playback.isPlaying).toBe(false);
  });

  it("loads a recording", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 10,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["jump"],
      frames: Array.from({ length: 10 }, (_, i) => ({ index: i, changes: [] })),
    };

    playback.load(recording);

    expect(playback.frameCount).toBe(10);
  });

  it("plays recording", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 10,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: Array.from({ length: 10 }, (_, i) => ({ index: i, changes: [] })),
    };

    playback.load(recording);
    playback.play();

    expect(playback.state).toBe("playing");
    expect(playback.isPlaying).toBe(true);
  });

  it("throws when playing without loaded recording", () => {
    expect(() => playback.play()).toThrow();
  });

  it("pauses playback", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 10,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: Array.from({ length: 10 }, (_, i) => ({ index: i, changes: [] })),
    };

    playback.load(recording);
    playback.play();
    playback.pause();

    expect(playback.state).toBe("paused");
    expect(playback.isPlaying).toBe(false);
  });

  it("stops playback", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 10,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: Array.from({ length: 10 }, (_, i) => ({ index: i, changes: [] })),
    };

    playback.load(recording);
    playback.play();
    playback.stop();

    expect(playback.state).toBe("idle");
    expect(playback.currentFrame).toBe(0);
  });

  it("seeks to frame", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 10,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: Array.from({ length: 10 }, (_, i) => ({ index: i, changes: [] })),
    };

    playback.load(recording);
    playback.seek(5);

    expect(playback.currentFrame).toBe(5);
  });

  it("advances frames during playback", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 10,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: Array.from({ length: 10 }, (_, i) => ({ index: i, changes: [] })),
    };

    playback.load(recording);
    playback.play();

    const frameDt = 1000 / 60;
    playback._tick(frameDt);

    expect(playback.currentFrame).toBeGreaterThan(0);
  });

  it("completes playback at end", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: [
        { index: 0, changes: [] },
        { index: 1, changes: [] },
      ],
    };

    playback.load(recording);
    playback.play();

    const frameDt = 1000 / 60;
    playback._tick(frameDt);
    playback._tick(frameDt);
    playback._tick(frameDt);

    expect(playback.state).toBe("idle");
  });

  it("loops playback when enabled", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: [
        { index: 0, changes: [] },
        { index: 1, changes: [] },
      ],
    };

    playback.loop = true;
    playback.load(recording);
    playback.play();

    const frameDt = 1000 / 60;
    playback._tick(frameDt);
    playback._tick(frameDt);
    playback._tick(frameDt);

    expect(playback.state).toBe("playing");
    expect(playback.currentFrame).toBe(0);
  });

  it("respects speed multiplier", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 10,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: Array.from({ length: 10 }, (_, i) => ({ index: i, changes: [] })),
    };

    playback.speed = 2;
    playback.load(recording);
    playback.play();

    const frameDt = 1000 / 60;
    const frame1 = playback.currentFrame;
    playback._tick(frameDt);
    const frame2 = playback.currentFrame;

    // With 2x speed, should advance more than 1 frame
    expect(frame2 - frame1).toBeGreaterThan(1);
  });

  it("fires onComplete callback", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: [
        { index: 0, changes: [] },
        { index: 1, changes: [] },
      ],
    };

    let completed = false;
    playback.onComplete(() => {
      completed = true;
    });

    playback.load(recording);
    playback.play();

    const frameDt = 1000 / 60;
    playback._tick(frameDt);
    playback._tick(frameDt);
    playback._tick(frameDt);

    expect(completed).toBe(true);
  });

  it("fires onFrame callback", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 10,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: Array.from({ length: 10 }, (_, i) => ({ index: i, changes: [] })),
    };

    let frameCount = 0;
    playback.onFrame(() => {
      frameCount++;
    });

    playback.load(recording);
    playback.play();

    const frameDt = 1000 / 60;
    playback._tick(frameDt);

    expect(frameCount).toBeGreaterThan(0);
  });

  it("unsubscribes callback", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 10,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: Array.from({ length: 10 }, (_, i) => ({ index: i, changes: [] })),
    };

    let frameCount = 0;
    const unsubscribe = playback.onFrame(() => {
      frameCount++;
    });

    unsubscribe();

    playback.load(recording);
    playback.play();

    const frameDt = 1000 / 60;
    playback._tick(frameDt);

    expect(frameCount).toBe(0);
  });

  it("clears playback states on stop", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: [
        { index: 0, changes: [] },
        { index: 1, changes: [] },
      ],
    };

    playback.load(recording);
    playback.play();
    playback.stop();

    expect(player._playbackStates).toBeNull();
  });
});

describe("InputRecording.fromJSON", () => {
  it("parses valid recording", () => {
    const json = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["jump"],
      frames: [
        { index: 0, changes: [] },
        { index: 1, changes: [{ actionIndex: 0, player: 0, value: true }] },
      ],
    };

    const recording = InputRecording.fromJSON(json);

    expect(recording.version).toBe(1);
    expect(recording.frameCount).toBe(2);
  });

  it("throws on invalid version", () => {
    const json = {
      version: 2,
      frameCount: 0,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: [],
    };

    expect(() => InputRecording.fromJSON(json)).toThrow();
  });

  it("throws on missing fields", () => {
    const json = {
      version: 1,
      frameCount: 0,
    };

    expect(() => InputRecording.fromJSON(json)).toThrow();
  });

  it("validates change.player out of bounds", () => {
    const json = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["jump"],
      frames: [{ index: 0, changes: [{ actionIndex: 0, player: 5, value: true }] }],
    };

    expect(() => InputRecording.fromJSON(json)).toThrow();
  });

  it("validates change.player is negative", () => {
    const json = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["jump"],
      frames: [{ index: 0, changes: [{ actionIndex: 0, player: -1, value: true }] }],
    };

    expect(() => InputRecording.fromJSON(json)).toThrow();
  });

  it("validates change.actionIndex out of range", () => {
    const json = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["jump"],
      frames: [{ index: 0, changes: [{ actionIndex: 99, player: 0, value: true }] }],
    };

    expect(() => InputRecording.fromJSON(json)).toThrow();
  });

  it("validates change.value is valid type", () => {
    const json = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["jump"],
      frames: [{ index: 0, changes: [{ actionIndex: 0, player: 0, value: "invalid" }] }],
    };

    expect(() => InputRecording.fromJSON(json)).toThrow();
  });

  it("validates change must be object", () => {
    const json = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["jump"],
      frames: [{ index: 0, changes: ["not-an-object"] }],
    };

    expect(() => InputRecording.fromJSON(json)).toThrow();
  });

  it("validates change.player must be number", () => {
    const json = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["jump"],
      frames: [{ index: 0, changes: [{ actionIndex: 0, player: "wrong", value: true }] }],
    };

    expect(() => InputRecording.fromJSON(json)).toThrow();
  });

  it("accepts {x,y} object as change value", () => {
    const json = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["move"],
      frames: [{ index: 0, changes: [{ actionIndex: 0, player: 0, value: { x: 0.5, y: -0.3 } }] }],
    };

    const recording = InputRecording.fromJSON(json);
    expect(recording.frames[0].changes[0].value).toEqual({ x: 0.5, y: -0.3 });
  });

  it("accepts number as change value", () => {
    const json = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["throttle"],
      frames: [{ index: 0, changes: [{ actionIndex: 0, player: 0, value: 0.8 }] }],
    };

    const recording = InputRecording.fromJSON(json);
    expect(recording.frames[0].changes[0].value).toBe(0.8);
  });
});

describe("InputRecording.toJSON", () => {
  it("serializes recording to JSON string", () => {
    const recording: InputRecording = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["jump"],
      frames: [
        { index: 0, changes: [] },
        { index: 1, changes: [] },
      ],
    };

    const json = InputRecording.toJSON(recording);

    expect(typeof json).toBe("string");
    expect(JSON.parse(json)).toEqual(recording);
  });
});

describe("Integration: Recording and Playback", () => {
  it("records and plays back button input", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);

    const recorder = new InputRecorder([player], 60);

    // Record
    recorder.start();

    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();
    player._updateFrame(16);
    recorder._captureFrame(0);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    devices.keyboard.update();
    player._updateFrame(16);
    recorder._captureFrame(1);

    recorder.stop();
    devices.keyboard.detach(window);

    const recording = recorder.export();

    // Playback
    const playback = new InputPlayback([player]);
    playback.load(recording);
    playback.play();

    const frameDt = 1000 / 60;
    playback._tick(frameDt);

    // After one frame of playback, the button should reflect the recorded state
    // Since we recorded a press on frame 0, it should be active
    const state = player.action(action);
    expect(state.type).toBe("button");
  });
});

describe("Recording with axis1d and axis2d actions", () => {
  it("records axis1d changes", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("throttle", { type: "axis1d" });
    const source = { _type: "composite1d" as const, positive: "KeyD", negative: "KeyA" };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const recorder = new InputRecorder([player], 60);
    recorder.start();

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
    devices.keyboard.update();
    player._updateFrame(0.016);
    recorder._captureFrame(0);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyD" }));
    devices.keyboard.update();
    player._updateFrame(0.016);
    recorder._captureFrame(1);

    recorder.stop();
    devices.keyboard.detach(window);

    const recording = recorder.export();
    expect(recording.frameCount).toBe(2);
    // At least frame 0 should have a change (KeyD pressed → value > 0)
    const frame0 = recording.frames.find((f) => f.index === 0);
    expect(frame0).toBeDefined();
  });

  it("records axis2d changes", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("move", { type: "axis2d" });
    const source = {
      _type: "composite2d" as const,
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const recorder = new InputRecorder([player], 60);
    recorder.start();

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    devices.keyboard.update();
    player._updateFrame(0.016);
    recorder._captureFrame(0);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    devices.keyboard.update();
    player._updateFrame(0.016);
    recorder._captureFrame(1);

    recorder.stop();
    devices.keyboard.detach(window);

    const recording = recorder.export();
    expect(recording.frameCount).toBe(2);
  });

  it("plays back axis1d recording", () => {
    const { player, context } = makePlayer();
    const action = defineAction("throttle", { type: "axis1d" });
    const binding = bind(action, "KeyD"); // register action in context
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });
    context.register(def);
    player.activateContext("gameplay");

    const recording: InputRecording = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["throttle"],
      frames: [
        { index: 0, changes: [{ player: 0, actionIndex: 0, value: 0.8 }] },
        { index: 1, changes: [{ player: 0, actionIndex: 0, value: 0.0 }] },
      ],
    };

    const playback = new InputPlayback([player]);
    playback.load(recording);
    playback.play();

    const frameDt = 1000 / 60;
    playback._tick(frameDt);

    const state = player.action(action);
    expect(state.type).toBe("axis1d");
  });

  it("plays back axis2d recording", () => {
    const { player, context } = makePlayer();
    const action = defineAction("move", { type: "axis2d" });
    const source = {
      _type: "composite2d" as const,
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    };
    const binding = bind(action, source); // register action in context
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });
    context.register(def);
    player.activateContext("gameplay");

    const recording: InputRecording = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["move"],
      frames: [
        { index: 0, changes: [{ player: 0, actionIndex: 0, value: { x: 0.5, y: -0.5 } }] },
        { index: 1, changes: [] },
      ],
    };

    const playback = new InputPlayback([player]);
    playback.load(recording);
    playback.play();

    const frameDt = 1000 / 60;
    playback._tick(frameDt);

    const state = player.action(action);
    expect(state.type).toBe("axis2d");
  });

  it("_valuesEqual handles axis2d comparison", () => {
    const { player, context } = makePlayer();
    const action = defineAction("move", { type: "axis2d" });
    const source = {
      _type: "composite2d" as const,
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    // Record two frames: first with input, second identical (should not generate a change)
    const recorder = new InputRecorder([player], 60);
    recorder.start();
    player._updateFrame(0.016);
    recorder._captureFrame(0);
    player._updateFrame(0.016);
    recorder._captureFrame(1); // same values → no change

    recorder.stop();
    const recording = recorder.export();
    // Frame 0 may have initial change, frame 1 should have no changes
    const frame1 = recording.frames.find((f) => f.index === 1);
    if (frame1) {
      expect(frame1.changes.length).toBe(0);
    }
  });
});

describe("InputRecorder - additional branch coverage", () => {
  it("deduplicates shared action refs across multiple players", () => {
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    const { player: p1, context: ctx1 } = makePlayer(0);
    const { player: p2, context: ctx2 } = makePlayer(1);

    ctx1.register(def);
    ctx2.register(def);
    p1.activateContext("gameplay");
    p2.activateContext("gameplay");

    const recorder = new InputRecorder([p1, p2], 60);
    recorder.start();

    p1._updateFrame(0.016);
    p2._updateFrame(0.016);
    recorder._captureFrame(0);
    recorder.stop();

    const recording = recorder.export();
    // Same action ref in both players → deduplicated to single entry
    expect(recording.actionNames).toHaveLength(1);
    expect(recording.actionNames[0]).toBe("jump");
  });

  it("_captureFrame is a no-op when recorder is not recording", () => {
    const { player } = makePlayer();
    const recorder = new InputRecorder([player], 60);
    // Never called start() — recorder is in 'idle' state
    recorder._captureFrame(0);
    expect(recorder.frameCount).toBe(0);
  });
});

describe("InputPlayback - frame advance branch coverage", () => {
  let playback: InputPlayback;
  let player: PlayerInput;

  beforeEach(() => {
    const { player: p, context } = makePlayer();
    player = p;
    const action = defineAction("move", { type: "axis2d" });
    const source = {
      _type: "composite2d" as const,
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });
    context.register(def);
    player.activateContext("gameplay");
    playback = new InputPlayback([player]);
  });

  it("advances through frames without reaching end (newFrameInt > prevFrameInt path)", () => {
    // Create a large recording so we don't hit end in one tick
    const recording: InputRecording = {
      version: 1,
      frameCount: 100,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: Array.from({ length: 100 }, (_, i) => ({ index: i, changes: [] })),
    };

    playback.load(recording);
    playback.play();

    // dt in seconds: 1/60 second at targetFps=60 → advance exactly 1 frame
    playback._tick(1 / 60);

    expect(playback.currentFrame).toBe(1);
    expect(playback.state).toBe("playing");
  });

  it("_defaultValue returns {x:0,y:0} for axis2d action with no prior recorded value", () => {
    // axis2d action in the recording with a change so _defaultValue({x,y}) is triggered
    const action = defineAction("pos", { type: "axis2d" });
    const binding = bind(action, {
      _type: "composite2d" as const,
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    });
    const { player: p2, context: ctx2 } = makePlayer(1);
    ctx2.register(defineInputContext("gameplay", { priority: 10, bindings: [binding] }));
    p2.activateContext("gameplay");

    const pb2 = new InputPlayback([p2]);
    const recording: InputRecording = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["pos"],
      frames: [
        { index: 0, changes: [{ player: 0, actionIndex: 0, value: { x: 0.5, y: 0.5 } }] },
        { index: 1, changes: [{ player: 0, actionIndex: 0, value: { x: 0.0, y: 0.0 } }] },
      ],
    };

    pb2.load(recording);
    pb2.play();
    pb2._tick(1 / 60);

    const state = p2.action(action);
    expect(state.type).toBe("axis2d");
  });
});

describe("InputRecording.fromJSON - additional error branches", () => {
  const base = {
    version: 1,
    frameCount: 1,
    targetFps: 60,
    playerCount: 1,
    actionNames: ["jump"],
  };

  it("throws when frames is not an array", () => {
    expect(() => InputRecording.fromJSON({ ...base, frames: "bad" })).toThrow(
      /frames must be an array/,
    );
  });

  it("throws when frame element is not an object", () => {
    expect(() => InputRecording.fromJSON({ ...base, frames: [42] })).toThrow(/must be an object/);
  });

  it("throws when frame.index is not a number", () => {
    expect(() =>
      InputRecording.fromJSON({ ...base, frames: [{ index: "bad", changes: [] }] }),
    ).toThrow(/index must be a number/);
  });

  it("throws when frame.changes is not an array", () => {
    expect(() =>
      InputRecording.fromJSON({ ...base, frames: [{ index: 0, changes: "bad" }] }),
    ).toThrow(/changes must be an array/);
  });
});

describe("InputRecorder - stop when idle is a no-op", () => {
  it("stop() when not recording does nothing", () => {
    const { player } = makePlayer();
    const recorder = new InputRecorder([player], 60);
    // recorder is in 'idle' state — calling stop() should be a no-op (the false branch of if (_state==='recording'))
    recorder.stop();
    expect(recorder.state).toBe("idle");
  });
});

describe("InputPlayback - seek without loaded recording", () => {
  it("seek() throws when no recording is loaded", () => {
    const { player } = makePlayer();
    const playback = new InputPlayback([player]);
    // No recording loaded → seek should throw
    expect(() => playback.seek(0)).toThrow(/no recording loaded/);
  });
});

describe("InputRecording.fromJSON - object/null/invalid validation", () => {
  it("throws when input is not an object (null)", () => {
    expect(() => InputRecording.fromJSON(null)).toThrow(/expected an object/);
  });

  it("throws when input is a string", () => {
    expect(() => InputRecording.fromJSON("not-an-object")).toThrow(/expected an object/);
  });

  it("throws when frameCount is negative", () => {
    expect(() =>
      InputRecording.fromJSON({
        version: 1,
        frameCount: -1,
        targetFps: 60,
        playerCount: 1,
        actionNames: [],
        frames: [],
      }),
    ).toThrow(/frameCount/);
  });

  it("throws when playerCount is zero", () => {
    expect(() =>
      InputRecording.fromJSON({
        version: 1,
        frameCount: 0,
        targetFps: 60,
        playerCount: 0,
        actionNames: [],
        frames: [],
      }),
    ).toThrow(/playerCount/);
  });

  it("throws when actionNames contains non-string", () => {
    expect(() =>
      InputRecording.fromJSON({
        version: 1,
        frameCount: 0,
        targetFps: 60,
        playerCount: 1,
        actionNames: [42],
        frames: [],
      }),
    ).toThrow(/actionNames/);
  });
});

describe("InputPlayback - out-of-bounds player in seek()", () => {
  it("accumulated?.set skips when player index exceeds playback player count", () => {
    const { player, context } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });
    context.register(def);
    player.activateContext("gameplay");

    const playback = new InputPlayback([player]); // Only 1 player (index 0)

    // Recording with playerCount=2 but a change for player=1 (out of bounds in playback)
    const recording: InputRecording = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 2,
      actionNames: ["jump"],
      frames: [
        {
          index: 0,
          changes: [
            { player: 0, actionIndex: 0, value: true }, // valid
            { player: 1, actionIndex: 0, value: true }, // player 1 not in playback
          ],
        },
      ],
    };

    playback.load(recording);
    // seek() processes frames; _accumulated[1]?.set(...) should gracefully skip via ?.
    expect(() => playback.seek(0)).not.toThrow();
    expect(playback.currentFrame).toBe(0);
  });
});

describe("InputPlayback - _applyFrame and _pushPlaybackStates branch coverage", () => {
  it("_applyFrame skips out-of-bounds player via continue", () => {
    const { player, context } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });
    context.register(def);
    player.activateContext("gameplay");

    // 1 player in playback, but recording has change for player=1 (out of bounds)
    const playback = new InputPlayback([player]);
    const recording: InputRecording = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 2,
      actionNames: ["jump"],
      frames: [
        { index: 0, changes: [{ player: 1, actionIndex: 0, value: true }] },
        { index: 1, changes: [] },
      ],
    };

    playback.load(recording);
    playback.play();
    // tick triggers _applyFramesInRange → _applyFrame → if (!_accumulated[1]) continue
    expect(() => playback._tick(1 / 60)).not.toThrow();
  });

  it("_pushPlaybackStates skips unknown action names (ref not found → continue)", () => {
    const { player } = makePlayer();
    // Player has NO registered actions

    const playback = new InputPlayback([player]);
    const recording: InputRecording = {
      version: 1,
      frameCount: 2,
      targetFps: 60,
      playerCount: 1,
      actionNames: ["nonexistent_action"], // not in player's context
      frames: [
        { index: 0, changes: [{ player: 0, actionIndex: 0, value: true }] },
        { index: 1, changes: [] },
      ],
    };

    playback.load(recording);
    playback.play();
    // Tick triggers _pushPlaybackStates → nameToRef.get('nonexistent_action') = undefined → !ref → continue
    expect(() => playback._tick(1 / 60)).not.toThrow();
  });
});

// ─── Playback — onComplete unsubscribe ────────────────────────────────────────

describe("InputPlayback — onComplete unsubscribe", () => {
  function makePlayer() {
    const devices = {
      keyboard: new KeyboardDevice(),
      mouse: new MouseDevice(),
      gamepad: new GamepadDevice(),
      touch: new TouchDevice(),
      gyro: new GyroDevice(),
    };
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    return player;
  }

  it("unsubscribe fn removes callback so it is not invoked on completion", () => {
    const player = makePlayer();
    const playback = new InputPlayback([player]);

    const recording = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: [{ index: 0, changes: [] }],
    };

    const cb = vi.fn();
    const unsubscribe = playback.onComplete(cb);

    // Remove the listener before playback finishes
    unsubscribe();

    playback.load(recording);
    playback.play();
    playback._tick(1 / 60); // advance past last frame

    expect(cb).not.toHaveBeenCalled();
  });

  it("callback is invoked on completion when NOT unsubscribed", () => {
    const player = makePlayer();
    const playback = new InputPlayback([player]);

    const recording = {
      version: 1,
      frameCount: 1,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: [{ index: 0, changes: [] }],
    };

    const cb = vi.fn();
    playback.onComplete(cb);
    playback.load(recording);
    playback.play();
    playback._tick(1 / 60);

    expect(cb).toHaveBeenCalled();
  });
});


// ─── InputPlayback - seek on empty recording ─────────────────────────────────

describe("InputPlayback - seek on empty recording", () => {
  it("seek() is a no-op when frameCount is 0", () => {
    const { player } = makePlayer();
    const playback = new InputPlayback([player]);
    const emptyRecording: InputRecording = {
      version: 1,
      frameCount: 0,
      targetFps: 60,
      playerCount: 1,
      actionNames: [],
      frames: [],
    };
    playback.load(emptyRecording);
    expect(() => playback.seek(0)).not.toThrow();
    expect(() => playback.seek(5)).not.toThrow();
  });
});
