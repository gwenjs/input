import { describe, it, expect } from "vitest";
import { MouseDelta, MouseWheel } from "../src/contexts/mouse-sources.js";
import { MotionGesture } from "../src/contexts/gyro-sources.js";
import { TouchGesture, VirtualJoystick, VirtualButton } from "../src/contexts/touch-sources.js";
import { Composite2D, Composite } from "../src/contexts/composite.js";

describe("MouseDelta", () => {
  it("returns mouse:delta source", () => {
    const src = MouseDelta();
    expect(src._type).toBe("mouse:delta");
  });
});

describe("MouseWheel", () => {
  it("returns mouse:wheel source", () => {
    const src = MouseWheel();
    expect(src._type).toBe("mouse:wheel");
  });
});

describe("MotionGesture", () => {
  it("creates Shake gesture with default threshold", () => {
    const src = MotionGesture.Shake();
    expect(src._type).toBe("motion:shake");
    expect((src as any).threshold).toBe(15);
  });

  it("creates Shake gesture with custom threshold", () => {
    const src = MotionGesture.Shake({ threshold: 20 });
    expect((src as any).threshold).toBe(20);
  });

  it("creates Tilt gesture", () => {
    const src = MotionGesture.Tilt({ axis: "roll", degrees: 30 });
    expect(src._type).toBe("motion:tilt");
    expect((src as any).axis).toBe("roll");
    expect((src as any).degrees).toBe(30);
  });

  it("creates Tilt with pitch axis", () => {
    const src = MotionGesture.Tilt({ axis: "pitch", degrees: 45 });
    expect((src as any).axis).toBe("pitch");
  });
});

describe("TouchGesture", () => {
  it("creates Tap gesture with defaults", () => {
    const src = TouchGesture.Tap();
    expect(src._type).toBe("gesture:tap");
    expect((src as any).fingers).toBe(1);
  });

  it("creates Tap gesture with 2 fingers", () => {
    const src = TouchGesture.Tap({ fingers: 2 });
    expect((src as any).fingers).toBe(2);
  });

  it("creates Swipe gesture", () => {
    const src = TouchGesture.Swipe({ direction: "left" });
    expect(src._type).toBe("gesture:swipe");
    expect((src as any).direction).toBe("left");
  });

  it("creates Swipe with custom minDistance", () => {
    const src = TouchGesture.Swipe({ direction: "up", minDistance: 100 });
    expect((src as any).minDistance).toBe(100);
  });

  it("creates Pinch gesture", () => {
    const src = TouchGesture.Pinch();
    expect(src._type).toBe("gesture:pinch");
  });

  it("creates Rotate gesture", () => {
    const src = TouchGesture.Rotate();
    expect(src._type).toBe("gesture:rotate");
  });
});

describe("VirtualJoystick / VirtualButton", () => {
  it("creates VirtualJoystick source", () => {
    const src = VirtualJoystick("left");
    expect(src._type).toBe("virtual:joystick");
    expect((src as any).id).toBe("left");
  });

  it("creates VirtualButton source", () => {
    const src = VirtualButton("jump");
    expect(src._type).toBe("virtual:button");
    expect((src as any).id).toBe("jump");
  });
});

describe("Composite2D", () => {
  it("creates composite2d source", () => {
    const src = Composite2D({ up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" });
    expect(src._type).toBe("composite2d");
    expect(src.up).toBe("KeyW");
    expect(src.down).toBe("KeyS");
    expect(src.left).toBe("KeyA");
    expect(src.right).toBe("KeyD");
  });
});

describe("Composite (1D)", () => {
  it("creates composite1d source", () => {
    const src = Composite({ negative: "KeyA", positive: "KeyD" });
    expect(src._type).toBe("composite1d");
    expect(src.positive).toBe("KeyD");
    expect(src.negative).toBe("KeyA");
  });
});
