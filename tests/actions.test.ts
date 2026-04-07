import { describe, it, expect, expectTypeOf } from "vitest";
import { defineAction } from "../src/actions/define-action.js";
import { defineInputSchema } from "../src/actions/define-input-schema.js";
import type { ActionRef } from "../src/types.js";

describe("defineAction", () => {
  it("creates a button action with unique symbol ID", () => {
    const action = defineAction("jump", { type: "button" });

    expect(action.name).toBe("jump");
    expect(action.type).toBe("button");
    expect(typeof action.id).toBe("symbol");
    expectTypeOf(action).toMatchTypeOf<ActionRef<"button">>();
  });

  it("creates an axis1d action", () => {
    const action = defineAction("throttle", { type: "axis1d" });

    expect(action.name).toBe("throttle");
    expect(action.type).toBe("axis1d");
    expectTypeOf(action).toMatchTypeOf<ActionRef<"axis1d">>();
  });

  it("creates an axis2d action", () => {
    const action = defineAction("move", { type: "axis2d" });

    expect(action.name).toBe("move");
    expect(action.type).toBe("axis2d");
    expectTypeOf(action).toMatchTypeOf<ActionRef<"axis2d">>();
  });

  it("creates unique IDs for actions with the same name", () => {
    const action1 = defineAction("fire", { type: "button" });
    const action2 = defineAction("fire", { type: "button" });

    expect(action1.id).not.toBe(action2.id);
    expect(action1.name).toBe(action2.name);
  });
});

describe("defineInputSchema", () => {
  it("creates actions and context from schema with button action", () => {
    const schema = {
      jump: { type: "button" as const, bindings: ["Space"] },
    };

    const result = defineInputSchema("gameplay", { priority: 10, actions: schema });

    expect(result.actions.jump.name).toBe("jump");
    expect(result.actions.jump.type).toBe("button");
    expect(result.context.name).toBe("gameplay");
    expect(result.context.priority).toBe(10);
    expect(result.context.bindings).toHaveLength(1);
  });

  it("creates multiple actions from schema", () => {
    const schema = {
      move: { type: "axis2d" as const, bindings: ["wasd"] },
      jump: { type: "button" as const, bindings: ["Space", 0] },
      aim: { type: "axis1d" as const, bindings: [] },
    };

    const result = defineInputSchema("player", { priority: 5, actions: schema });

    expect(result.actions.move.type).toBe("axis2d");
    expect(result.actions.jump.type).toBe("button");
    expect(result.actions.aim.type).toBe("axis1d");
    expect(result.context.bindings).toHaveLength(3); // move=1 + jump=2 bindings = 3 total
  });

  it("handles multiple bindings per action", () => {
    const schema = {
      fire: { type: "button" as const, bindings: ["KeyF", 0, 1] },
    };

    const result = defineInputSchema("combat", { priority: 20, actions: schema });

    expect(result.context.bindings).toHaveLength(3);
  });

  it("handles empty bindings array", () => {
    const schema = {
      special: { type: "button" as const, bindings: [] },
    };

    const result = defineInputSchema("test", { priority: 0, actions: schema });

    expect(result.actions.special).toBeDefined();
    expect(result.context.bindings).toHaveLength(0);
  });

  it("preserves priority value", () => {
    const result1 = defineInputSchema("high", { priority: 100, actions: {} });
    const result2 = defineInputSchema("low", { priority: -10, actions: {} });

    expect(result1.context.priority).toBe(100);
    expect(result2.context.priority).toBe(-10);
  });

  it("creates unique action IDs for each schema", () => {
    const schema1 = { jump: { type: "button" as const, bindings: [] } };
    const schema2 = { jump: { type: "button" as const, bindings: [] } };

    const result1 = defineInputSchema("schema1", { priority: 0, actions: schema1 });
    const result2 = defineInputSchema("schema2", { priority: 0, actions: schema2 });

    expect(result1.actions.jump.id).not.toBe(result2.actions.jump.id);
  });
});
