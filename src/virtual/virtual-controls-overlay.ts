import type { VirtualJoystickConfig, VirtualButtonConfig } from '../plugin/config.js'

interface JoystickState {
  config: VirtualJoystickConfig
  baseEl: HTMLDivElement
  knobEl: HTMLDivElement
  value: { x: number; y: number }
  activeTouchId: number | null
  boundTouchStart: (e: TouchEvent) => void
  boundTouchMove: (e: TouchEvent) => void
  boundTouchEnd: (e: TouchEvent) => void
}

interface ButtonState {
  config: VirtualButtonConfig
  el: HTMLDivElement
  pressed: boolean
  activeTouchId: number | null
  boundTouchStart: (e: TouchEvent) => void
  boundTouchEnd: (e: TouchEvent) => void
}

/**
 * Virtual on-screen controls overlay for touch devices.
 * Provides virtual joysticks and buttons that appear on touch-enabled devices.
 */
export class VirtualControlsOverlay {
  private _overlay: HTMLDivElement | null = null
  private _joysticks: Map<string, JoystickState> = new Map()
  private _buttons: Map<string, ButtonState> = new Map()
  private _joystickConfigs: VirtualJoystickConfig[] = []
  private _buttonConfigs: VirtualButtonConfig[] = []
  private _forceShow: boolean | null

  /**
   * Creates a new VirtualControlsOverlay.
   * @param forceVirtualControls - If true, always show controls. If false, never show. If null/undefined, auto-detect based on touch support.
   */
  constructor(forceVirtualControls?: boolean | null) {
    this._forceShow = forceVirtualControls ?? null
  }

  /**
   * Add a virtual joystick configuration.
   * Must be called before attach().
   * @param config - Joystick configuration
   */
  addJoystick(config: VirtualJoystickConfig): void {
    this._joystickConfigs.push(config)
  }

  /**
   * Add a virtual button configuration.
   * Must be called before attach().
   * @param config - Button configuration
   */
  addButton(config: VirtualButtonConfig): void {
    this._buttonConfigs.push(config)
  }

  /**
   * Attach the virtual controls overlay to the DOM.
   * @param container - Container element. Defaults to document.body.
   */
  attach(container?: HTMLElement): void {
    if (typeof window === 'undefined') return

    // Determine if controls should be shown
    let shouldShow: boolean
    if (this._forceShow === true) {
      shouldShow = true
    } else if (this._forceShow === false) {
      shouldShow = false
    } else {
      // Auto-detect touch device
      shouldShow = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
    }

    // Create overlay div
    const div = document.createElement('div')
    div.id = 'gwen-input-overlay'
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;'
    this._overlay = div

    const targetContainer = container ?? document.body
    targetContainer.appendChild(div)

    // If not showing, don't create controls
    if (!shouldShow) {
      return
    }

    // Create joysticks
    for (const config of this._joystickConfigs) {
      this._createJoystick(config)
    }

    // Create buttons
    for (const config of this._buttonConfigs) {
      this._createButton(config)
    }
  }

  /**
   * Detach and remove the virtual controls overlay from the DOM.
   */
  detach(): void {
    if (typeof window === 'undefined') return

    if (this._overlay) {
      // Clean up joystick listeners
      for (const state of this._joysticks.values()) {
        state.baseEl.removeEventListener('touchstart', state.boundTouchStart)
        state.baseEl.removeEventListener('touchmove', state.boundTouchMove)
        state.baseEl.removeEventListener('touchend', state.boundTouchEnd)
        state.baseEl.removeEventListener('touchcancel', state.boundTouchEnd)
      }

      // Clean up button listeners
      for (const state of this._buttons.values()) {
        state.el.removeEventListener('touchstart', state.boundTouchStart)
        state.el.removeEventListener('touchend', state.boundTouchEnd)
        state.el.removeEventListener('touchcancel', state.boundTouchEnd)
      }

      this._overlay.remove()
      this._overlay = null
    }

    this._joysticks.clear()
    this._buttons.clear()
  }

  /**
   * Get the current value of a virtual joystick.
   * @param id - Joystick ID
   * @returns Normalized joystick value with x,y in range [-1, 1], or {x:0, y:0} if not found
   */
  getJoystickValue(id: string): { x: number; y: number } {
    return this._joysticks.get(id)?.value ?? { x: 0, y: 0 }
  }

  /**
   * Check if a virtual button is currently pressed.
   * @param id - Button ID
   * @returns true if pressed, false otherwise
   */
  isButtonPressed(id: string): boolean {
    return this._buttons.get(id)?.pressed ?? false
  }

  private _createJoystick(config: VirtualJoystickConfig): void {
    if (!this._overlay) return

    const size = config.size
    const knobSize = size / 2
    const opacity = config.opacity ?? 0.5

    // Create base element
    const baseEl = document.createElement('div')
    baseEl.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(255,255,255,${opacity * 0.3});
      border: 2px solid rgba(255,255,255,${opacity * 0.6});
      pointer-events: auto;
      touch-action: none;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    // Position based on side
    if (config.side === 'left') {
      baseEl.style.bottom = '80px'
      baseEl.style.left = '80px'
    } else if (config.side === 'right') {
      baseEl.style.bottom = '80px'
      baseEl.style.right = '80px'
    } else if (config.side === 'custom' && config.position) {
      baseEl.style.left = `${config.position.x}%`
      baseEl.style.top = `${config.position.y}%`
    }

    // Create knob element
    const knobEl = document.createElement('div')
    knobEl.style.cssText = `
      width: ${knobSize}px;
      height: ${knobSize}px;
      border-radius: 50%;
      background: rgba(255,255,255,${opacity});
      pointer-events: none;
      position: absolute;
      transition: none;
    `

    baseEl.appendChild(knobEl)
    this._overlay.appendChild(baseEl)

    const state: JoystickState = {
      config,
      baseEl,
      knobEl,
      value: { x: 0, y: 0 },
      activeTouchId: null,
      boundTouchStart: () => {},
      boundTouchMove: () => {},
      boundTouchEnd: () => {},
    }

    // Touch start handler
    const handleTouchStart = (e: TouchEvent): void => {
      e.preventDefault()
      if (state.activeTouchId === null && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0]
        state.activeTouchId = touch.identifier
      }
    }

    // Touch move handler
    const handleTouchMove = (e: TouchEvent): void => {
      e.preventDefault()
      if (state.activeTouchId === null) return

      // Find the active touch
      let activeTouch: Touch | null = null
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === state.activeTouchId) {
          activeTouch = e.touches[i]
          break
        }
      }

      if (!activeTouch) return

      // Calculate offset from base center
      const baseRect = baseEl.getBoundingClientRect()
      const baseCenterX = baseRect.left + baseRect.width / 2
      const baseCenterY = baseRect.top + baseRect.height / 2

      let ox = activeTouch.clientX - baseCenterX
      let oy = activeTouch.clientY - baseCenterY

      // Clamp to radius
      const maxRadius = size / 2 - knobSize / 2
      const distance = Math.sqrt(ox * ox + oy * oy)
      if (distance > maxRadius) {
        const angle = Math.atan2(oy, ox)
        ox = Math.cos(angle) * maxRadius
        oy = Math.sin(angle) * maxRadius
      }

      // Update knob position
      knobEl.style.transform = `translate(${ox}px, ${oy}px)`

      // Compute normalized value with deadzone
      const radius = maxRadius
      const nx = ox / radius
      const ny = oy / radius
      const len = Math.sqrt(nx * nx + ny * ny)
      const deadzone = config.deadzone ?? 0.1

      if (len < deadzone) {
        state.value = { x: 0, y: 0 }
      } else {
        // Rescale so deadzone edge = 0
        const scale = Math.min(len, 1)
        const rescaled = (scale - deadzone) / (1 - deadzone)
        state.value = {
          x: (nx / len) * rescaled,
          y: (ny / len) * rescaled,
        }
      }
    }

    // Touch end handler
    const handleTouchEnd = (e: TouchEvent): void => {
      if (state.activeTouchId === null) return

      // Check if our active touch ended
      let touchEnded = true
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === state.activeTouchId) {
          touchEnded = false
          break
        }
      }

      if (touchEnded) {
        state.activeTouchId = null
        state.value = { x: 0, y: 0 }
        knobEl.style.transform = 'translate(0, 0)'
      }
    }

    // Bind and store handlers
    state.boundTouchStart = handleTouchStart
    state.boundTouchMove = handleTouchMove
    state.boundTouchEnd = handleTouchEnd

    baseEl.addEventListener('touchstart', state.boundTouchStart, { passive: false })
    baseEl.addEventListener('touchmove', state.boundTouchMove, { passive: false })
    baseEl.addEventListener('touchend', state.boundTouchEnd, { passive: false })
    baseEl.addEventListener('touchcancel', state.boundTouchEnd, { passive: false })

    this._joysticks.set(config.id, state)
  }

  private _createButton(config: VirtualButtonConfig): void {
    if (!this._overlay) return

    const size = config.size ?? 60
    const opacity = config.opacity ?? 0.7

    // Create button element
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(255,255,255,${opacity * 0.3});
      border: 2px solid rgba(255,255,255,${opacity * 0.6});
      pointer-events: auto;
      touch-action: none;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      font-family: sans-serif;
      left: ${config.position.x}%;
      top: ${config.position.y}%;
      transform: translate(-50%, -50%);
    `
    el.textContent = config.label

    this._overlay.appendChild(el)

    const state: ButtonState = {
      config,
      el,
      pressed: false,
      activeTouchId: null,
      boundTouchStart: () => {},
      boundTouchEnd: () => {},
    }

    // Touch start handler
    const handleTouchStart = (e: TouchEvent): void => {
      e.preventDefault()
      if (state.activeTouchId === null && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0]
        state.activeTouchId = touch.identifier
        state.pressed = true
        el.style.background = `rgba(255,255,255,${opacity * 0.5})`
      }
    }

    // Touch end handler
    const handleTouchEnd = (e: TouchEvent): void => {
      if (state.activeTouchId === null) return

      // Check if our active touch ended
      let touchEnded = true
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === state.activeTouchId) {
          touchEnded = false
          break
        }
      }

      if (touchEnded) {
        state.activeTouchId = null
        state.pressed = false
        el.style.background = `rgba(255,255,255,${opacity * 0.3})`
      }
    }

    // Bind and store handlers
    state.boundTouchStart = handleTouchStart
    state.boundTouchEnd = handleTouchEnd

    el.addEventListener('touchstart', state.boundTouchStart, { passive: false })
    el.addEventListener('touchend', state.boundTouchEnd, { passive: false })
    el.addEventListener('touchcancel', state.boundTouchEnd, { passive: false })

    this._buttons.set(config.id, state)
  }
}
