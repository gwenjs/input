import { describe, it, expect, vi, afterEach } from "vitest";
import { DevOverlay } from "../src/debug/dev-overlay.js";
import type { InputDebugAPI, InputDebugSnapshot } from "../src/debug/debug-api.js";
import type { NormalizedDevOverlayConfig } from "../src/plugin/config.js";

function makeConfig(
  overrides: Partial<NormalizedDevOverlayConfig> = {},
): NormalizedDevOverlayConfig {
  return {
    position: "top-left",
    showDevices: true,
    showContexts: true,
    showActions: true,
    showRecording: true,
    opacity: 0.8,
    player: 0,
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<InputDebugSnapshot> = {}): InputDebugSnapshot {
  return {
    timestamp: Date.now(),
    frame: 0,
    players: [
      {
        index: 0,
        device: { type: "keyboard+mouse", slot: 0 },
        activeContexts: ["gameplay"],
        actions: [
          {
            name: "jump",
            type: "button",
            value: true,
            isJustTriggered: true,
            isJustReleased: false,
            holdTime: 0,
          },
          {
            name: "move",
            type: "axis2d",
            value: { x: 0.5, y: -0.5 },
            isJustTriggered: false,
            isJustReleased: false,
          },
          {
            name: "throttle",
            type: "axis1d",
            value: 0.8,
            isJustTriggered: false,
            isJustReleased: false,
          },
          {
            name: "idle",
            type: "button",
            value: false,
            isJustTriggered: false,
            isJustReleased: false,
            holdTime: 0,
          },
        ],
        recording: { state: "idle", frame: 0, totalFrames: 0 },
      },
    ],
    devices: {
      keyboard: true,
      mouse: true,
      gamepads: [false, false, false, false],
      touch: false,
      gyro: false,
    },
    ...overrides,
  };
}

function makeDebugAPI(
  onFrameImpl?: (cb: (snap: InputDebugSnapshot) => void) => () => void,
): InputDebugAPI {
  let frameCallback: ((snap: InputDebugSnapshot) => void) | null = null;
  return {
    getSnapshot: vi.fn(),
    getActionHistory: vi.fn().mockReturnValue([]),
    getBindingMap: vi.fn().mockReturnValue([]),
    onActionTriggered: vi.fn().mockReturnValue(() => {}),
    onContextChanged: vi.fn().mockReturnValue(() => {}),
    onBindingChanged: vi.fn().mockReturnValue(() => {}),
    onDeviceChanged: vi.fn().mockReturnValue(() => {}),
    onRecordingStateChanged: vi.fn().mockReturnValue(() => {}),
    onFrame: vi.fn().mockImplementation(
      onFrameImpl ??
        ((cb) => {
          frameCallback = cb;
          return () => {
            frameCallback = null;
          };
        }),
    ),
    // Expose for testing
    _triggerFrame: (snap: InputDebugSnapshot) => {
      frameCallback?.(snap);
    },
  } as unknown as InputDebugAPI;
}

describe("DevOverlay", () => {
  afterEach(() => {
    // Remove any overlay elements
    document.getElementById("gwen-input-debug")?.remove();
  });

  it("attaches to document.body", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();

    expect(document.getElementById("gwen-input-debug")).not.toBeNull();
  });

  it("detaches from document.body", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();
    overlay.detach();

    expect(document.getElementById("gwen-input-debug")).toBeNull();
  });

  it("is safe to detach multiple times", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();
    overlay.detach();
    overlay.detach(); // should not throw
  });

  it("subscribes to onFrame when attached", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();

    expect((api.onFrame as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("renders snapshot on frame", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();

    const el = document.getElementById("gwen-input-debug")!;
    const snap = makeSnapshot();

    // Trigger frame callback
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    expect(el.innerHTML).toContain("jump");
  });

  it("renders frame number", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();

    const snap = makeSnapshot({ frame: 42 });
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("42");
  });

  it("shows device status when showDevices=true", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ showDevices: true }));

    overlay.attach();
    const snap = makeSnapshot();
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("kbd");
  });

  it("hides device status when showDevices=false", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ showDevices: false }));

    overlay.attach();
    const snap = makeSnapshot();
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).not.toContain("kbd");
  });

  it("shows active contexts when showContexts=true", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ showContexts: true }));

    overlay.attach();
    const snap = makeSnapshot();
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("gameplay");
  });

  it("shows (none) when no active contexts", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ showContexts: true }));

    overlay.attach();
    const snap = makeSnapshot();
    snap.players[0].activeContexts = [];
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("(none)");
  });

  it("shows active actions when showActions=true", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ showActions: true }));

    overlay.attach();
    const snap = makeSnapshot();
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("jump");
    expect(el.innerHTML).toContain("move");
  });

  it("shows (none active) when no active actions", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ showActions: true }));

    overlay.attach();
    const snap = makeSnapshot();
    snap.players[0].actions = [
      {
        name: "jump",
        type: "button",
        value: false,
        isJustTriggered: false,
        isJustReleased: false,
        holdTime: 0,
      },
    ];
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("(none active)");
  });

  it("shows recording state when showRecording=true", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ showRecording: true }));

    overlay.attach();
    const snap = makeSnapshot();
    snap.players[0].recording = { state: "recording", frame: 5, totalFrames: 10 };
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("recording");
  });

  it("shows playing state in recording section", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ showRecording: true }));

    overlay.attach();
    const snap = makeSnapshot();
    snap.players[0].recording = { state: "playing", frame: 3, totalFrames: 20 };
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("playing");
  });

  it("shows isJustTriggered indicator", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();
    const snap = makeSnapshot();
    // jump is isJustTriggered=true
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    // Should show ▲ for triggered
    expect(el.innerHTML).toContain("▲");
  });

  it("shows isJustReleased indicator", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();
    const snap = makeSnapshot();
    snap.players[0].actions[0] = {
      name: "jump",
      type: "button",
      value: true,
      isJustTriggered: false,
      isJustReleased: true,
      holdTime: 100,
    };
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("▼");
  });

  it("handles player out of snapshot range", () => {
    const api = makeDebugAPI();
    // Player index 99 doesn't exist in snapshot
    const overlay = new DevOverlay(api, makeConfig({ player: 99 }));

    overlay.attach();
    const snap = makeSnapshot();
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap); // should not throw, playerSnap is undefined

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("frame");
  });

  it("uses top-right position when configured", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ position: "top-right" }));

    overlay.attach();

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.getAttribute("style")).toContain("right:8px");
  });

  it("uses bottom-left position when configured", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ position: "bottom-left" }));

    overlay.attach();

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.getAttribute("style")).toContain("bottom:8px");
  });

  it("uses bottom-right position when configured", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ position: "bottom-right" }));

    overlay.attach();

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.getAttribute("style")).toContain("bottom:8px");
    expect(el.getAttribute("style")).toContain("right:8px");
  });

  it("filters axis2d actions with x=0 and y!=0 (OR short-circuit)", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();

    const snap = makeSnapshot({
      players: [
        {
          index: 0,
          device: { type: "keyboard+mouse", slot: 0 },
          activeContexts: ["gameplay"],
          actions: [
            {
              name: "move",
              type: "axis2d",
              value: { x: 0, y: 0.5 },
              isJustTriggered: false,
              isJustReleased: false,
            },
          ],
          recording: { state: "idle", frame: 0, totalFrames: 0 },
        },
      ],
    });
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("move");
  });

  it("skips action section when showActions is false", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ showActions: false }));

    overlay.attach();
    const snap = makeSnapshot();
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    // The "─ P0 actions ─" section should not be present
    expect(el.innerHTML).not.toContain("actions");
  });

  it("skips recording section when showRecording is false", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig({ showRecording: false }));

    overlay.attach();
    const snap = makeSnapshot();
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    // The "─ recording ─" section should not be present
    expect(el.innerHTML).not.toContain("recording");
  });

  it("shows connected gamepad in device display (covers GP✓ branch)", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();
    const snap = makeSnapshot({
      devices: {
        keyboard: false,
        mouse: false,
        gamepads: [true, false, false, false], // GP0 connected
        touch: true,
        gyro: true,
      },
    });
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("GP0✓");
    expect(el.innerHTML).toContain("✗"); // keyboard or mouse not connected
  });

  it("shows contexts as (none) when no active contexts", () => {
    const api = makeDebugAPI();
    const overlay = new DevOverlay(api, makeConfig());

    overlay.attach();
    const snap = makeSnapshot({
      players: [
        {
          index: 0,
          device: { type: "keyboard+mouse", slot: 0 },
          activeContexts: [], // empty → shows '(none)'
          actions: [],
          recording: { state: "idle", frame: 0, totalFrames: 0 },
        },
      ],
    });
    const onFrameCb = (api.onFrame as ReturnType<typeof vi.fn>).mock.calls[0][0];
    onFrameCb(snap);

    const el = document.getElementById("gwen-input-debug")!;
    expect(el.innerHTML).toContain("(none)");
  });
});
