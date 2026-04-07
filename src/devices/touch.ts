import type { InputDevice } from "./index.js";
import type { GestureSource } from "../contexts/binding.js";

/**
 * A single touch point with position, delta, and phase information.
 * Provides canvas-relative coordinates when attached to a canvas element.
 */
export interface TouchPoint {
  /** Unique identifier for this touch. */
  readonly id: number;
  /** Current canvas-relative position. */
  readonly position: { x: number; y: number };
  /** Position when the touch began. */
  readonly startPosition: { x: number; y: number };
  /** Position delta from the previous frame. */
  readonly deltaPosition: { x: number; y: number };
  /** Current phase of this touch. */
  readonly phase: "began" | "moved" | "stationary" | "ended" | "cancelled";
  /** Timestamp when this touch was last updated (milliseconds). */
  readonly timestamp: number;
}

/**
 * Internal mutable touch point with additional tracking fields.
 * @internal
 */
interface InternalTouchPoint extends TouchPoint {
  position: { x: number; y: number };
  deltaPosition: { x: number; y: number };
  phase: "began" | "moved" | "stationary" | "ended" | "cancelled";
  timestamp: number;
  prevPosition: { x: number; y: number };
  startTimestamp: number;
  startFingerCount: number;
}

/**
 * Touch input device that tracks multi-touch points and provides gesture detection.
 * Supports tap, swipe, pinch, and rotate gestures.
 */
export class TouchDevice implements InputDevice {
  private readonly _points = new Map<number, InternalTouchPoint>();
  private _canvas: HTMLCanvasElement | null = null;
  private _firedGestures: Array<{ type: string; value: number; meta: Record<string, unknown> }> =
    [];

  // Multi-touch gesture state
  private _pinchPrevDist = -1;
  private _pinchDelta = 0;
  private _pinchActive = false;
  private _rotatePrevAngle: number | null = null;
  private _rotateDelta = 0;
  private _rotateActive = false;

  // Bound event listeners
  private readonly _onTouchStart: (e: TouchEvent) => void;
  private readonly _onTouchMove: (e: TouchEvent) => void;
  private readonly _onTouchEnd: (e: TouchEvent) => void;
  private readonly _onTouchCancel: (e: TouchEvent) => void;

  constructor() {
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);
    this._onTouchCancel = this._handleTouchCancel.bind(this);
  }

  /**
   * Get all active touch points as a read-only map.
   */
  get points(): ReadonlyMap<number, TouchPoint> {
    return this._points as ReadonlyMap<number, TouchPoint>;
  }

  /**
   * Get the number of currently tracked touch points.
   */
  get pointCount(): number {
    return this._points.size;
  }

  /**
   * Get a specific touch point by ID.
   * @param id - The touch identifier
   * @returns The touch point, or undefined if not found
   */
  getPoint(id: number): TouchPoint | undefined {
    return this._points.get(id);
  }

  /**
   * Check if any touches are currently active (excluding ended/cancelled).
   * @returns True if at least one touch is active
   */
  isTouching(): boolean {
    for (const point of this._points.values()) {
      if (point.phase !== "ended" && point.phase !== "cancelled") {
        return true;
      }
    }
    return false;
  }

  /**
   * Attach touch event listeners to the target.
   * @param target - The event target (typically window or a canvas)
   * @param canvas - Optional canvas element for coordinate transformation
   */
  attach(target: EventTarget, canvas?: HTMLCanvasElement): void {
    if (typeof window === "undefined") return;

    this._canvas = canvas ?? null;
    target.addEventListener("touchstart", this._onTouchStart as EventListener, { passive: false });
    target.addEventListener("touchmove", this._onTouchMove as EventListener, { passive: false });
    target.addEventListener("touchend", this._onTouchEnd as EventListener, { passive: false });
    target.addEventListener("touchcancel", this._onTouchCancel as EventListener, {
      passive: false,
    });
  }

  /**
   * Remove all touch event listeners from the target.
   * @param target - The event target to detach from
   */
  detach(target: EventTarget): void {
    target.removeEventListener("touchstart", this._onTouchStart as EventListener);
    target.removeEventListener("touchmove", this._onTouchMove as EventListener);
    target.removeEventListener("touchend", this._onTouchEnd as EventListener);
    target.removeEventListener("touchcancel", this._onTouchCancel as EventListener);
    this._canvas = null;
  }

  /**
   * Advance to the next frame. Clears ended/cancelled touches and resets deltas.
   */
  update(): void {
    // Remove ended/cancelled touches
    for (const [id, point] of this._points.entries()) {
      if (point.phase === "ended" || point.phase === "cancelled") {
        this._points.delete(id);
      }
    }

    // Reset moved/began touches to stationary
    for (const point of this._points.values()) {
      if (point.phase === "moved" || point.phase === "began") {
        point.phase = "stationary";
        point.deltaPosition = { x: 0, y: 0 };
      }
    }

    // Clear fired gestures
    this._firedGestures = [];

    // Reset multi-touch state
    this._pinchDelta = 0;
    this._rotateDelta = 0;

    // Reset multi-touch state if fewer than 2 fingers
    const activeCount = Array.from(this._points.values()).filter(
      (p) => p.phase !== "ended" && p.phase !== "cancelled",
    ).length;
    if (activeCount < 2) {
      this._resetMultiTouchState();
    }
  }

  /**
   * Reset all touch state to idle.
   */
  reset(): void {
    this._points.clear();
    this._firedGestures = [];
    this._resetMultiTouchState();
  }

  /**
   * Check if a gesture is currently active.
   * @param source - The gesture source descriptor
   * @returns True if the gesture is active this frame
   */
  isGestureActive(source: GestureSource): boolean {
    const type = source._type;
    if (type === "gesture:tap") {
      const fingers = typeof source.fingers === "number" ? source.fingers : 1;
      return this._firedGestures.some(
        (g) => g.type === "gesture:tap" && g.meta.fingers === fingers,
      );
    }
    if (type === "gesture:swipe") {
      const direction = source.direction as string;
      const fingers = typeof source.fingers === "number" ? source.fingers : 1;
      return this._firedGestures.some(
        (g) =>
          g.type === "gesture:swipe" &&
          g.meta.direction === direction &&
          g.meta.fingers === fingers,
      );
    }
    if (type === "gesture:pinch") return this._pinchActive && this._pinchDelta !== 0;
    if (type === "gesture:rotate") return this._rotateActive && this._rotateDelta !== 0;
    return false;
  }

  /**
   * Get the current value of a gesture.
   * @param source - The gesture source descriptor
   * @returns The gesture value (1.0 for tap/swipe, delta for pinch/rotate)
   */
  getGestureValue(source: GestureSource): number | { x: number; y: number } {
    const type = source._type;
    if (type === "gesture:tap") return 1.0;
    if (type === "gesture:swipe") return 1.0;
    if (type === "gesture:pinch") return this._pinchDelta;
    if (type === "gesture:rotate") return this._rotateDelta;
    return 0;
  }

  private _getPos(touch: Touch): { x: number; y: number } {
    if (this._canvas) {
      const rect = this._canvas.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return { x: touch.clientX, y: touch.clientY };
  }

  private _handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const fingerCount = e.touches.length;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const pos = this._getPos(touch);

      const point: InternalTouchPoint = {
        id: touch.identifier,
        position: { ...pos },
        startPosition: { ...pos },
        deltaPosition: { x: 0, y: 0 },
        phase: "began",
        timestamp: e.timeStamp,
        prevPosition: { ...pos },
        startTimestamp: e.timeStamp,
        startFingerCount: fingerCount,
      };

      this._points.set(touch.identifier, point);
    }

    // Reset multi-touch state when transitioning to 2+ fingers
    if (fingerCount >= 2) {
      this._resetMultiTouchState();
    }
  }

  private _handleTouchMove(e: TouchEvent): void {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const point = this._points.get(touch.identifier);
      if (!point) continue;

      const pos = this._getPos(touch);
      point.prevPosition = { ...point.position };
      point.position = { ...pos };
      point.deltaPosition = {
        x: pos.x - point.prevPosition.x,
        y: pos.y - point.prevPosition.y,
      };
      point.phase = "moved";
      point.timestamp = e.timeStamp;
    }

    // Compute multi-touch gestures
    const activePoints = Array.from(this._points.values()).filter(
      (p) => p.phase !== "ended" && p.phase !== "cancelled",
    );
    if (activePoints.length >= 2) {
      this._computeMultiTouchGestures();
    }
  }

  private _handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const point = this._points.get(touch.identifier);
      if (!point) continue;

      point.phase = "ended";
      point.timestamp = e.timeStamp;

      // Tap detection
      const duration = e.timeStamp - point.startTimestamp;
      const dx = point.position.x - point.startPosition.x;
      const dy = point.position.y - point.startPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (duration < 200 && distance < 10) {
        this._firedGestures.push({
          type: "gesture:tap",
          value: 1.0,
          meta: { fingers: point.startFingerCount },
        });
      }

      // Swipe detection
      const minDistance = 50;
      const velocity = distance / duration; // px/ms
      const minVelocity = 0.3; // px/ms
      if (distance >= minDistance && velocity >= minVelocity) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        let direction: string;
        if (absX > absY) {
          direction = dx > 0 ? "right" : "left";
        } else {
          direction = dy > 0 ? "down" : "up";
        }
        this._firedGestures.push({
          type: "gesture:swipe",
          value: 1.0,
          meta: { direction, distance, fingers: point.startFingerCount },
        });
      }
    }
  }

  private _handleTouchCancel(e: TouchEvent): void {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const point = this._points.get(touch.identifier);
      if (!point) continue;

      point.phase = "cancelled";
      point.timestamp = e.timeStamp;
    }
  }

  private _computeMultiTouchGestures(): void {
    const pts = Array.from(this._points.values()).filter(
      (p) => p.phase !== "ended" && p.phase !== "cancelled",
    );
    if (pts.length < 2) return;

    const [a, b] = pts;
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Pinch
    if (this._pinchPrevDist > 0) {
      this._pinchDelta = dist - this._pinchPrevDist;
    }
    this._pinchPrevDist = dist;
    this._pinchActive = true;

    // Rotate
    const angle = Math.atan2(dy, dx);
    if (this._rotatePrevAngle !== null) {
      let delta = angle - this._rotatePrevAngle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      this._rotateDelta = delta;
    }
    this._rotatePrevAngle = angle;
    this._rotateActive = true;
  }

  private _resetMultiTouchState(): void {
    this._pinchPrevDist = -1;
    this._pinchDelta = 0;
    this._pinchActive = false;
    this._rotatePrevAngle = null;
    this._rotateDelta = 0;
    this._rotateActive = false;
  }
}
