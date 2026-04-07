import { describe, it, expect, beforeEach } from "vitest";
import { ProcessorPipeline } from "../src/processors/pipeline.js";
import { DeadZone } from "../src/processors/deadzone.js";
import { Scale } from "../src/processors/scale.js";
import { Invert, InvertX, InvertY } from "../src/processors/invert.js";
import { Clamp } from "../src/processors/clamp.js";
import { Normalize } from "../src/processors/normalize.js";
import { Smooth } from "../src/processors/smooth.js";
import { SwizzleXY } from "../src/processors/swizzle.js";

describe("ProcessorPipeline", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("returns boolean values unchanged", () => {
    const result = pipeline.process(true, []);
    expect(result).toBe(true);
  });

  it("returns number unchanged when no processors", () => {
    const result = pipeline.process(0.5, []);
    expect(result).toBe(0.5);
  });

  it("returns vector unchanged when no processors", () => {
    const input = { x: 0.5, y: -0.3 };
    const result = pipeline.process(input, []);
    expect(result).toEqual(input);
  });

  it("applies single processor", () => {
    const result = pipeline.process(0.5, [Scale(2)]);
    expect(result).toBe(1.0);
  });

  it("applies multiple processors in order", () => {
    const result = pipeline.process(0.5, [Scale(2), Clamp(-1, 1)]);
    expect(result).toBe(1.0);
  });

  it("chains processors correctly", () => {
    // 0.5 -> scale(2) -> 1.0 -> invert() -> -1.0
    const result = pipeline.process(0.5, [Scale(2), Invert()]);
    expect(result).toBe(-1.0);
  });
});

describe("DeadZone processor", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("zeros out values below threshold", () => {
    const result = pipeline.process(0.1, [DeadZone(0.2)]);
    expect(result).toBe(0);
  });

  it("preserves values above threshold", () => {
    const result = pipeline.process(0.5, [DeadZone(0.2)]);
    expect(result).toBeGreaterThan(0);
  });

  it("handles negative values", () => {
    const result = pipeline.process(-0.1, [DeadZone(0.2)]);
    expect(result).toBe(0);
  });

  it("passes values above threshold unchanged", () => {
    // Deadzone doesn't remap, just zeros below threshold
    const result = pipeline.process(0.3, [DeadZone(0.2)]);
    expect(result).toBe(0.3);
  });

  it("applies deadzone to 2D vectors by magnitude", () => {
    const input = { x: 0.1, y: 0.1 };
    const result = pipeline.process(input, [DeadZone(0.2)]);
    // magnitude = sqrt(0.1^2 + 0.1^2) = 0.141, below 0.2
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("preserves 2D vector direction above threshold", () => {
    const input = { x: 0.6, y: 0.8 }; // magnitude = 1.0
    const result = pipeline.process(input, [DeadZone(0.2)]);
    expect((result as { x: number; y: number }).x).toBeGreaterThan(0);
    expect((result as { x: number; y: number }).y).toBeGreaterThan(0);
  });

  it("handles zero threshold", () => {
    const result = pipeline.process(0.1, [DeadZone(0)]);
    expect(result).toBe(0.1);
  });
});

describe("Scale processor", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("scales number by factor", () => {
    const result = pipeline.process(0.5, [Scale(2)]);
    expect(result).toBe(1.0);
  });

  it("scales negative numbers", () => {
    const result = pipeline.process(-0.5, [Scale(2)]);
    expect(result).toBe(-1.0);
  });

  it("scales by fractional factor", () => {
    const result = pipeline.process(1.0, [Scale(0.5)]);
    expect(result).toBe(0.5);
  });

  it("scales 2D vectors", () => {
    const result = pipeline.process({ x: 0.5, y: 0.3 }, [Scale(2)]);
    expect(result).toEqual({ x: 1.0, y: 0.6 });
  });

  it("handles negative scale factor", () => {
    const result = pipeline.process(0.5, [Scale(-1)]);
    expect(result).toBe(-0.5);
  });

  it("handles zero scale factor", () => {
    const result = pipeline.process(0.5, [Scale(0)]);
    expect(result).toBe(0);
  });
});

describe("Invert processor", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("inverts positive number", () => {
    const result = pipeline.process(0.5, [Invert()]);
    expect(result).toBe(-0.5);
  });

  it("inverts negative number", () => {
    const result = pipeline.process(-0.5, [Invert()]);
    expect(result).toBe(0.5);
  });

  it("inverts zero (returns -0)", () => {
    const result = pipeline.process(0, [Invert()]);
    // JavaScript quirk: -0 === 0 but Object.is(0, -0) is false
    expect(result).toBe(-0);
  });

  it("inverts 2D vector", () => {
    const result = pipeline.process({ x: 0.5, y: -0.3 }, [Invert()]);
    expect(result).toEqual({ x: -0.5, y: 0.3 });
  });
});

describe("InvertX processor", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("inverts only x component", () => {
    const result = pipeline.process({ x: 0.5, y: 0.3 }, [InvertX()]);
    expect(result).toEqual({ x: -0.5, y: 0.3 });
  });

  it("preserves y component", () => {
    const result = pipeline.process({ x: 0.5, y: -0.7 }, [InvertX()]);
    expect((result as { x: number; y: number }).y).toBe(-0.7);
  });

  it("does nothing to scalar values", () => {
    const result = pipeline.process(0.5, [InvertX()]);
    expect(result).toBe(0.5);
  });
});

describe("InvertY processor", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("inverts only y component", () => {
    const result = pipeline.process({ x: 0.5, y: 0.3 }, [InvertY()]);
    expect(result).toEqual({ x: 0.5, y: -0.3 });
  });

  it("preserves x component", () => {
    const result = pipeline.process({ x: -0.7, y: 0.5 }, [InvertY()]);
    expect((result as { x: number; y: number }).x).toBe(-0.7);
  });

  it("does nothing to scalar values", () => {
    const result = pipeline.process(0.5, [InvertY()]);
    expect(result).toBe(0.5);
  });
});

describe("Clamp processor", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("clamps value above max to max", () => {
    const result = pipeline.process(1.5, [Clamp(-1, 1)]);
    expect(result).toBe(1);
  });

  it("clamps value below min to min", () => {
    const result = pipeline.process(-1.5, [Clamp(-1, 1)]);
    expect(result).toBe(-1);
  });

  it("preserves value within range", () => {
    const result = pipeline.process(0.5, [Clamp(-1, 1)]);
    expect(result).toBe(0.5);
  });

  it("clamps 2D vector components independently", () => {
    const result = pipeline.process({ x: 1.5, y: -1.5 }, [Clamp(-1, 1)]);
    expect(result).toEqual({ x: 1, y: -1 });
  });

  it("handles min equal to max", () => {
    const result = pipeline.process(0.5, [Clamp(0, 0)]);
    expect(result).toBe(0);
  });
});

describe("Normalize processor", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("passes scalar values unchanged (normalize is for vectors)", () => {
    const result = pipeline.process(1.5, [Normalize()]);
    expect(result).toBe(1.5);
  });

  it("preserves scalar within range", () => {
    const result = pipeline.process(0.5, [Normalize()]);
    expect(result).toBe(0.5);
  });

  it("normalizes 2D vector to unit length", () => {
    const result = pipeline.process({ x: 3, y: 4 }, [Normalize()]); // magnitude = 5
    expect((result as { x: number; y: number }).x).toBeCloseTo(0.6, 3);
    expect((result as { x: number; y: number }).y).toBeCloseTo(0.8, 3);
  });

  it("handles zero vector", () => {
    const result = pipeline.process({ x: 0, y: 0 }, [Normalize()]);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("handles vector already normalized", () => {
    const result = pipeline.process({ x: 0.6, y: 0.8 }, [Normalize()]);
    expect((result as { x: number; y: number }).x).toBeCloseTo(0.6, 3);
    expect((result as { x: number; y: number }).y).toBeCloseTo(0.8, 3);
  });
});

describe("Smooth processor", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("smooths scalar value over time", () => {
    const result1 = pipeline.process(1.0, [Smooth(0.5)]);
    const result2 = pipeline.process(1.0, [Smooth(0.5)]);

    // First frame: lerp(0, 1, 0.5) = 0.5
    expect(result1).toBeCloseTo(0.5, 3);
    // Second frame: lerp(0.5, 1, 0.5) = 0.75
    expect(result2).toBeCloseTo(0.75, 3);
  });

  it("smooths 2D vector components independently", () => {
    const result1 = pipeline.process({ x: 1.0, y: 1.0 }, [Smooth(0.5)]);
    expect((result1 as { x: number; y: number }).x).toBeCloseTo(0.5, 3);
    expect((result1 as { x: number; y: number }).y).toBeCloseTo(0.5, 3);
  });

  it("uses independent state for different processor indices", () => {
    const smoothA = Smooth(0.5);
    const smoothB = Smooth(0.5);

    pipeline.process(1.0, [smoothA]);
    pipeline.process(2.0, [smoothB]);

    // Both should have different state
    const resultA = pipeline.process(1.0, [smoothA]);
    const resultB = pipeline.process(2.0, [smoothB]);

    expect(resultA).not.toBe(resultB);
  });

  it("reaches target value with factor 1.0", () => {
    const result = pipeline.process(1.0, [Smooth(1.0)]);
    expect(result).toBe(1.0);
  });

  it("smooths minimally with factor close to 0", () => {
    pipeline.process(1.0, [Smooth(0.01)]);
    const result = pipeline.process(5.0, [Smooth(0.01)]);
    // With low smoothing factor, should still be close to previous value
    expect(result).toBeLessThan(2.0);
  });
});

describe("SwizzleXY processor", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("swaps x and y components", () => {
    const result = pipeline.process({ x: 0.5, y: 0.3 }, [SwizzleXY()]);
    expect(result).toEqual({ x: 0.3, y: 0.5 });
  });

  it("handles zero vector", () => {
    const result = pipeline.process({ x: 0, y: 0 }, [SwizzleXY()]);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("handles negative values", () => {
    const result = pipeline.process({ x: -0.5, y: 0.8 }, [SwizzleXY()]);
    expect(result).toEqual({ x: 0.8, y: -0.5 });
  });

  it("does nothing to scalar values", () => {
    const result = pipeline.process(0.5, [SwizzleXY()]);
    expect(result).toBe(0.5);
  });
});

describe("Processor combinations", () => {
  let pipeline: ProcessorPipeline;

  beforeEach(() => {
    pipeline = new ProcessorPipeline();
  });

  it("combines deadzone and scale", () => {
    // 0.3 -> deadzone(0.2) -> 0.3 (unchanged) -> scale(2) -> 0.6
    const result = pipeline.process(0.3, [DeadZone(0.2), Scale(2)]);
    expect(result).toBeCloseTo(0.6, 3);
  });

  it("combines scale and clamp", () => {
    // 0.8 -> scale(2) -> 1.6 -> clamp(-1, 1) -> 1.0
    const result = pipeline.process(0.8, [Scale(2), Clamp(-1, 1)]);
    expect(result).toBe(1.0);
  });

  it("combines invert and normalize for 2D", () => {
    // { x: 3, y: 4 } -> invert -> { x: -3, y: -4 } -> normalize -> { x: -0.6, y: -0.8 }
    const result = pipeline.process({ x: 3, y: 4 }, [Invert(), Normalize()]);
    expect((result as { x: number; y: number }).x).toBeCloseTo(-0.6, 3);
    expect((result as { x: number; y: number }).y).toBeCloseTo(-0.8, 3);
  });

  it("combines swizzle and invert", () => {
    // { x: 0.5, y: 0.3 } -> swizzle -> { x: 0.3, y: 0.5 } -> invert -> { x: -0.3, y: -0.5 }
    const result = pipeline.process({ x: 0.5, y: 0.3 }, [SwizzleXY(), Invert()]);
    expect(result).toEqual({ x: -0.3, y: -0.5 });
  });
});
