/**
 * Type-level tests for the @gwenjs/input public API.
 *
 * These tests have no runtime assertions. They verify that TypeScript
 * infers the correct types from the public API — particularly the generic
 * `ActionRef<T>` / `ActionState<T>` chain and `defineInputSchema` inference.
 *
 * If these tests compile without errors, the type system is correct.
 * A runtime `expect(true).toBe(true)` is used to ensure Vitest counts them.
 */
import { describe, it, expect } from "vitest";
import { defineAction } from "../src/actions/define-action.js";
import { defineInputSchema } from "../src/actions/define-input-schema.js";
import type {
  ActionRef,
  ButtonActionState,
  Axis1DActionState,
  Axis2DActionState,
} from "../src/types.js";

// ─── ActionRef inference ──────────────────────────────────────────────────────

describe("ActionRef type inference", () => {
  it("defineAction infers literal type from string literal", () => {
    const Jump = defineAction("Jump", { type: "button" });
    const Move = defineAction("Move", { type: "axis2d" });
    const Steer = defineAction("Steer", { type: "axis1d" });

    // Type assertions via assignment — fails at compile-time if wrong
    const _j: ActionRef<"button"> = Jump;
    const _m: ActionRef<"axis2d"> = Move;
    const _s: ActionRef<"axis1d"> = Steer;

    // Runtime sanity
    expect(_j.type).toBe("button");
    expect(_m.type).toBe("axis2d");
    expect(_s.type).toBe("axis1d");
  });
});

// ─── defineInputSchema inference ─────────────────────────────────────────────

describe("defineInputSchema type inference", () => {
  it("actions object has correctly typed ActionRef<T> per entry", () => {
    const { actions } = defineInputSchema("game", {
      priority: 0,
      actions: {
        Jump:   { type: "button", bindings: [] },
        Move:   { type: "axis2d", bindings: [] },
        Steer:  { type: "axis1d", bindings: [] },
      },
    });

    const _j: ActionRef<"button"> = actions.Jump;
    const _m: ActionRef<"axis2d"> = actions.Move;
    const _s: ActionRef<"axis1d"> = actions.Steer;

    expect(_j.type).toBe("button");
    expect(_m.type).toBe("axis2d");
    expect(_s.type).toBe("axis1d");
  });
});

// ─── ActionState conditional types ───────────────────────────────────────────

describe("ActionState conditional types", () => {
  it("ButtonActionState has isPressed, isJustTriggered, isJustReleased, holdTime", () => {
    const state: ButtonActionState = {
      type: "button",
      isPressed: false,
      isJustTriggered: false,
      isJustReleased: false,
      holdTime: 0,
    };
    expect(state.type).toBe("button");
  });

  it("Axis1DActionState has value and rawValue", () => {
    const state: Axis1DActionState = {
      type: "axis1d",
      value: 0.5,
      rawValue: 0.5,
    };
    expect(state.type).toBe("axis1d");
  });

  it("Axis2DActionState has value, rawValue, and magnitude", () => {
    const state: Axis2DActionState = {
      type: "axis2d",
      value: { x: 0, y: 0 },
      rawValue: { x: 0, y: 0 },
      magnitude: 0,
    };
    expect(state.type).toBe("axis2d");
  });
});
