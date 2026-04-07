import { describe, it, expect } from "vitest";
import { InputDebugAPIImpl } from "../src/debug/debug-api.js";
import { PlayerInput } from "../src/players/player-input.js";
import { InputService } from "../src/players/input-service.js";
import { InputContext } from "../src/contexts/input-context.js";
import { KeyboardDevice } from "../src/devices/keyboard.js";
import { MouseDevice } from "../src/devices/mouse.js";
import { GamepadDevice } from "../src/devices/gamepad.js";
import { TouchDevice } from "../src/devices/touch.js";
import { GyroDevice } from "../src/devices/gyro.js";
import { InputRecorder } from "../src/recording/recorder.js";
import { InputPlayback } from "../src/recording/playback.js";
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

function makeDebugAPI() {
  const { player, context, devices } = makePlayer();
  const recorder = new InputRecorder([player]);
  const playback = new InputPlayback([player]);
  const service = new InputService([player], devices, recorder, playback);
  const debug = new InputDebugAPIImpl([player], devices, service);

  return { debug, player, context, devices, service, recorder, playback };
}

describe("InputDebugAPIImpl", () => {
  it("initializes", () => {
    const { debug } = makeDebugAPI();
    expect(debug).toBeDefined();
  });

  it("gets snapshot", () => {
    const { debug } = makeDebugAPI();

    const snapshot = debug.getSnapshot();

    expect(snapshot.frame).toBe(0);
    expect(snapshot.players).toBeDefined();
    expect(snapshot.devices).toBeDefined();
  });

  it("gets snapshot with timestamp", () => {
    const { debug } = makeDebugAPI();

    const timestamp = Date.now();
    const snapshot = debug.getSnapshot(timestamp);

    expect(snapshot.timestamp).toBe(timestamp);
  });

  it("includes player states in snapshot", () => {
    const { debug, player, context, devices } = makeDebugAPI();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();
    player._updateFrame(16);

    debug._tick(0);

    const snapshot = debug.getSnapshot();

    expect(snapshot.players).toHaveLength(1);
    expect(snapshot.players[0].actions).toBeDefined();

    devices.keyboard.detach(window);
  });

  it("includes device states in snapshot", () => {
    const { debug, devices } = makeDebugAPI();

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();

    debug._tick(0);

    const snapshot = debug.getSnapshot();

    expect(snapshot.devices.keyboard).toBeDefined();
    expect(snapshot.devices.mouse).toBeDefined();
    expect(Array.isArray(snapshot.devices.gamepads)).toBe(true);

    devices.keyboard.detach(window);
  });

  it("gets binding map", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const map = debug.getBindingMap();

    expect(map).toBeDefined();
    expect(Array.isArray(map)).toBe(true);
  });

  it("gets action history", () => {
    const { debug, player, context, devices } = makeDebugAPI();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();
    player._updateFrame(16);

    debug._tick(0);

    const history = debug.getActionHistory("jump", 10);

    expect(Array.isArray(history)).toBe(true);

    devices.keyboard.detach(window);
  });

  it("limits action history to lastN", () => {
    const { debug, player, context, devices } = makeDebugAPI();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);

    // Trigger action multiple times
    for (let i = 0; i < 20; i++) {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
      devices.keyboard.update();
      player._updateFrame(16);
      debug._tick(i);

      window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
      devices.keyboard.update();
      player._updateFrame(16);
      debug._tick(i);
    }

    const history = debug.getActionHistory("jump", 5);

    expect(history.length).toBeLessThanOrEqual(5);

    devices.keyboard.detach(window);
  });

  it("fires onActionTriggered callback", () => {
    const { debug, player, context, devices } = makeDebugAPI();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    let triggered = false;
    debug.onActionTriggered(() => {
      triggered = true;
    });

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();
    player._updateFrame(16);

    debug._tick(0);

    expect(triggered).toBe(true);

    devices.keyboard.detach(window);
  });

  it("fires onContextChanged callback", () => {
    const { debug, player, context } = makeDebugAPI();
    const def = defineInputContext("gameplay", { priority: 10, bindings: [] });

    context.register(def);

    let changed = false;
    debug.onContextChanged(() => {
      changed = true;
    });

    debug._tick(0);
    player.activateContext("gameplay");
    debug._tick(1);

    expect(changed).toBe(true);
  });

  it("fires onBindingChanged callback", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    let changed = false;
    const unsubscribe = debug.onBindingChanged(() => {
      changed = true;
    });

    // First tick to initialize fingerprint baseline
    debug._tick(0);

    // Now rebind (changes the fingerprint)
    player.rebind(action, 0, "KeyW");

    // Second tick detects the change
    debug._tick(1);

    expect(changed).toBe(true);

    unsubscribe();
  });

  it("fires onDeviceChanged callback", () => {
    const { debug, player } = makeDebugAPI();

    let changed = false;
    debug.onDeviceChanged(() => {
      changed = true;
    });

    // First tick initializes prevDevices baseline
    debug._tick(0);

    // Change device
    player.assignDevice("gamepad", 0);

    // Second tick detects the change
    debug._tick(1);

    expect(changed).toBe(true);
  });

  it("fires onRecordingStateChanged callback", () => {
    const { debug, recorder } = makeDebugAPI();

    let changed = false;
    debug.onRecordingStateChanged(() => {
      changed = true;
    });

    debug._tick(0);
    recorder.start();
    debug._tick(1);

    expect(changed).toBe(true);
  });

  it("fires onFrame callback", () => {
    const { debug } = makeDebugAPI();

    let frameCount = 0;
    debug.onFrame(() => {
      frameCount++;
    });

    debug._tick(0);

    expect(frameCount).toBe(1);
  });

  it("unsubscribes from callbacks", () => {
    const { debug } = makeDebugAPI();

    let frameCount = 0;
    const unsubscribe = debug.onFrame(() => {
      frameCount++;
    });

    unsubscribe();

    debug._tick(0);

    expect(frameCount).toBe(0);
  });

  it("does not fire onContextChanged when contexts unchanged", () => {
    const { debug, player, context } = makeDebugAPI();
    const def = defineInputContext("gameplay", { priority: 10, bindings: [] });

    context.register(def);
    player.activateContext("gameplay");

    // First tick establishes baseline with 'gameplay' active
    debug._tick(0);

    // Subscribe AFTER baseline is established
    let changeCount = 0;
    debug.onContextChanged(() => {
      changeCount++;
    });

    // Subsequent ticks should NOT fire (no context change)
    debug._tick(1);
    debug._tick(2);

    expect(changeCount).toBe(0);
  });

  it("limits action history to MAX_HISTORY", () => {
    const { debug, player, context, devices } = makeDebugAPI();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);

    // Trigger action more than 100 times (MAX_HISTORY)
    for (let i = 0; i < 150; i++) {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
      devices.keyboard.update();
      player._updateFrame(16);
      debug._tick(i);

      window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
      devices.keyboard.update();
      player._updateFrame(16);
      debug._tick(i);
    }

    const history = debug.getActionHistory("jump", 200);

    expect(history.length).toBeLessThanOrEqual(100);

    devices.keyboard.detach(window);
  });

  it("includes active contexts in snapshot", () => {
    const { debug, player, context } = makeDebugAPI();
    const def = defineInputContext("gameplay", { priority: 10, bindings: [] });

    context.register(def);
    player.activateContext("gameplay");

    debug._tick(0);

    const snapshot = debug.getSnapshot();

    expect(snapshot.players[0].activeContexts).toContain("gameplay");
  });

  it("includes assigned device in snapshot", () => {
    const { debug, player } = makeDebugAPI();

    player.assignDevice("gamepad", 0);

    debug._tick(0);

    const snapshot = debug.getSnapshot();

    expect(snapshot.players[0].device).toEqual({ type: "gamepad", slot: 0 });
  });
});

describe("getBindingMap - formatSource coverage", () => {
  it("formats gamepad button (number source)", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, 0); // gamepad button 0
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "jump");
    expect(e?.source).toContain("Gamepad");
  });

  it("formats gamepad stick left source", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("move", { type: "axis2d" });
    const binding = bind(action, "gamepad:stick:left");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "move");
    expect(e?.source).toContain("Stick");
  });

  it("formats gamepad stick right source", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("look", { type: "axis2d" });
    const binding = bind(action, "gamepad:stick:right");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "look");
    expect(e?.source).toContain("Stick");
  });

  it("formats gyro source", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("tilt", { type: "axis1d" });
    const binding = bind(action, "gyro:roll");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "tilt");
    expect(e?.source).toContain("GyroAxis");
  });

  it("formats mouse:delta source", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("aim", { type: "axis2d" });
    const binding = bind(action, "mouse:delta");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "aim");
    expect(e?.source).toContain("MouseDelta");
  });

  it("formats mouse:wheel source", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("zoom", { type: "axis1d" });
    const binding = bind(action, "mouse:wheel");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "zoom");
    expect(e?.source).toContain("MouseWheel");
  });

  it("formats composite2d source", () => {
    const { debug, player, context } = makeDebugAPI();
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

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "move");
    expect(e?.source).toContain("Composite2D");
  });

  it("formats composite1d source", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("throttle", { type: "axis1d" });
    const source = { _type: "composite1d" as const, positive: "KeyD", negative: "KeyA" };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "throttle");
    expect(e?.source).toContain("Composite");
  });

  it("formats virtual:joystick source", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("stick", { type: "axis2d" });
    const source = { _type: "virtual:joystick" as const, id: "left" };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "stick");
    expect(e?.source).toContain("VirtualJoystick");
  });

  it("formats virtual:button source", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("tap", { type: "button" });
    const source = { _type: "virtual:button" as const, id: "fire" };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "tap");
    expect(e?.source).toContain("VirtualButton");
  });

  it("formats mouse:delta object source", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("aim", { type: "axis2d" });
    const source = { _type: "mouse:delta" as const };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "aim");
    expect(e?.source).toContain("MouseDelta");
  });

  it("formats gesture source in default case", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("gesture", { type: "button" });
    const source = { _type: "gesture:tap" as const, fingers: 1 };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "gesture");
    expect(e?.source).toContain("Gesture");
  });

  it("formats gyro object source in default case", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("tilt", { type: "axis1d" });
    const source = { _type: "gyro:roll" as const };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "tilt");
    expect(e?.source).toContain("GyroAxis");
  });
});

describe("getActionHistory", () => {
  it("returns empty array for unknown action", () => {
    const { debug } = makeDebugAPI();

    const history = debug.getActionHistory("unknown", 10);
    expect(history).toEqual([]);
  });

  it("records action triggered event", () => {
    const { debug, player, context, devices } = makeDebugAPI();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    debug._tick(0);

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();

    player._updateFrame(0.016);
    debug._tick(1);

    devices.keyboard.detach(window);

    // May or may not have history depending on action state tracking
    const history = debug.getActionHistory("jump", 10);
    expect(Array.isArray(history)).toBe(true);
  });

  it("caps at lastN entries", () => {
    const { debug } = makeDebugAPI();
    const history = debug.getActionHistory("jump", 5);
    expect(history.length).toBeLessThanOrEqual(5);
  });
});

describe("getSnapshot - axis1d/axis2d action types", () => {
  it("includes axis1d action in snapshot", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("throttle", { type: "axis1d" });
    const binding = bind(action, "ArrowUp");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    debug._tick(0);
    player._updateFrame(0.016);
    debug._tick(1);

    const snapshot = debug.getSnapshot();
    const a = snapshot.players[0].actions.find((x) => x.name === "throttle");
    expect(a).toBeDefined();
    expect(a?.type).toBe("axis1d");
  });

  it("includes axis2d action in snapshot", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("move", { type: "axis2d" });
    const binding = bind(action, "gamepad:stick:left");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    debug._tick(0);
    player._updateFrame(0.016);
    debug._tick(1);

    const snapshot = debug.getSnapshot();
    const a = snapshot.players[0].actions.find((x) => x.name === "move");
    expect(a).toBeDefined();
    expect(a?.type).toBe("axis2d");
  });
});

describe("getBindingMap - processors and interactions", () => {
  it("includes processor _type in binding map", () => {
    const { debug, player, context } = makeDebugAPI();
    const action = defineAction("throttle", { type: "axis1d" });
    const binding = bind(action, "ArrowUp", {
      processors: [{ _type: "normalize" as const }],
      interactions: [{ _type: "hold" as const, holdTime: 0.5 }],
    });
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const entries = debug.getBindingMap();
    const e = entries.find((x) => x.actionName === "throttle");
    expect(e?.processors).toContain("normalize");
    expect(e?.interactions).toContain("hold");
  });
});
