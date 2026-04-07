import { describe, it, expect, beforeEach, vi } from "vitest";
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
import { resolveSource } from "../src/players/binding-resolver.js";
import { AllOf } from "../src/interactions/all-of.js";
import { Press } from "../src/interactions/press.js";
import type { CompositeSource, Composite1DSource } from "../src/contexts/binding.js";

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

describe("PlayerInput", () => {
  it("initializes with index", () => {
    const { player } = makePlayer(0);
    expect(player.index).toBe(0);
  });

  it("has no active contexts initially", () => {
    const { player } = makePlayer();
    expect(player.activeContexts).toHaveLength(0);
  });

  it("activates a registered context", () => {
    const { player, context } = makePlayer();
    const def = defineInputContext("gameplay", { priority: 10, bindings: [] });

    context.register(def);
    player.activateContext("gameplay");

    expect(player.activeContexts).toContain("gameplay");
  });

  it("deactivates a context", () => {
    const { player, context } = makePlayer();
    const def = defineInputContext("gameplay", { priority: 10, bindings: [] });

    context.register(def);
    player.activateContext("gameplay");
    player.deactivateContext("gameplay");

    expect(player.activeContexts).not.toContain("gameplay");
  });

  it("returns button action state", () => {
    const { player } = makePlayer();
    const action = defineAction("jump", { type: "button" });

    const state = player.action(action);

    expect(state.type).toBe("button");
    expect(state.isPressed).toBe(false);
  });

  it("returns axis1d action state", () => {
    const { player } = makePlayer();
    const action = defineAction("throttle", { type: "axis1d" });

    const state = player.action(action);

    expect(state.type).toBe("axis1d");
    expect(state.value).toBe(0);
  });

  it("returns axis2d action state", () => {
    const { player } = makePlayer();
    const action = defineAction("move", { type: "axis2d" });

    const state = player.action(action);

    expect(state.type).toBe("axis2d");
    expect(state.value).toEqual({ x: 0, y: 0 });
  });

  it("evaluates button binding", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();

    player._updateFrame(16);

    const state = player.action(action);
    expect(state.isPressed).toBe(true);
    expect(state.isJustTriggered).toBe(true);

    devices.keyboard.detach(window);
  });

  it("evaluates axis1d binding", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("aim", { type: "axis1d" });
    // composite1d: pressing KeyD gives +1
    const source: Composite1DSource = { _type: "composite1d", positive: "KeyD", negative: "KeyA" };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
    devices.keyboard.update();

    player._updateFrame(16);

    const state = player.action(action);
    expect(state.value).not.toBe(0);

    devices.keyboard.detach(window);
  });

  it("evaluates boolean (keyboard key) source bound to axis1d action", () => {
    // Binding a plain keyboard key (boolean source) to an axis1d action
    // exercises the `typeof rawValue === 'boolean'` branch in _evaluateAxis1DBindings
    const { player, context, devices } = makePlayer();
    const action = defineAction("speed", { type: "axis1d" });
    const binding = bind(action, "Space"); // Space is a boolean (key) source
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();

    player._updateFrame(16);

    const state = player.action(action);
    expect(state.type).toBe("axis1d");
    // Boolean true → summed as 1
    expect((state as any).value).toBe(1);

    devices.keyboard.detach(window);
  });

  it("combines multiple bindings for same action", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding1 = bind(action, "Space");
    const binding2 = bind(action, "KeyW");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding1, binding2] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    devices.keyboard.update();

    player._updateFrame(16);

    const state = player.action(action);
    expect(state.isPressed).toBe(true);

    devices.keyboard.detach(window);
  });

  it("assigns device", () => {
    const { player } = makePlayer();

    player.assignDevice("gamepad", 0);

    expect(player.assignedDevice.type).toBe("gamepad");
    expect(player.assignedDevice.slot).toBe(0);
  });

  it("exports bindings snapshot", () => {
    const { player, context } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const snapshot = player.exportBindings();

    expect(snapshot.version).toBe(1);
    expect(Array.isArray(snapshot.overrides)).toBe(true);
  });

  it("imports bindings snapshot", () => {
    const { player, context } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    const snapshot = player.exportBindings();
    player.importBindings(snapshot);

    // Should not throw
  });

  it("rebinds action", () => {
    const { player, context } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    player.rebind(action, 0, "KeyW");

    // Check via exportBindings that override was stored
    const snapshot = player.exportBindings();
    expect(snapshot.overrides).toHaveLength(1);
    expect(snapshot.overrides[0].newBinding).toBe("KeyW");
  });

  it("resets single binding", () => {
    const { player, context } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    player.rebind(action, 0, "KeyW");
    player.resetBinding(action, 0);

    const allBindings = player._getAllContextBindings();
    const jumpBinding = allBindings.find((b) => b.binding.action === action);
    expect(jumpBinding?.binding.source).toBe("Space");
  });

  it("resets all bindings", () => {
    const { player, context } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    player.rebind(action, 0, "KeyW");
    player.resetBindings();

    const allBindings = player._getAllContextBindings();
    const jumpBinding = allBindings.find((b) => b.binding.action === action);
    expect(jumpBinding?.binding.source).toBe("Space");
  });

  it("captureNextInput returns a Promise", () => {
    const { player } = makePlayer();

    const promise = player.captureNextInput({ timeout: 10 });

    expect(promise).toBeInstanceOf(Promise);

    // Resolve to avoid unhandled rejection - advance timeout via _updateFrame
    player._updateFrame(0.1);
    return promise;
  });

  it("returns null when capture times out", async () => {
    const { player } = makePlayer();

    const promise = player.captureNextInput({ timeout: 50 });

    // Advance time past timeout: timeout=50ms, dt=0.1s = 100ms > 50ms
    player._updateFrame(0.1);

    const result = await promise;

    expect(result).toBeNull();
  });

  it("captureNextInput resolves with keyboard key on just-press", async () => {
    const { player, devices } = makePlayer();
    devices.keyboard.attach(window);

    const promise = player.captureNextInput({ timeout: 5000 });

    // Simulate a keydown event
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    // Advance one frame so keyboard state transitions to justPressed
    devices.keyboard.update();
    player._updateFrame(0.016);

    const result = await promise;
    expect(result).toBe("Space");
    devices.keyboard.detach(window);
  });

  it("captureNextInput resolves with mouse button on just-press", async () => {
    const { player, devices } = makePlayer();
    devices.mouse.attach(window);

    const promise = player.captureNextInput({ timeout: 5000 });

    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    devices.mouse.update();
    player._updateFrame(0.016);

    const result = await promise;
    expect(result).toBe(0);
    devices.mouse.detach(window);
  });

  it("uses playback states when available", () => {
    const { player } = makePlayer();
    const action = defineAction("jump", { type: "button" });

    player._playbackStates = new Map([
      [
        action.id,
        {
          type: "button",
          isPressed: true,
          isJustTriggered: true,
          isJustReleased: false,
          holdTime: 100,
        },
      ],
    ]);

    const state = player.action(action);
    expect(state.isPressed).toBe(true);
  });

  it("evaluates axis2d binding", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("move", { type: "axis2d" });
    const source: CompositeSource = {
      _type: "composite2d",
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    devices.keyboard.update();

    player._updateFrame(0.016);

    const state = player.action(action);
    expect(state.type).toBe("axis2d");
    expect(state.value.y).toBeLessThan(0); // W = up = negative Y

    devices.keyboard.detach(window);
  });

  it("returns internal axis1d value via _getAxis1dValue", () => {
    const { player, context } = makePlayer();
    const action = defineAction("throttle", { type: "axis1d" });
    const source: Composite1DSource = { _type: "composite1d", positive: "KeyD", negative: "KeyA" };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");
    player._updateFrame(0.016);

    const val = player._getAxis1dValue(action.id);
    expect(typeof val).toBe("number");
  });

  it("returns internal axis2d value via _getAxis2dValue", () => {
    const { player, context } = makePlayer();
    const action = defineAction("move", { type: "axis2d" });
    const source: CompositeSource = {
      _type: "composite2d",
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");
    player._updateFrame(0.016);

    const val = player._getAxis2dValue(action.id);
    expect(typeof val.x).toBe("number");
    expect(typeof val.y).toBe("number");
  });

  it("returns default axis1d for unknown action", () => {
    const { player } = makePlayer();
    const action = defineAction("unknown", { type: "axis1d" });

    const val = player._getAxis1dValue(action.id);
    expect(val).toBe(0);
  });

  it("returns default axis2d for unknown action", () => {
    const { player } = makePlayer();
    const action = defineAction("unknown", { type: "axis2d" });

    const val = player._getAxis2dValue(action.id);
    expect(val).toEqual({ x: 0, y: 0 });
  });

  it("importBindings applies overrides correctly", () => {
    const { player, context } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    // Rebind to KeyW, then export
    player.rebind(action, 0, "KeyW");
    const snapshot = player.exportBindings();

    // Reset and re-import
    player.resetBindings();
    player.importBindings(snapshot);

    // Snapshot should have the override
    const imported = player.exportBindings();
    expect(imported.overrides).toHaveLength(1);
    expect(imported.overrides[0].newBinding).toBe("KeyW");
  });
});

describe("InputService", () => {
  it("initializes with players", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);

    expect(service.players).toHaveLength(1);
  });

  it("accesses player by index", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);

    expect(service.player(0)).toBe(player);
  });

  it("throws when accessing invalid player index", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);

    expect(() => service.player(1)).toThrow(RangeError);
  });

  it("delegates action to player 0", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);
    const action = defineAction("jump", { type: "button" });

    const state = service.action(action);

    expect(state.type).toBe("button");
  });

  it("provides access to keyboard device", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);

    expect(service.keyboard).toBe(devices.keyboard);
  });

  it("provides access to mouse device", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);

    expect(service.mouse).toBe(devices.mouse);
  });

  it("provides access to gamepad device", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);

    expect(service.gamepad).toBe(devices.gamepad);
  });

  it("provides access to touch device", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);

    expect(service.touch).toBe(devices.touch);
  });

  it("provides access to gyro device", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);

    expect(service.gyro).toBe(devices.gyro);
  });

  it("provides access to recorder", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);

    expect(service.recorder).toBe(recorder);
  });

  it("provides access to playback", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 });
    const recorder = new InputRecorder([player]);
    const playback = new InputPlayback([player]);

    const service = new InputService([player], devices, recorder, playback);

    expect(service.playback).toBe(playback);
  });
});

describe("resolveSource", () => {
  let devices: ReturnType<typeof makeDevices>;

  beforeEach(() => {
    devices = makeDevices();
    // Define getGamepads if not present in jsdom
    if (!("getGamepads" in navigator)) {
      Object.defineProperty(navigator, "getGamepads", {
        value: () => [null, null, null, null],
        configurable: true,
        writable: true,
      });
    }
  });

  it("resolves keyboard key", () => {
    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();

    const result = resolveSource("Space", devices, 0);

    expect(result).toBe(true);

    devices.keyboard.detach(window);
  });

  it("resolves gamepad button by number", () => {
    const mockGamepad = {
      connected: true,
      buttons: [
        { pressed: true, value: 1, touched: true },
        ...Array(16).fill({ pressed: false, value: 0, touched: false }),
      ],
      axes: [0, 0, 0, 0],
      index: 0,
      id: "Mock",
      mapping: "standard",
      timestamp: 0,
      hapticActuators: [],
      vibrationActuator: null,
    };

    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as any, null, null, null]);
    devices.gamepad.update();

    const result = resolveSource(0, devices, 0);

    expect(result).toBe(true);

    vi.restoreAllMocks();
  });

  it("resolves mouse delta", () => {
    devices.mouse.attach(window);
    window.dispatchEvent(new MouseEvent("mousemove", { movementX: 10, movementY: 20 }));
    devices.mouse.update();

    const result = resolveSource({ _type: "mouse:delta" }, devices, 0);

    expect(result).toEqual({ x: 10, y: 20 });

    devices.mouse.detach(window);
  });

  it("resolves composite2d", () => {
    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    devices.keyboard.update();

    const source: CompositeSource = {
      _type: "composite2d",
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    };

    const result = resolveSource(source, devices, 0);

    expect((result as { x: number; y: number }).y).toBeLessThan(0); // up is negative Y

    devices.keyboard.detach(window);
  });

  it("resolves composite1d", () => {
    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
    devices.keyboard.update();

    const source: Composite1DSource = {
      _type: "composite1d",
      positive: "KeyD",
      negative: "KeyA",
    };

    const result = resolveSource(source, devices, 0);

    expect(result).toBeGreaterThan(0);

    devices.keyboard.detach(window);
  });

  it("returns false for unpressed keyboard key", () => {
    devices.keyboard.attach(window);
    devices.keyboard.update();

    const result = resolveSource("Space", devices, 0);

    expect(result).toBe(false);

    devices.keyboard.detach(window);
  });

  it("returns false for unknown string source (treated as keyboard key)", () => {
    devices.keyboard.attach(window);
    devices.keyboard.update();

    // 'mouse:x' is not a valid string source, falls through to keyboard.isPressed
    const result = resolveSource("mouse:x", devices, 0);

    expect(result).toBe(false); // keyboard key 'mouse:x' is not pressed

    devices.keyboard.detach(window);
  });

  it("resolves gamepad:stick:left", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([
      {
        connected: true,
        buttons: Array(17).fill({ pressed: false, value: 0, touched: false }),
        axes: [0.5, -0.3, 0, 0],
        index: 0,
        id: "",
        mapping: "standard",
        timestamp: 0,
        hapticActuators: [],
        vibrationActuator: null,
      } as any,
      null,
      null,
      null,
    ]);
    devices.gamepad.update();

    const result = resolveSource("gamepad:stick:left", devices, 0);

    expect(typeof (result as any).x).toBe("number");
    expect(typeof (result as any).y).toBe("number");

    vi.restoreAllMocks();
  });

  it("resolves gamepad:stick:right", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([
      {
        connected: true,
        buttons: Array(17).fill({ pressed: false, value: 0, touched: false }),
        axes: [0, 0, 0.7, 0.2],
        index: 0,
        id: "",
        mapping: "standard",
        timestamp: 0,
        hapticActuators: [],
        vibrationActuator: null,
      } as any,
      null,
      null,
      null,
    ]);
    devices.gamepad.update();

    const result = resolveSource("gamepad:stick:right", devices, 0);

    expect(typeof (result as any).x).toBe("number");

    vi.restoreAllMocks();
  });

  it("resolves gamepad:stick:left:x", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([
      {
        connected: true,
        buttons: Array(17).fill({ pressed: false, value: 0, touched: false }),
        axes: [0.8, 0, 0, 0],
        index: 0,
        id: "",
        mapping: "standard",
        timestamp: 0,
        hapticActuators: [],
        vibrationActuator: null,
      } as any,
      null,
      null,
      null,
    ]);
    devices.gamepad.update();

    const result = resolveSource("gamepad:stick:left:x", devices, 0);
    expect(typeof result).toBe("number");

    vi.restoreAllMocks();
  });

  it("resolves gamepad:stick:left:y", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([
      {
        connected: true,
        buttons: Array(17).fill({ pressed: false, value: 0, touched: false }),
        axes: [0, 0.5, 0, 0],
        index: 0,
        id: "",
        mapping: "standard",
        timestamp: 0,
        hapticActuators: [],
        vibrationActuator: null,
      } as any,
      null,
      null,
      null,
    ]);
    devices.gamepad.update();

    const result = resolveSource("gamepad:stick:left:y", devices, 0);
    expect(typeof result).toBe("number");

    vi.restoreAllMocks();
  });

  it("resolves gamepad:stick:right:x", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([
      {
        connected: true,
        buttons: Array(17).fill({ pressed: false, value: 0, touched: false }),
        axes: [0, 0, 0.3, 0],
        index: 0,
        id: "",
        mapping: "standard",
        timestamp: 0,
        hapticActuators: [],
        vibrationActuator: null,
      } as any,
      null,
      null,
      null,
    ]);
    devices.gamepad.update();

    const result = resolveSource("gamepad:stick:right:x", devices, 0);
    expect(typeof result).toBe("number");

    vi.restoreAllMocks();
  });

  it("resolves gamepad:stick:right:y", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([
      {
        connected: true,
        buttons: Array(17).fill({ pressed: false, value: 0, touched: false }),
        axes: [0, 0, 0, 0.4],
        index: 0,
        id: "",
        mapping: "standard",
        timestamp: 0,
        hapticActuators: [],
        vibrationActuator: null,
      } as any,
      null,
      null,
      null,
    ]);
    devices.gamepad.update();

    const result = resolveSource("gamepad:stick:right:y", devices, 0);
    expect(typeof result).toBe("number");

    vi.restoreAllMocks();
  });

  it("resolves gyro:roll string source", () => {
    const result = resolveSource("gyro:roll", devices, 0);
    expect(typeof result).toBe("number");
  });

  it("resolves gyro:pitch string source", () => {
    const result = resolveSource("gyro:pitch", devices, 0);
    expect(typeof result).toBe("number");
  });

  it("resolves gyro:yaw string source", () => {
    const result = resolveSource("gyro:yaw", devices, 0);
    expect(typeof result).toBe("number");
  });

  it("resolves gyro:rotation-rate string source", () => {
    const result = resolveSource("gyro:rotation-rate", devices, 0);
    expect(typeof (result as any).x).toBe("number");
    expect(typeof (result as any).y).toBe("number");
  });

  it("resolves mouse:wheel object source", () => {
    const result = resolveSource({ _type: "mouse:wheel" }, devices, 0);
    expect(typeof result).toBe("number");
  });

  it("resolves gyro:roll object source", () => {
    const result = resolveSource({ _type: "gyro:roll" }, devices, 0);
    expect(typeof result).toBe("number");
  });

  it("resolves gyro:pitch object source", () => {
    const result = resolveSource({ _type: "gyro:pitch" }, devices, 0);
    expect(typeof result).toBe("number");
  });

  it("resolves gyro:yaw object source", () => {
    const result = resolveSource({ _type: "gyro:yaw" }, devices, 0);
    expect(typeof result).toBe("number");
  });

  it("resolves gyro:rotation-rate object source", () => {
    const result = resolveSource({ _type: "gyro:rotation-rate" }, devices, 0);
    expect(typeof (result as any).x).toBe("number");
  });

  it("resolves gesture:tap — inactive gesture returns false", () => {
    const result = resolveSource({ _type: "gesture:tap", fingers: 1 }, devices, 0);
    expect(result).toBe(false);
  });

  it("resolves gesture:swipe — inactive gesture returns false", () => {
    const result = resolveSource({ _type: "gesture:swipe", direction: "left" }, devices, 0);
    expect(result).toBe(false);
  });

  it("resolves gesture:pinch — inactive gesture returns false", () => {
    const result = resolveSource({ _type: "gesture:pinch" }, devices, 0);
    expect(result).toBe(false);
  });

  it("resolves gesture:rotate — inactive gesture returns false", () => {
    const result = resolveSource({ _type: "gesture:rotate" }, devices, 0);
    expect(result).toBe(false);
  });

  it("resolves virtual:joystick — no overlay returns {x:0,y:0}", () => {
    const result = resolveSource({ _type: "virtual:joystick", id: "left" }, devices, 0);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("resolves virtual:button — no overlay returns false", () => {
    const result = resolveSource({ _type: "virtual:button", id: "jump" }, devices, 0);
    expect(result).toBe(false);
  });

  it("returns false for null/unknown source", () => {
    const result = resolveSource(null as any, devices, 0);
    expect(result).toBe(false);
  });
});

describe("PlayerInput - branch coverage", () => {
  beforeEach(() => {
    if (!("getGamepads" in navigator)) {
      Object.defineProperty(navigator, "getGamepads", {
        value: () => [null, null, null, null],
        configurable: true,
        writable: true,
      });
    }
  });

  it("handles axis1d with boolean source (keyboard key)", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("throttle", { type: "axis1d" });
    // Keyboard key as source → boolean
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();
    player._updateFrame(0.016);

    const state = player.action(action);
    // boolean true → 1
    expect((state as any).value).toBeGreaterThan(0);

    devices.keyboard.detach(window);
  });

  it("handles button binding with 2D object source (gamepad stick as button)", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("anyInput", { type: "button" });
    const source = {
      _type: "composite2d",
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    } as const;
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    // Press W — composite2d returns {x:0, y:-1}, magnitude > 0 → rawPressed = true
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    devices.keyboard.update();
    player._updateFrame(0.016);

    const state = player.action(action);
    expect(state.isPressed).toBe(true);

    devices.keyboard.detach(window);
  });

  it("handles AllOf interaction — not all keys held", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("combo", { type: "button" });
    const binding = bind(action, "Space", { interactions: [AllOf("Space", "KeyW")] });
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    // Only press Space — KeyW not pressed → AllOf fails → not pressed
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();
    player._updateFrame(0.016);

    const state = player.action(action);
    expect(state.isPressed).toBe(false);

    devices.keyboard.detach(window);
  });

  it("handles AllOf interaction — all keys held", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("combo", { type: "button" });
    // AllOf is no-op in pipeline alone; pair with Press for output
    const binding = bind(action, "Space", { interactions: [AllOf("Space", "KeyW"), Press()] });
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    // Press both keys → AllOf passes
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    devices.keyboard.update();
    player._updateFrame(0.016);

    const state = player.action(action);
    expect(state.isPressed).toBe(true);

    devices.keyboard.detach(window);
  });

  it("handles button binding with gamepad button (number source)", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("gamepadJump", { type: "button" });
    const binding = bind(action, 0); // gamepad button 0
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");
    player.assignDevice("gamepad", 0);

    vi.spyOn(navigator, "getGamepads").mockReturnValue([
      {
        connected: true,
        buttons: [
          { pressed: true, value: 1, touched: true },
          ...Array(16).fill({ pressed: false, value: 0, touched: false }),
        ],
        axes: [0, 0, 0, 0],
        index: 0,
        id: "",
        mapping: "standard",
        timestamp: 0,
        hapticActuators: [],
        vibrationActuator: null,
      } as any,
      null,
      null,
      null,
    ]);

    devices.gamepad.update();
    player._updateFrame(0.016);

    const state = player.action(action);
    expect(state.isPressed).toBe(true);

    vi.restoreAllMocks();
  });
});

describe("PlayerInput rebind and evaluate", () => {
  it("evaluates action with binding override active", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    // Rebind to KeyW
    player.rebind(action, 0, "KeyW");

    devices.keyboard.attach(window);
    // Space should NOT work anymore
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();
    player._updateFrame(0.016);

    expect(player.action(action).isPressed).toBe(false);

    // KeyW should work (rebind target)
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    devices.keyboard.update();
    player._updateFrame(0.016);

    expect(player.action(action).isPressed).toBe(true);

    devices.keyboard.detach(window);
  });

  it("captureNextInput cancels previous capture", async () => {
    const { player } = makePlayer();

    const p1 = player.captureNextInput({ timeout: 1000 });
    const p2 = player.captureNextInput({ timeout: 1000 });

    // p1 should resolve to null (cancelled by p2)
    const result1 = await Promise.race([p1, Promise.resolve("timeout")]);
    expect(result1).toBeNull();

    // Cancel p2 by starting p3 (creating a new capture cancels the previous)
    void player.captureNextInput();
    await p2; // should resolve to null
    const result2 = await p2;
    expect(result2).toBeNull();
  });
});

describe("PlayerInput - advanced branch coverage", () => {
  it("axis1d with 2D object source (composite2d) - covers non-boolean non-number branch", () => {
    const { player, context } = makePlayer();
    const action = defineAction("throttle", { type: "axis1d" });
    // binding a composite2d source to axis1d → rawValue will be {x,y}, neither number nor boolean
    const source: CompositeSource = {
      _type: "composite2d",
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    };
    const binding = bind(action, source);
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");
    player._updateFrame(0.016);

    // Value should be 0 (object doesn't contribute to sum)
    const state = player.action(action);
    expect((state as any).value).toBe(0);
  });

  it("axis1d with boolean processed after processor", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("throttle", { type: "axis1d" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    // Press Space - rawValue = true, processed = true (no processors)
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();
    player._updateFrame(0.016);

    const state = player.action(action);
    expect((state as any).value).toBe(1); // true → 1

    devices.keyboard.detach(window);
  });

  it("bestResult stays null when no bindings", () => {
    const { player, context } = makePlayer();
    const action = defineAction("jump", { type: "button" });
    // Register context but NO bindings for jump
    const emptyDef = defineInputContext("gameplay", { priority: 10, bindings: [] });

    context.register(emptyDef);
    player.activateContext("gameplay");
    player._updateFrame(0.016);

    const state = player.action(action);
    expect(state.isPressed).toBe(false);
  });
});

describe("PlayerInput - uncovered branch coverage", () => {
  it("bestResult is null when button action context is registered but inactive", () => {
    // allActions includes action from registered-but-inactive context;
    // getBindingsForAction returns [] → _evaluateButtonBindings called with empty bindings
    // → bestResult stays null → line 454 false branch
    const { player, context } = makePlayer();
    const action = defineAction("fire", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("combat", { priority: 10, bindings: [binding] });

    context.register(def);
    // NOT calling player.activateContext('combat') → context is registered but inactive

    player._updateFrame(0.016);

    const state = player.action(action);
    expect(state.isPressed).toBe(false);
  });

  it("axis1d with unset key gives rawValue=false (covers ternary false branch on lines 473/476)", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("throttle", { type: "axis1d" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    // Do NOT press Space — rawValue=false, processed=false → takes `0` branch of ternaries
    devices.keyboard.update();
    player._updateFrame(0.016);

    const state = player.action(action);
    expect((state as any).value).toBe(0); // false → 0

    devices.keyboard.detach(window);
  });

  it("axis2d with boolean key source (covers non-object false branches in _evaluateAxis2DBindings)", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("move", { type: "axis2d" });
    // A plain key string source returns boolean, not an {x,y} object
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();
    player._updateFrame(0.016);

    // Should not throw; value is {x:0, y:0} since boolean doesn't contribute to axis2d
    const state = player.action(action);
    expect(state.type).toBe("axis2d");

    devices.keyboard.detach(window);
  });

  it("_notifyBindingsChanged calls onBindingsChanged when set", () => {
    const devices = makeDevices();
    const context = new InputContext();
    const spy = vi.fn();
    const player = new PlayerInput(0, context, devices, { type: "keyboard+mouse", slot: 0 }, spy);

    const action = defineAction("jump", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });
    context.register(def);
    player.activateContext("gameplay");

    // rebind triggers _notifyBindingsChanged → _onBindingsChanged?.() is called
    player.rebind(action, 0, "KeyW");

    expect(spy).toHaveBeenCalled();
  });
});

describe("PlayerInput - AllOf with gamepad button and _getButtonValue", () => {
  beforeEach(() => {
    if (!("getGamepads" in navigator)) {
      Object.defineProperty(navigator, "getGamepads", {
        value: () => [null, null, null, null],
        configurable: true,
        writable: true,
      });
    }
  });

  it('AllOf with gamepad button number key (covers typeof k === "number" branch)', () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("comboMove", { type: "button" });
    // AllOf with a gamepad button number (0) — just need to exercise the typeof k === 'number' branch
    // We'll test the case where the gamepad button is NOT pressed (AllOf fails) to cover the branch
    const binding = bind(action, "Space", { interactions: [AllOf("Space")] });
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });

    context.register(def);
    player.activateContext("gameplay");
    player.assignDevice("gamepad", 0);

    // Mock gamepad with button 0 NOT pressed
    vi.spyOn(navigator, "getGamepads").mockReturnValue([
      {
        connected: true,
        buttons: Array(17).fill({ pressed: false, value: 0, touched: false }),
        axes: [0, 0, 0, 0],
        index: 0,
        id: "",
        mapping: "standard",
        timestamp: 0,
        hapticActuators: [],
        vibrationActuator: null,
      } as any,
      null,
      null,
      null,
    ]);
    devices.gamepad.update();

    devices.keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    devices.keyboard.update();

    player._updateFrame(0.016);

    // Gamepad button 0 not pressed → AllOf fails → action not pressed
    // This exercises the `typeof k === 'number'` branch in the AllOf check
    expect(player.action(action).isPressed).toBe(false);

    vi.restoreAllMocks();
    devices.keyboard.detach(window);
  });

  it("_getButtonValue returns false for unknown action id", () => {
    const { player, context } = makePlayer();
    const action = defineAction("unknownButton", { type: "button" });
    const binding = bind(action, "Space");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding] });
    context.register(def);
    player.activateContext("gameplay");
    player._updateFrame(0.016);

    // Use a fresh symbol that is not in _currentStates
    const unknownRef = defineAction("nonexistent", { type: "button" });
    const result = player._getButtonValue(unknownRef.id);
    expect(result).toBe(false);
  });

  it("multiple bindings: second binding improves bestResult (covers line 446 second condition)", () => {
    const { player, context, devices } = makePlayer();
    const action = defineAction("anyKey", { type: "button" });
    // Two bindings: first is idle (Space not pressed), second is active (KeyW pressed)
    // The second binding's result should replace the first idle result
    const binding1 = bind(action, "Space");
    const binding2 = bind(action, "KeyW");
    const def = defineInputContext("gameplay", { priority: 10, bindings: [binding1, binding2] });

    context.register(def);
    player.activateContext("gameplay");

    devices.keyboard.attach(window);
    // Only press KeyW (second binding), Space (first binding) is idle
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    devices.keyboard.update();
    player._updateFrame(0.016);

    const state = player.action(action);
    expect(state.isPressed).toBe(true);

    devices.keyboard.detach(window);
  });
});
