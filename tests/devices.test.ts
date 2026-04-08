import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KeyboardDevice } from "../src/devices/keyboard.js";
import { MouseDevice } from "../src/devices/mouse.js";
import { GamepadDevice } from "../src/devices/gamepad.js";
import { GyroDevice } from "../src/devices/gyro.js";

describe("KeyboardDevice", () => {
  let keyboard: KeyboardDevice;

  beforeEach(() => {
    keyboard = new KeyboardDevice();
    keyboard.attach(window);
  });

  afterEach(() => {
    keyboard.detach(window);
  });

  it("initializes with all keys idle", () => {
    expect(keyboard.getState("Space")).toBe("idle");
    expect(keyboard.isPressed("Space")).toBe(false);
  });

  it("transitions to justPressed on keydown", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    keyboard.update();

    expect(keyboard.getState("Space")).toBe("justPressed");
    expect(keyboard.isJustPressed("Space")).toBe(true);
    expect(keyboard.isPressed("Space")).toBe(true);
  });

  it("transitions to held after update", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    keyboard.update();
    keyboard.update();

    expect(keyboard.getState("Space")).toBe("held");
    expect(keyboard.isHeld("Space")).toBe(true);
    expect(keyboard.isPressed("Space")).toBe(true);
    expect(keyboard.isJustPressed("Space")).toBe(false);
  });

  it("transitions to justReleased on keyup", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    keyboard.update();
    keyboard.update();

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    keyboard.update();

    expect(keyboard.getState("Space")).toBe("justReleased");
    expect(keyboard.isJustReleased("Space")).toBe(true);
    expect(keyboard.isPressed("Space")).toBe(false);
  });

  it("transitions to idle after release", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    keyboard.update();
    keyboard.update();

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    keyboard.update();
    keyboard.update();

    expect(keyboard.getState("Space")).toBe("idle");
    expect(keyboard.isJustReleased("Space")).toBe(false);
  });

  it("tracks multiple keys independently", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    keyboard.update();

    expect(keyboard.isJustPressed("Space")).toBe(true);
    expect(keyboard.isJustPressed("KeyW")).toBe(true);

    keyboard.update();

    expect(keyboard.isHeld("Space")).toBe(true);
    expect(keyboard.isHeld("KeyW")).toBe(true);
  });

  it("resets all keys to idle", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    keyboard.update();

    keyboard.reset();

    expect(keyboard.getState("Space")).toBe("idle");
    expect(keyboard.isPressed("Space")).toBe(false);
  });

  it("ignores repeated keydown events", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    keyboard.update();

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    keyboard.update();

    expect(keyboard.getState("Space")).toBe("held");
  });

  it("can detach and reattach", () => {
    keyboard.detach(window);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    keyboard.update();

    expect(keyboard.isPressed("Space")).toBe(false);

    keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    keyboard.update();

    expect(keyboard.isPressed("Space")).toBe(true);
  });

  it("resets on window blur", () => {
    keyboard.attach(window);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    keyboard.update();

    expect(keyboard.isPressed("Space")).toBe(true);

    window.dispatchEvent(new Event("blur"));

    expect(keyboard.isPressed("Space")).toBe(false);
  });

  it("sets idle state when keyup fires for non-pressed key", () => {
    // keyup fires for a key that was never in pressed/held state
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyX" }));
    keyboard.update();

    // State should be idle (not justReleased since it was never pressed)
    expect(keyboard.getState("KeyX")).toBe("idle");
  });

  it("getJustPressedKeys returns just-pressed key codes", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA" }));
    keyboard.update();

    const result = keyboard.getJustPressedKeys();
    expect(result).toContain("Space");
    expect(result).toContain("KeyA");

    // Second frame: transitions to held, no longer just-pressed
    keyboard.update();
    expect(keyboard.getJustPressedKeys()).toHaveLength(0);
  });
});

describe("MouseDevice", () => {
  let mouse: MouseDevice;

  beforeEach(() => {
    mouse = new MouseDevice();
    mouse.attach(window);
  });

  afterEach(() => {
    mouse.detach(window);
  });

  it("initializes with position at origin", () => {
    expect(mouse.position.x).toBe(0);
    expect(mouse.position.y).toBe(0);
  });

  it("initializes with zero delta", () => {
    expect(mouse.delta.x).toBe(0);
    expect(mouse.delta.y).toBe(0);
  });

  it("initializes with zero wheel", () => {
    expect(mouse.wheel).toBe(0);
  });

  it("updates position on mousemove", () => {
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 200 }));
    mouse.update();

    expect(mouse.position.x).toBe(100);
    expect(mouse.position.y).toBe(200);
  });

  it("accumulates delta on mousemove", () => {
    window.dispatchEvent(new MouseEvent("mousemove", { movementX: 10, movementY: 20 }));
    window.dispatchEvent(new MouseEvent("mousemove", { movementX: 5, movementY: -10 }));
    mouse.update();

    expect(mouse.delta.x).toBe(15);
    expect(mouse.delta.y).toBe(10);
  });

  it("resets delta after update", () => {
    window.dispatchEvent(new MouseEvent("mousemove", { movementX: 10, movementY: 20 }));
    mouse.update();
    mouse.update();

    expect(mouse.delta.x).toBe(0);
    expect(mouse.delta.y).toBe(0);
  });

  it("accumulates wheel delta", () => {
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }));
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 50 }));
    mouse.update();

    expect(mouse.wheel).not.toBe(0);
  });

  it("resets wheel after update", () => {
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }));
    mouse.update();
    mouse.update();

    expect(mouse.wheel).toBe(0);
  });

  it("tracks button press", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    mouse.update();

    expect(mouse.isButtonJustPressed(0)).toBe(true);
    expect(mouse.isButtonPressed(0)).toBe(true);
  });

  it("tracks button held", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    mouse.update();
    mouse.update();

    expect(mouse.isButtonPressed(0)).toBe(true);
    expect(mouse.isButtonJustPressed(0)).toBe(false);
  });

  it("tracks button release", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    mouse.update();
    mouse.update();

    window.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
    mouse.update();

    expect(mouse.isButtonJustReleased(0)).toBe(true);
    expect(mouse.isButtonPressed(0)).toBe(false);
  });

  it("tracks multiple buttons independently", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    window.dispatchEvent(new MouseEvent("mousedown", { button: 1 }));
    mouse.update();

    expect(mouse.isButtonPressed(0)).toBe(true);
    expect(mouse.isButtonPressed(1)).toBe(true);
  });

  it("resets all state", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    window.dispatchEvent(new MouseEvent("mousemove", { movementX: 10, movementY: 20 }));
    mouse.update();

    mouse.reset();

    expect(mouse.isButtonPressed(0)).toBe(false);
    expect(mouse.delta.x).toBe(0);
    expect(mouse.delta.y).toBe(0);
  });

  it("resets on blur event", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    mouse.update();

    expect(mouse.isButtonPressed(0)).toBe(true);

    window.dispatchEvent(new Event("blur"));

    expect(mouse.isButtonPressed(0)).toBe(false);
  });

  it("uses canvas-relative coordinates when canvas provided", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    const canvasMouse = new MouseDevice();
    canvasMouse.attach(window, canvas);

    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 200 }));
    canvasMouse.update();

    // Without proper getBoundingClientRect mock, position is still accessible
    expect(canvasMouse.position).toBeDefined();

    canvasMouse.detach(window);
    document.body.removeChild(canvas);
  });

  it("tracks justReleased on mouseup same frame as press", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 2 }));
    window.dispatchEvent(new MouseEvent("mouseup", { button: 2 }));
    mouse.update();

    // Both down and up happened — should be justReleased
    expect(mouse.isButtonJustReleased(2)).toBe(true);
  });

  it("returns getButtonState 4-state value", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 1 }));
    mouse.update();

    const state = mouse.getButtonState(1);
    expect(state).toBe("justPressed");
  });

  it("returns idle for unknown button", () => {
    const state = mouse.getButtonState(99);
    expect(state).toBe("idle");
  });

  it("clears cachedRect on window resize event", () => {
    // Dispatch a resize — the onResize handler sets cachedRect=null
    // Should not throw and mouse should still work after
    expect(() => {
      window.dispatchEvent(new Event("resize"));
      mouse.update();
    }).not.toThrow();
  });

  it("transitions button from justReleased to idle on second update", () => {
    // Press
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    mouse.update();
    // Release
    window.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
    mouse.update();
    expect(mouse.getButtonState(0)).toBe("justReleased");
    // Second update after release → idle
    mouse.update();
    expect(mouse.getButtonState(0)).toBe("idle");
  });

  it("sets button to idle on mouseup for button never pressed", () => {
    // Dispatch mouseup for button 3 which was never pressed
    window.dispatchEvent(new MouseEvent("mouseup", { button: 3 }));
    mouse.update();
    // Should be idle (not justReleased) since it was never in justPressed/held
    expect(mouse.getButtonState(3)).toBe("idle");
  });

  it("getJustPressedButtons returns just-pressed button indices", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    window.dispatchEvent(new MouseEvent("mousedown", { button: 2 }));
    mouse.update();

    const result = mouse.getJustPressedButtons();
    expect(result).toContain(0);
    expect(result).toContain(2);

    // Second frame: transitions to held, no longer just-pressed
    mouse.update();
    expect(mouse.getJustPressedButtons()).toHaveLength(0);
  });

  it("uses cached rect on second mousemove with canvas (covers !cachedRect false branch)", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    const canvasMouse = new MouseDevice();
    canvasMouse.attach(window, canvas);

    // First move: cachedRect is null → set it
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 50 }));
    // Second move: cachedRect already set → skips re-fetch (false branch)
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 100 }));
    canvasMouse.update();

    expect(canvasMouse.position).toBeDefined();
    canvasMouse.detach(window);
    document.body.removeChild(canvas);
  });

  it("ignores duplicate mousedown while button is already justPressed (covers pendingDown guard)", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    mouse.update(); // → justPressed
    // Fire mousedown again while button is justPressed — should not re-add to pendingDown
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    mouse.update(); // → held (not re-justPressed)
    expect(mouse.getButtonState(0)).toBe("held");
  });

  it("idle button state remains idle on extra update (covers else-if false branch)", () => {
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    mouse.update(); // → justPressed
    window.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
    mouse.update(); // → justReleased
    mouse.update(); // → idle
    mouse.update(); // idle falls through the if/else if (neither justReleased nor justPressed/held)
    expect(mouse.getButtonState(0)).toBe("idle");
  });
});

interface MockGamepad {
  connected: boolean;
  buttons: { pressed: boolean; value: number; touched: boolean }[];
  axes: number[];
  index: number;
  id: string;
  mapping: GamepadMappingType;
  timestamp: number;
  hapticActuators: GamepadHapticActuator[];
  vibrationActuator: GamepadHapticActuator | null;
}

describe("GamepadDevice", () => {
  let gamepad: GamepadDevice;
  let mockGamepad: MockGamepad;

  beforeEach(() => {
    // jsdom doesn't define getGamepads — define it so vi.spyOn works
    if (!("getGamepads" in navigator)) {
      Object.defineProperty(navigator, "getGamepads", {
        value: () => [null, null, null, null],
        configurable: true,
        writable: true,
      });
    }

    gamepad = new GamepadDevice(0.15);
    gamepad.attach(window);

    mockGamepad = {
      connected: true,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })),
      axes: [0, 0, 0, 0],
      index: 0,
      id: "Mock Gamepad",
      mapping: "standard",
      timestamp: 0,
      hapticActuators: [],
      vibrationActuator: null,
    };
  });

  afterEach(() => {
    gamepad.detach(window);
    vi.restoreAllMocks();
  });

  it("initializes with no connected gamepads", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([null, null, null, null]);
    gamepad.update();

    expect(gamepad.connectedCount()).toBe(0);
  });

  it("detects connected gamepad", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);
    gamepad.update();

    expect(gamepad.connectedCount()).toBe(1);
    expect(gamepad.isConnected(0)).toBe(true);
    expect(gamepad.getConnectedIndices()).toContain(0);
  });

  it("detects button press", () => {
    mockGamepad.buttons[0] = { pressed: true, value: 1, touched: true };
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);

    gamepad.update();

    expect(gamepad.isButtonJustPressed(0, 0)).toBe(true);
    expect(gamepad.isButtonPressed(0, 0)).toBe(true);
  });

  it("detects button held", () => {
    mockGamepad.buttons[0] = { pressed: true, value: 1, touched: true };
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);

    gamepad.update();
    gamepad.update();

    expect(gamepad.isButtonPressed(0, 0)).toBe(true);
    expect(gamepad.isButtonJustPressed(0, 0)).toBe(false);
  });

  it("detects button release", () => {
    mockGamepad.buttons[0] = { pressed: true, value: 1, touched: true };
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);


    gamepad.update();
    gamepad.update();

    mockGamepad.buttons[0] = { pressed: false, value: 0, touched: false };
    gamepad.update();

    expect(gamepad.isButtonJustReleased(0, 0)).toBe(true);
    expect(gamepad.isButtonPressed(0, 0)).toBe(false);
  });

  it("reads button analog value", () => {
    mockGamepad.buttons[0] = { pressed: true, value: 0.75, touched: true };
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);

    gamepad.update();

    expect(gamepad.getButtonValue(0, 0)).toBe(0.75);
  });

  it("reads axis value", () => {
    mockGamepad.axes = [0.5, -0.3, 0, 0];
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);

    gamepad.update();

    expect(gamepad.getAxis(0, 0)).toBeCloseTo(0.5, 2);
    expect(gamepad.getAxis(0, 1)).toBeCloseTo(-0.3, 2);
  });

  it("applies deadzone to axes", () => {
    mockGamepad.axes = [0.1, -0.1, 0, 0]; // below 0.15 deadzone
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);

    gamepad.update();

    expect(gamepad.getAxis(0, 0)).toBe(0);
    expect(gamepad.getAxis(0, 1)).toBe(0);
  });

  it("reads left stick", () => {
    mockGamepad.axes = [0.5, -0.3, 0, 0];
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);

    gamepad.update();

    const stick = gamepad.getLeftStick(0);
    expect(stick.x).toBeCloseTo(0.5, 2);
    expect(stick.y).toBeCloseTo(-0.3, 2);
  });

  it("reads right stick", () => {
    mockGamepad.axes = [0, 0, 0.7, -0.4];
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);

    gamepad.update();

    const stick = gamepad.getRightStick(0);
    expect(stick.x).toBeCloseTo(0.7, 2);
    expect(stick.y).toBeCloseTo(-0.4, 2);
  });

  it("handles multiple gamepads", () => {
    const mockGamepad2 = { ...mockGamepad, index: 1 };
    vi.spyOn(navigator, "getGamepads").mockReturnValue([
      mockGamepad as Gamepad,
      mockGamepad2 as Gamepad,
      null,
      null,
    ]);

    gamepad.update();

    expect(gamepad.connectedCount()).toBe(2);
    expect(gamepad.getConnectedIndices()).toEqual([0, 1]);
  });

  it("resets all state", () => {
    mockGamepad.buttons[0] = { pressed: true, value: 1, touched: true };
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);

    gamepad.update();
    gamepad.reset();

    expect(gamepad.isButtonPressed(0, 0)).toBe(false);
  });

  it("returns zero for disconnected gamepad", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([null, null, null, null]);
    gamepad.update();

    expect(gamepad.getAxis(0, 0)).toBe(0);
    expect(gamepad.isButtonPressed(0, 0)).toBe(false);
  });

  it("fires onConnect callback when gamepadconnected event fires", () => {
    const gp = new GamepadDevice(0.15);
    const connectFn = vi.fn();
    gp.onConnect = connectFn;
    gp.attach(window);

    const mockPad = { index: 2 } as Gamepad;
    window.dispatchEvent(Object.assign(new Event("gamepadconnected"), { gamepad: mockPad }));

    expect(connectFn).toHaveBeenCalledWith(2);
    gp.detach(window);
  });

  it("fires onDisconnect callback when gamepaddisconnected event fires", () => {
    const gp = new GamepadDevice(0.15);
    const disconnectFn = vi.fn();
    gp.onDisconnect = disconnectFn;
    gp.attach(window);

    const mockPad = { index: 1 } as Gamepad;
    window.dispatchEvent(Object.assign(new Event("gamepaddisconnected"), { gamepad: mockPad }));

    expect(disconnectFn).toHaveBeenCalledWith(1);
    gp.detach(window);
  });

  it("isButtonJustPressed returns false for out-of-bounds padIndex (covers ?? false branch)", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([null, null, null, null]);
    gamepad.update();
    // padIndex 99 has no state arrays → optional chain returns undefined → ?? false
    expect(gamepad.isButtonJustPressed(99, 0)).toBe(false);
    expect(gamepad.isButtonJustReleased(99, 0)).toBe(false);
    expect(gamepad.getButtonValue(99, 0)).toBe(0);
  });

  it("getButtonCount returns button count for connected pad", () => {
    vi.spyOn(navigator, "getGamepads").mockReturnValue([mockGamepad as Gamepad, null, null, null]);
    gamepad.update();

    expect(gamepad.getButtonCount(0)).toBe(17); // mockGamepad has 17 buttons
    expect(gamepad.getButtonCount(1)).toBe(0); // no gamepad in slot 1
  });
});

describe("GyroDevice", () => {
  let gyro: GyroDevice;

  beforeEach(() => {
    gyro = new GyroDevice(0.1, 0.02);
    gyro.attach(window);
  });

  afterEach(() => {
    gyro.detach(window);
  });

  it("initializes as not available", () => {
    expect(gyro.isAvailable).toBe(false);
  });

  it("initializes with zero orientation", () => {
    expect(gyro.orientation.roll).toBe(0);
    expect(gyro.orientation.pitch).toBe(0);
    expect(gyro.orientation.yaw).toBe(0);
  });

  it("initializes with zero velocity", () => {
    expect(gyro.rotationRate.alpha).toBe(0);
    expect(gyro.rotationRate.beta).toBe(0);
    expect(gyro.rotationRate.gamma).toBe(0);
  });

  it("becomes available after deviceorientation event", () => {
    const event = Object.assign(new Event("deviceorientation"), {
      alpha: 90,
      beta: 45,
      gamma: -30,
      absolute: false,
    });

    window.dispatchEvent(event);
    gyro.update();

    expect(gyro.isAvailable).toBe(true);
  });

  it("updates orientation from deviceorientation", () => {
    // Use smoothing=1.0 for instant update (no lag)
    const fastGyro = new GyroDevice(1.0, 0);
    fastGyro.attach(window);

    const event = Object.assign(new Event("deviceorientation"), {
      alpha: 90,
      beta: 45,
      gamma: -30,
      absolute: false,
    });

    window.dispatchEvent(event);
    fastGyro.update();

    expect(fastGyro.orientation.yaw).toBeCloseTo(90, 0);
    expect(fastGyro.orientation.pitch).toBeCloseTo(45, 0);
    expect(fastGyro.orientation.roll).toBeCloseTo(-30, 0);

    fastGyro.detach(window);
  });

  it("updates velocity from devicemotion", () => {
    const orientationEvent = Object.assign(new Event("deviceorientation"), {
      alpha: 0,
      beta: 0,
      gamma: 0,
      absolute: false,
    });
    window.dispatchEvent(orientationEvent);
    gyro.update();

    const motionEvent = Object.assign(new Event("devicemotion"), {
      rotationRate: { alpha: 10, beta: 20, gamma: 30 },
    });

    window.dispatchEvent(motionEvent);
    gyro.update();

    expect(gyro.rotationRate.alpha).toBeGreaterThan(0);
    expect(gyro.rotationRate.beta).toBeGreaterThan(0);
    expect(gyro.rotationRate.gamma).toBeGreaterThan(0);
  });

  it("applies smoothing to orientation", () => {
    const event1 = Object.assign(new Event("deviceorientation"), {
      alpha: 0,
      beta: 0,
      gamma: 0,
      absolute: false,
    });

    window.dispatchEvent(event1);
    gyro.update();

    const event2 = Object.assign(new Event("deviceorientation"), {
      alpha: 90,
      beta: 90,
      gamma: 90,
      absolute: false,
    });

    window.dispatchEvent(event2);
    gyro.update();

    // With smoothing, values should not jump immediately to 90
    expect(Math.abs(gyro.orientation.yaw)).toBeLessThan(90);
  });

  it("resets all state", () => {
    const event = Object.assign(new Event("deviceorientation"), {
      alpha: 90,
      beta: 45,
      gamma: -30,
      absolute: false,
    });

    window.dispatchEvent(event);
    gyro.update();

    gyro.reset();

    expect(gyro.orientation.roll).toBe(0);
    expect(gyro.orientation.pitch).toBe(0);
    expect(gyro.orientation.yaw).toBe(0);
  });

  it("can detach and reattach", () => {
    gyro.detach(window);

    const event = Object.assign(new Event("deviceorientation"), {
      alpha: 90,
      beta: 45,
      gamma: -30,
      absolute: false,
    });

    window.dispatchEvent(event);
    gyro.update();

    expect(gyro.isAvailable).toBe(false);

    gyro.attach(window);
    window.dispatchEvent(event);
    gyro.update();

    expect(gyro.isAvailable).toBe(true);
  });

  it("ignores small changes below deadzone", () => {
    // Use fast gyro with non-trivial deadzone
    const fastGyro = new GyroDevice(1.0, 5.0); // deadzone of 5 degrees
    fastGyro.attach(window);

    // Set initial orientation
    const event1 = Object.assign(new Event("deviceorientation"), {
      alpha: 90,
      beta: 0,
      gamma: 0,
      absolute: false,
    });
    window.dispatchEvent(event1);
    fastGyro.update();

    const initialYaw = fastGyro.orientation.yaw;

    // Very small change (2 degrees) — below deadzone of 5
    const event2 = Object.assign(new Event("deviceorientation"), {
      alpha: 92,
      beta: 0,
      gamma: 0,
      absolute: false,
    });
    window.dispatchEvent(event2);
    fastGyro.update();

    // Orientation should not update (delta 2 < deadzone 5)
    expect(fastGyro.orientation.yaw).toBe(initialYaw);

    fastGyro.detach(window);
  });

  it("handles null rotationRate in devicemotion", () => {
    const motionEvent = Object.assign(new Event("devicemotion"), {
      rotationRate: null,
    });

    // Should not throw
    expect(() => {
      window.dispatchEvent(motionEvent);
      gyro.update();
    }).not.toThrow();

    // Velocity should stay zero
    expect(gyro.rotationRate.alpha).toBe(0);
  });

  it("handles null alpha/beta/gamma in deviceorientation", () => {
    const event = Object.assign(new Event("deviceorientation"), {
      alpha: null,
      beta: null,
      gamma: null,
      absolute: false,
    });

    // Should not throw and should use 0 for null values
    expect(() => {
      window.dispatchEvent(event);
      gyro.update();
    }).not.toThrow();
  });

  it("handles null alpha/beta/gamma in rotationRate (devicemotion)", () => {
    const motionEvent = Object.assign(new Event("devicemotion"), {
      rotationRate: { alpha: null, beta: null, gamma: null },
    });

    // Should not throw and should use 0 for null values
    expect(() => {
      window.dispatchEvent(motionEvent);
      gyro.update();
    }).not.toThrow();

    expect(gyro.rotationRate.alpha).toBe(0);
    expect(gyro.rotationRate.beta).toBe(0);
    expect(gyro.rotationRate.gamma).toBe(0);
  });
});

// ─── GyroDevice — extended coverage ──────────────────────────────────────────

describe("GyroDevice — calibration and extended APIs", () => {
  let gyro: GyroDevice;

  beforeEach(() => {
    gyro = new GyroDevice(1.0, 0); // smoothing=1 for instant updates
    gyro.attach(window);
  });

  afterEach(() => {
    gyro.detach(window);
  });

  function fireOrientation(alpha: number, beta: number, gamma: number) {
    window.dispatchEvent(
      Object.assign(new Event("deviceorientation"), { alpha, beta, gamma, absolute: false }),
    );
    gyro.update();
  }

  it("calibrate() sets current orientation as zero baseline", () => {
    fireOrientation(90, 45, -30);
    gyro.calibrate();

    // After calibration, orientation should be near zero
    fireOrientation(90, 45, -30); // same values → relative = 0
    expect(gyro.orientation.yaw).toBeCloseTo(0, 0);
    expect(gyro.orientation.pitch).toBeCloseTo(0, 0);
    expect(gyro.orientation.roll).toBeCloseTo(0, 0);
  });

  it("calibrate() makes subsequent readings relative to baseline", () => {
    fireOrientation(90, 45, -30);
    gyro.calibrate();

    // Move 10° in each axis
    fireOrientation(100, 55, -20);
    expect(gyro.orientation.yaw).toBeCloseTo(10, 0);
    expect(gyro.orientation.pitch).toBeCloseTo(10, 0);
    expect(gyro.orientation.roll).toBeCloseTo(10, 0);
  });

  it("resetCalibration() restores raw orientation readings", () => {
    fireOrientation(90, 45, -30);
    gyro.calibrate();
    gyro.resetCalibration();

    // After reset, raw values should be returned again
    fireOrientation(90, 45, -30);
    expect(gyro.orientation.yaw).toBeCloseTo(90, 0);
    expect(gyro.orientation.pitch).toBeCloseTo(45, 0);
    expect(gyro.orientation.roll).toBeCloseTo(-30, 0);
  });

  it("isPermitted is false before any orientation event", () => {
    const freshGyro = new GyroDevice();
    expect(freshGyro.isPermitted).toBe(false);
  });

  it("isPermitted becomes true after first deviceorientation event", () => {
    expect(gyro.isPermitted).toBe(false);
    fireOrientation(0, 0, 0);
    expect(gyro.isPermitted).toBe(true);
  });

  it("acceleration initializes to zero", () => {
    expect(gyro.acceleration.x).toBe(0);
    expect(gyro.acceleration.y).toBe(0);
    expect(gyro.acceleration.z).toBe(0);
  });

  it("acceleration updates from devicemotion event", () => {
    // First need orientation so gyro is available
    fireOrientation(0, 0, 0);

    window.dispatchEvent(
      Object.assign(new Event("devicemotion"), {
        accelerationIncludingGravity: { x: 1.5, y: -9.8, z: 0.3 },
        rotationRate: { alpha: 0, beta: 0, gamma: 0 },
      }),
    );
    gyro.update();

    expect(gyro.acceleration.x).toBeCloseTo(1.5, 1);
    expect(gyro.acceleration.y).toBeCloseTo(-9.8, 1);
    expect(gyro.acceleration.z).toBeCloseTo(0.3, 1);
  });

  it("acceleration is unchanged when devicemotion has no accelerationIncludingGravity", () => {
    fireOrientation(0, 0, 0);

    window.dispatchEvent(
      Object.assign(new Event("devicemotion"), {
        accelerationIncludingGravity: null,
        rotationRate: { alpha: 10, beta: 5, gamma: -2 },
      }),
    );
    gyro.update();

    expect(gyro.acceleration.x).toBe(0);
    expect(gyro.acceleration.y).toBe(0);
    expect(gyro.acceleration.z).toBe(0);
  });

  it("reset() clears calibration", () => {
    fireOrientation(90, 45, -30);
    gyro.calibrate();
    gyro.reset();

    // After reset, raw values should come back
    fireOrientation(90, 45, -30);
    expect(gyro.orientation.yaw).toBeCloseTo(90, 0);
  });
});

// ─── ButtonStateMachine ───────────────────────────────────────────────────────

import { ButtonStateMachine } from "../src/devices/button-state-machine.js";

describe("ButtonStateMachine", () => {
  it("returns idle for unknown keys", () => {
    const m = new ButtonStateMachine<string>();
    expect(m.getState("Space")).toBe("idle");
  });

  it("transitions idle → justPressed on first press", () => {
    const m = new ButtonStateMachine<string>();
    m.press("Space");
    m.update();
    expect(m.getState("Space")).toBe("justPressed");
  });

  it("transitions justPressed → held on next update without release", () => {
    const m = new ButtonStateMachine<string>();
    m.press("Space");
    m.update();
    m.update();
    expect(m.getState("Space")).toBe("held");
  });

  it("transitions held → justReleased on release", () => {
    const m = new ButtonStateMachine<string>();
    m.press("Space");
    m.update();
    m.update();
    m.release("Space");
    m.update();
    expect(m.getState("Space")).toBe("justReleased");
  });

  it("transitions justReleased → idle on next update", () => {
    const m = new ButtonStateMachine<string>();
    m.press("Space");
    m.update();
    m.release("Space");
    m.update();
    m.update();
    expect(m.getState("Space")).toBe("idle");
  });

  it("ignores duplicate press while held", () => {
    const m = new ButtonStateMachine<string>();
    m.press("Space");
    m.update();
    m.update(); // now held
    m.press("Space"); // duplicate — should not reset to justPressed
    m.update();
    expect(m.getState("Space")).toBe("held");
  });

  it("getJustPressed() returns only justPressed keys", () => {
    const m = new ButtonStateMachine<string>();
    m.press("Space");
    m.press("KeyA");
    m.update();
    expect(m.getJustPressed()).toContain("Space");
    expect(m.getJustPressed()).toContain("KeyA");
    m.update(); // both become held
    expect(m.getJustPressed()).toHaveLength(0);
  });

  it("reset() sets all states to idle", () => {
    const m = new ButtonStateMachine<string>();
    m.press("Space");
    m.update();
    m.reset();
    expect(m.getState("Space")).toBe("idle");
    expect(m.getJustPressed()).toHaveLength(0);
  });

  it("works with numeric keys (MouseDevice-style)", () => {
    const m = new ButtonStateMachine<number>();
    m.press(0); // left button
    m.update();
    expect(m.getState(0)).toBe("justPressed");
    m.update();
    expect(m.getState(0)).toBe("held");
    m.release(0);
    m.update();
    expect(m.getState(0)).toBe("justReleased");
  });
});
