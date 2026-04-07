/**
 * MouseDevice — tracks mouse position, button states, movement delta, and wheel.
 *
 * Button states use the same 4-state machine as `KeyboardDevice`.
 * Position is tracked relative to an optional canvas element; falls back to
 * screen-space coordinates.
 *
 * Delta is accumulated from `MouseEvent.movementX / movementY` between frames
 * and reset to zero each `update()` call.
 *
 * Registers a `blur` listener on `window` to reset state when focus is lost.
 */

import type { InputDevice } from './index.js'

export type MouseButtonState = 'idle' | 'justPressed' | 'held' | 'justReleased'

export interface MousePosition {
  /** Canvas-relative X if a canvas was provided, otherwise screen X. */
  x: number
  /** Canvas-relative Y if a canvas was provided, otherwise screen Y. */
  y: number
  /** Always screen-space X. */
  screenX: number
  /** Always screen-space Y. */
  screenY: number
}

export class MouseDevice implements InputDevice {
  private buttonStates = new Map<number, MouseButtonState>()
  private pendingDown = new Set<number>()
  private pendingUp = new Set<number>()

  private _position: MousePosition = { x: 0, y: 0, screenX: 0, screenY: 0 }
  private _deltaX = 0
  private _deltaY = 0
  private _deltaXFrame = 0
  private _deltaYFrame = 0
  private _wheel = 0
  private _wheelAccumulator = 0

  private canvas: HTMLCanvasElement | null = null
  private cachedRect: DOMRect | null = null

  private onMouseMove = (e: MouseEvent): void => {
    this._position.screenX = e.clientX
    this._position.screenY = e.clientY

    if (this.canvas) {
      if (!this.cachedRect) this.cachedRect = this.canvas.getBoundingClientRect()
      this._position.x = e.clientX - this.cachedRect.left
      this._position.y = e.clientY - this.cachedRect.top
    } else {
      this._position.x = e.clientX
      this._position.y = e.clientY
    }

    this._deltaXFrame += e.movementX
    this._deltaYFrame += e.movementY
  }

  private onMouseDown = (e: MouseEvent): void => {
    const btn = e.button
    const current = this.buttonStates.get(btn)
    if (!current || current === 'idle' || current === 'justReleased') {
      this.pendingDown.add(btn)
    }
  }

  private onMouseUp = (e: MouseEvent): void => {
    this.pendingUp.add(e.button)
  }

  private onWheel = (e: WheelEvent): void => {
    this._wheelAccumulator += Math.sign(e.deltaY)
  }

  private onResize = (): void => {
    this.cachedRect = null
  }

  private onBlur = (): void => {
    this.reset()
  }

  /**
   * Attach mouse event listeners.
   * @param target Event target for mouse events (e.g. `window` or the canvas element)
   * @param canvas Optional canvas for canvas-relative coordinate calculation
   */
  attach(target: EventTarget, canvas?: HTMLCanvasElement): void {
    this.canvas = canvas ?? null
    this.cachedRect = null
    target.addEventListener('mousemove', this.onMouseMove as EventListener)
    target.addEventListener('mousedown', this.onMouseDown as EventListener)
    target.addEventListener('mouseup', this.onMouseUp as EventListener)
    target.addEventListener('wheel', this.onWheel as EventListener, { passive: true })
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onResize)
      window.addEventListener('blur', this.onBlur)
    }
  }

  /** Remove all event listeners. */
  detach(target: EventTarget): void {
    target.removeEventListener('mousemove', this.onMouseMove as EventListener)
    target.removeEventListener('mousedown', this.onMouseDown as EventListener)
    target.removeEventListener('mouseup', this.onMouseUp as EventListener)
    target.removeEventListener('wheel', this.onWheel as EventListener)
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onResize)
      window.removeEventListener('blur', this.onBlur)
    }
  }

  /** Advance button states and snapshot delta/wheel for this frame. Must be called in `onBeforeUpdate()`. */
  update(): void {
    for (const [btn, state] of this.buttonStates) {
      if (state === 'justReleased') {
        this.buttonStates.set(btn, 'idle')
      } else if (state === 'justPressed' || state === 'held') {
        if (!this.pendingUp.has(btn)) {
          this.buttonStates.set(btn, 'held')
        }
      }
    }

    for (const btn of this.pendingDown) {
      this.buttonStates.set(btn, 'justPressed')
    }
    this.pendingDown.clear()

    for (const btn of this.pendingUp) {
      const current = this.buttonStates.get(btn)
      if (current === 'justPressed' || current === 'held') {
        this.buttonStates.set(btn, 'justReleased')
      } else {
        this.buttonStates.set(btn, 'idle')
      }
    }
    this.pendingUp.clear()

    this._deltaX = this._deltaXFrame
    this._deltaY = this._deltaYFrame
    this._deltaXFrame = 0
    this._deltaYFrame = 0

    this._wheel = this._wheelAccumulator
    this._wheelAccumulator = 0
  }

  /** Reset all button states, delta, and wheel to zero. */
  reset(): void {
    for (const btn of this.buttonStates.keys()) {
      this.buttonStates.set(btn, 'idle')
    }
    this.pendingDown.clear()
    this.pendingUp.clear()
    this._deltaX = 0
    this._deltaY = 0
    this._deltaXFrame = 0
    this._deltaYFrame = 0
    this._wheel = 0
    this._wheelAccumulator = 0
  }

  /**
   * Current mouse position.
   * `x`/`y` are canvas-relative if a canvas was provided, otherwise screen-space.
   */
  get position(): Readonly<MousePosition> {
    return this._position
  }

  /** Mouse movement accumulated this frame from `movementX`/`movementY`. Reset each `update()`. */
  get delta(): Readonly<{ x: number; y: number }> {
    return { x: this._deltaX, y: this._deltaY }
  }

  /** Accumulated mouse wheel ticks this frame (positive = scroll down). Reset each `update()`. */
  get wheel(): number {
    return this._wheel
  }

  /**
   * Get the 4-state value for a mouse button.
   * @param btn Button index (0 = left, 1 = middle, 2 = right)
   */
  getButtonState(btn: number): MouseButtonState {
    return this.buttonStates.get(btn) ?? 'idle'
  }

  /**
   * Returns `true` only on the first frame the button is pressed.
   * @param btn Button index
   */
  isButtonJustPressed(btn: number): boolean {
    return this.buttonStates.get(btn) === 'justPressed'
  }

  /**
   * Returns `true` on every frame the button is down (`justPressed` or `held`).
   * @param btn Button index
   */
  isButtonPressed(btn: number): boolean {
    const s = this.buttonStates.get(btn)
    return s === 'justPressed' || s === 'held'
  }

  /**
   * Returns `true` only on the first frame after the button is released.
   * @param btn Button index
   */
  isButtonJustReleased(btn: number): boolean {
    return this.buttonStates.get(btn) === 'justReleased'
  }
}
