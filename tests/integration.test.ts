/**
 * Integration tests — full pipeline from context registration through
 * action state evaluation, rebinding, serialisation, and hook wiring.
 *
 * These tests exercise multiple subsystems together without mocking internals.
 */
import { describe, it, expect, vi } from "vitest";
import { defineAction } from "../src/actions/define-action.js";
import { defineInputSchema } from "../src/actions/define-input-schema.js";
import { bind } from "../src/contexts/binding.js";
import { defineInputContext } from "../src/contexts/define-input-context.js";
import { InputContext } from "../src/contexts/input-context.js";
import { PlayerInput } from "../src/players/player-input.js";
import { InputService } from "../src/players/input-service.js";
import { InputRecorder } from "../src/recording/recorder.js";
import { InputPlayback } from "../src/recording/playback.js";
import { KeyboardDevice } from "../src/devices/keyboard.js";
import { MouseDevice } from "../src/devices/mouse.js";
import { GamepadDevice } from "../src/devices/gamepad.js";
import { TouchDevice } from "../src/devices/touch.js";
import { GyroDevice } from "../src/devices/gyro.js";
import { forPlayers } from "../src/helpers/for-players.js";
import { builtInProfiles } from "../src/accessibility/profiles.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function makeService(playerCount = 1) {
  const playerEntries = Array.from({ length: playerCount }, (_, i) => {
    const devices = makeDevices();
    const context = new InputContext();
    const player = new PlayerInput(i, context, devices, { type: "keyboard+mouse", slot: 0 });
    return { player, context, devices };
  });
  const players = playerEntries.map((e) => e.player);
  const devices = playerEntries[0].devices;
  const recorder = new InputRecorder(players);
  const playback = new InputPlayback(players);
  const service = new InputService(players, { ...devices, virtualControls: undefined }, recorder, playback);
  return { service, playerEntries, players, recorder, playback };
}

// ─── defineInputSchema integration ───────────────────────────────────────────

describe("defineInputSchema integration", () => {
  it("produces typed ActionRefs from a schema", () => {
    const { actions } = defineInputSchema("game", {
      priority: 0,
      actions: {
        Jump: { type: "button", bindings: ["Space"] },
        Move: { type: "axis2d", bindings: [] },
      },
    });

    expect(actions.Jump.type).toBe("button");
    expect(actions.Jump.name).toBe("Jump");
    expect(actions.Move.type).toBe("axis2d");
  });

  it("produced context has the correct name and bindings", () => {
    const { context } = defineInputSchema("gameplay", {
      priority: 5,
      actions: {
        Fire: { type: "button", bindings: ["Space"] },
      },
    });

    expect(context.name).toBe("gameplay");
    expect(context.priority).toBe(5);
    expect(context.bindings.length).toBeGreaterThan(0);
  });
});

// ─── Context stack integration ────────────────────────────────────────────────

describe("context stack integration", () => {
  it("higher-priority context overrides lower", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const gameplay = defineInputContext("gameplay", { priority: 0, bindings: [bind(Jump, "Space")] });
    const menu = defineInputContext("menu", { priority: 10, bindings: [bind(Jump, "Enter")] });

    const { player, context } = makePlayer();
    context.register(gameplay);
    context.register(menu);
    player.activateContext("gameplay");
    player.activateContext("menu");

    // Menu (priority 10) wins — Enter should be first in bindings for Jump
    const bindings = context.getBindingsForAction(Jump);
    expect(bindings[0].source).toBe("Enter");
  });

  it("deactivating a context removes it from the stack", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const gameplay = defineInputContext("gameplay", { priority: 0, bindings: [bind(Jump, "Space")] });

    const { player, context } = makePlayer();
    context.register(gameplay);
    player.activateContext("gameplay");
    expect(player.activeContexts).toContain("gameplay");

    player.deactivateContext("gameplay");
    expect(player.activeContexts).not.toContain("gameplay");
  });
});

// ─── Hook wiring integration ──────────────────────────────────────────────────

describe("hook wiring integration", () => {
  it("_onHookContextActivated fires when activateContext is called", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const ctx = defineInputContext("play", { priority: 3, bindings: [bind(Jump, "Space")] });
    const { player, context } = makePlayer();
    context.register(ctx);

    const cb = vi.fn();
    player._onHookContextActivated = cb;
    player.activateContext("play");

    expect(cb).toHaveBeenCalledWith("play", 3);
  });

  it("_onHookContextDeactivated fires when deactivateContext is called", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const ctx = defineInputContext("play", { priority: 0, bindings: [bind(Jump, "Space")] });
    const { player, context } = makePlayer();
    context.register(ctx);
    player.activateContext("play");

    const cb = vi.fn();
    player._onHookContextDeactivated = cb;
    player.deactivateContext("play");

    expect(cb).toHaveBeenCalledWith("play");
  });

  it("_onHookBindingChanged fires when rebind is called", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const ctx = defineInputContext("play", { priority: 0, bindings: [bind(Jump, "Space")] });
    const { player, context } = makePlayer();
    context.register(ctx);
    player.activateContext("play");

    const cb = vi.fn();
    player._onHookBindingChanged = cb;
    player.rebind(Jump, 0, "Enter");

    expect(cb).toHaveBeenCalledWith("Jump", 0);
  });

  it("recorder _onStateChanged fires on start/stop", () => {
    const { recorder } = makeService();
    const cb = vi.fn();
    recorder._onStateChanged = cb;

    recorder.start();
    expect(cb).toHaveBeenCalledWith("started");

    recorder.stop();
    expect(cb).toHaveBeenCalledWith("stopped");
  });

  it("playback _onStateChanged fires on play/pause/stop", () => {
    const { service, playback, recorder } = makeService();
    void service; // suppress unused warning

    recorder.start();
    recorder._captureFrame(0);
    recorder.stop();
    const rec = recorder.export();

    const cb = vi.fn();
    playback._onStateChanged = cb;

    playback.load(rec);
    playback.play();
    expect(cb).toHaveBeenCalledWith("playing");

    playback.pause();
    expect(cb).toHaveBeenCalledWith("paused");

    playback.stop();
    expect(cb).toHaveBeenCalledWith("stopped");
  });
});

// ─── forPlayers integration ───────────────────────────────────────────────────

describe("forPlayers helper", () => {
  it("calls factory with each player index", () => {
    const factory = vi.fn((i: number) => `player-${i}`);
    const result = forPlayers(3, factory);

    expect(result).toEqual(["player-0", "player-1", "player-2"]);
    expect(factory).toHaveBeenCalledTimes(3);
    expect(factory).toHaveBeenNthCalledWith(1, 0);
    expect(factory).toHaveBeenNthCalledWith(2, 1);
    expect(factory).toHaveBeenNthCalledWith(3, 2);
  });

  it("returns empty array for count 0", () => {
    expect(forPlayers(0, () => "x")).toEqual([]);
  });
});

// ─── Accessibility integration ────────────────────────────────────────────────

describe("accessibility integration", () => {
  it("builtInProfiles exist and are valid snapshots", () => {
    expect(builtInProfiles.oneHandedLeft.version).toBe(1);
    expect(Array.isArray(builtInProfiles.oneHandedLeft.overrides)).toBe(true);
    expect(builtInProfiles.oneHandedRight.version).toBe(1);
  });

  it("activateAccessibilityProfile throws for unknown profile", () => {
    const { player } = makePlayer();
    expect(() => player.activateAccessibilityProfile("unknown")).toThrow(
      'Accessibility profile "unknown" is not registered',
    );
  });

  it("activateAccessibilityProfile applies profile bindings", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const ctx = defineInputContext("play", { priority: 0, bindings: [bind(Jump, "Space")] });
    const { player, context } = makePlayer();
    context.register(ctx);
    player.activateContext("play");

    const profile = {
      version: 1 as const,
      player: 0,
      overrides: [{ actionId: "Jump", bindingIndex: 0, newBinding: "Enter" }],
    };
    player._accessibilityProfiles = { myProfile: profile };
    player.activateAccessibilityProfile("myProfile");

    const exported = player.exportBindings();
    expect(exported.overrides[0].newBinding).toBe("Enter");
  });

  it("getRemappableActions returns actions with display names", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const ctx = defineInputContext("play", { priority: 0, bindings: [bind(Jump, "Space")] });
    const { player, context } = makePlayer();
    context.register(ctx);
    player.activateContext("play");

    const actions = player.getRemappableActions();
    expect(actions.length).toBeGreaterThan(0);
    const jump = actions.find((a) => a.name === "Jump");
    expect(jump).toBeDefined();
    expect(jump!.type).toBe("button");
    expect(jump!.bindings[0].displayName).toBe("Space");
    expect(jump!.bindings[0].isOverridden).toBe(false);
  });

  it("getRemappableActions marks overridden bindings", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const ctx = defineInputContext("play", { priority: 0, bindings: [bind(Jump, "Space")] });
    const { player, context } = makePlayer();
    context.register(ctx);
    player.activateContext("play");
    player.rebind(Jump, 0, "Enter");

    const actions = player.getRemappableActions();
    const jump = actions.find((a) => a.name === "Jump")!;
    expect(jump.bindings[0].isOverridden).toBe(true);
    expect(jump.bindings[0].displayName).toBe("Enter");
  });

  it("getAccessibilityProfiles returns registered profile names", () => {
    const { service } = makeService();
    service._accessibilityProfiles = {
      "one-handed-left": builtInProfiles.oneHandedLeft,
      custom: { version: 1, player: 0, overrides: [] },
    };
    const profiles = service.getAccessibilityProfiles();
    expect(profiles).toContain("one-handed-left");
    expect(profiles).toContain("custom");
    expect(profiles.length).toBe(2);
  });
});

// ─── Binding snapshot round-trip ──────────────────────────────────────────────

describe("binding snapshot round-trip", () => {
  it("export → import restores overrides", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const ctx = defineInputContext("play", { priority: 0, bindings: [bind(Jump, "Space")] });

    const { player: p1, context: c1 } = makePlayer(0);
    c1.register(ctx);
    p1.activateContext("play");
    p1.rebind(Jump, 0, "Enter");

    const snapshot = p1.exportBindings();

    const { player: p2, context: c2 } = makePlayer(0);
    c2.register(ctx);
    p2.activateContext("play");
    p2.importBindings(snapshot);

    const restored = p2.exportBindings();
    expect(restored.overrides[0].newBinding).toBe("Enter");
  });

  it("resetBindings clears all overrides", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const ctx = defineInputContext("play", { priority: 0, bindings: [bind(Jump, "Space")] });
    const { player, context } = makePlayer();
    context.register(ctx);
    player.activateContext("play");
    player.rebind(Jump, 0, "Enter");

    player.resetBindings();
    const snapshot = player.exportBindings();
    expect(snapshot.overrides.length).toBe(0);
  });
});
