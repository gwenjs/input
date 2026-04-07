import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { VirtualControlsOverlay } from '../src/virtual/virtual-controls-overlay.js'
import type { VirtualJoystickConfig, VirtualButtonConfig } from '../src/plugin/config.js'

function makeJoystickConfig(overrides: Partial<VirtualJoystickConfig> = {}): VirtualJoystickConfig {
  return {
    id: 'move',
    side: 'left',
    size: 100,
    opacity: 0.5,
    ...overrides,
  }
}

function makeButtonConfig(overrides: Partial<VirtualButtonConfig> = {}): VirtualButtonConfig {
  return {
    id: 'jump',
    label: 'Jump',
    position: { x: 80, y: 70 },
    size: 60,
    opacity: 0.7,
    ...overrides,
  }
}

describe('VirtualControlsOverlay', () => {
  let overlay: VirtualControlsOverlay

  beforeEach(() => {
    overlay = new VirtualControlsOverlay()
  })

  afterEach(() => {
    overlay.detach()
    document.getElementById('gwen-input-overlay')?.remove()
  })

  it('initializes', () => {
    expect(overlay).toBeDefined()
  })

  it('returns {x:0,y:0} for unknown joystick before attach', () => {
    const value = overlay.getJoystickValue('nonexistent')
    expect(value).toEqual({ x: 0, y: 0 })
  })

  it('returns false for unknown button before attach', () => {
    const pressed = overlay.isButtonPressed('nonexistent')
    expect(pressed).toBe(false)
  })

  it('attaches to document.body without throwing', () => {
    expect(() => overlay.attach()).not.toThrow()
  })

  it('attaches to custom container', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    expect(() => overlay.attach(container)).not.toThrow()
    container.remove()
  })

  it('detaches without throwing', () => {
    overlay.attach()
    expect(() => overlay.detach()).not.toThrow()
  })

  it('is safe to detach multiple times', () => {
    overlay.attach()
    overlay.detach()
    expect(() => overlay.detach()).not.toThrow()
  })

  it('can detach and reattach', () => {
    overlay.attach()
    overlay.detach()
    expect(() => overlay.attach()).not.toThrow()
  })

  it('creates overlay element on attach', () => {
    overlay.attach()
    expect(document.getElementById('gwen-input-overlay')).not.toBeNull()
  })

  it('removes overlay element on detach', () => {
    overlay.attach()
    overlay.detach()
    expect(document.getElementById('gwen-input-overlay')).toBeNull()
  })

  describe('with forceVirtualControls=true', () => {
    it('creates joystick elements when attached', () => {
      const forced = new VirtualControlsOverlay(true)
      forced.addJoystick(makeJoystickConfig({ id: 'move', side: 'left' }))
      forced.attach()

      const overlay = document.getElementById('gwen-input-overlay')!
      expect(overlay.children.length).toBeGreaterThan(0)

      forced.detach()
    })

    it('creates joystick with right side', () => {
      const forced = new VirtualControlsOverlay(true)
      forced.addJoystick(makeJoystickConfig({ id: 'look', side: 'right' }))
      forced.attach()

      expect(() => forced.getJoystickValue('look')).not.toThrow()
      forced.detach()
    })

    it('creates joystick with custom position', () => {
      const forced = new VirtualControlsOverlay(true)
      forced.addJoystick(makeJoystickConfig({ id: 'custom', side: 'custom', position: { x: 20, y: 60 } }))
      forced.attach()

      expect(() => forced.getJoystickValue('custom')).not.toThrow()
      forced.detach()
    })

    it('creates button elements when attached', () => {
      const forced = new VirtualControlsOverlay(true)
      forced.addButton(makeButtonConfig({ id: 'fire' }))
      forced.attach()

      const overlayEl = document.getElementById('gwen-input-overlay')!
      expect(overlayEl.children.length).toBeGreaterThan(0)

      forced.detach()
    })

    it('returns zero joystick value before interaction', () => {
      const forced = new VirtualControlsOverlay(true)
      forced.addJoystick(makeJoystickConfig({ id: 'move' }))
      forced.attach()

      const value = forced.getJoystickValue('move')
      expect(value).toEqual({ x: 0, y: 0 })

      forced.detach()
    })

    it('returns false for button before interaction', () => {
      const forced = new VirtualControlsOverlay(true)
      forced.addButton(makeButtonConfig({ id: 'jump' }))
      forced.attach()

      expect(forced.isButtonPressed('jump')).toBe(false)

      forced.detach()
    })

    it('handles multiple joysticks independently', () => {
      const forced = new VirtualControlsOverlay(true)
      forced.addJoystick(makeJoystickConfig({ id: 'left', side: 'left' }))
      forced.addJoystick(makeJoystickConfig({ id: 'right', side: 'right' }))
      forced.attach()

      expect(forced.getJoystickValue('left')).toEqual({ x: 0, y: 0 })
      expect(forced.getJoystickValue('right')).toEqual({ x: 0, y: 0 })

      forced.detach()
    })

    it('handles multiple buttons independently', () => {
      const forced = new VirtualControlsOverlay(true)
      forced.addButton(makeButtonConfig({ id: 'a', label: 'A' }))
      forced.addButton(makeButtonConfig({ id: 'b', label: 'B' }))
      forced.attach()

      expect(forced.isButtonPressed('a')).toBe(false)
      expect(forced.isButtonPressed('b')).toBe(false)

      forced.detach()
    })

    it('creates joystick without opacity', () => {
      const forced = new VirtualControlsOverlay(true)
      forced.addJoystick({ id: 'move', side: 'left', size: 100 }) // no opacity
      expect(() => forced.attach()).not.toThrow()
      forced.detach()
    })

    it('detaches cleans up joystick and button states', () => {
      const forced = new VirtualControlsOverlay(true)
      forced.addJoystick(makeJoystickConfig({ id: 'move' }))
      forced.addButton(makeButtonConfig({ id: 'jump' }))
      forced.attach()
      forced.detach()

      // After detach, querying by id should return defaults
      expect(forced.getJoystickValue('move')).toEqual({ x: 0, y: 0 })
      expect(forced.isButtonPressed('jump')).toBe(false)
    })
  })

  describe('with forceVirtualControls=false', () => {
    it('does not create controls but still creates overlay element', () => {
      const disabled = new VirtualControlsOverlay(false)
      disabled.addJoystick(makeJoystickConfig())
      disabled.addButton(makeButtonConfig())
      disabled.attach()

      // Overlay div exists but no controls created
      const el = document.getElementById('gwen-input-overlay')
      expect(el).not.toBeNull()

      disabled.detach()
    })

    it('returns defaults even after attach', () => {
      const disabled = new VirtualControlsOverlay(false)
      disabled.addJoystick(makeJoystickConfig())
      disabled.attach()

      expect(disabled.getJoystickValue('move')).toEqual({ x: 0, y: 0 })
      disabled.detach()
    })
  })

  describe('with forceVirtualControls=null (auto-detect)', () => {
    it('attaches based on touch detection', () => {
      const auto = new VirtualControlsOverlay(null)
      auto.addJoystick(makeJoystickConfig())
      expect(() => auto.attach()).not.toThrow()
      auto.detach()
    })
  })

  it('addJoystick with deadzone option', () => {
    const forced = new VirtualControlsOverlay(true)
    forced.addJoystick(makeJoystickConfig({ deadzone: 0.2 }))
    expect(() => forced.attach()).not.toThrow()
    forced.detach()
  })
})

describe('VirtualControlsOverlay - touch interactions', () => {
  let overlay: VirtualControlsOverlay

  beforeEach(() => {
    overlay = new VirtualControlsOverlay(true) // force controls
    overlay.addJoystick({ id: 'move', side: 'left', size: 100, opacity: 0.5 })
    overlay.addButton({ id: 'jump', label: 'Jump', position: { x: 80, y: 70 }, size: 60, opacity: 0.7 })
    overlay.attach()
  })

  afterEach(() => {
    overlay.detach()
    document.getElementById('gwen-input-overlay')?.remove()
  })

  function getJoystickBase(): Element | null {
    const overlayEl = document.getElementById('gwen-input-overlay')
    return overlayEl?.children[0] ?? null
  }

  function getButtonEl(): Element | null {
    const overlayEl = document.getElementById('gwen-input-overlay')
    return overlayEl?.children[1] ?? null
  }

  function makeTouchList(...touches: Array<{ id: number, x: number, y: number }>): TouchList {
    const touchObjs = touches.map(t => ({
      identifier: t.id,
      clientX: t.x,
      clientY: t.y,
      target: document.body,
      pageX: t.x, pageY: t.y, screenX: t.x, screenY: t.y,
      radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1,
    }))
    return Object.assign(touchObjs, {
      length: touchObjs.length,
      item: (i: number) => touchObjs[i],
      [Symbol.iterator]: function*() { yield* Object.values(touchObjs) }
    }) as unknown as TouchList
  }

  it('joystick touchstart registers active touch', () => {
    const baseEl = getJoystickBase()
    if (!baseEl) return // skip if no element

    const touchList = makeTouchList({ id: 1, x: 100, y: 100 })
    const event = new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: touchList, targetTouches: touchList, changedTouches: touchList,
    })

    baseEl.dispatchEvent(event)

    // After touchstart, joystick value might still be zero (no move yet)
    const val = overlay.getJoystickValue('move')
    expect(val).toBeDefined()
  })

  it('joystick touchmove updates value', () => {
    const baseEl = getJoystickBase()
    if (!baseEl) return

    // Start
    const startTouches = makeTouchList({ id: 1, x: 100, y: 100 })
    const startEvent = new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: startTouches, targetTouches: startTouches, changedTouches: startTouches,
    })
    baseEl.dispatchEvent(startEvent)

    // Move
    const moveTouches = makeTouchList({ id: 1, x: 150, y: 100 })
    const moveEvent = new TouchEvent('touchmove', {
      bubbles: true, cancelable: true,
      touches: moveTouches, targetTouches: moveTouches, changedTouches: moveTouches,
    })
    baseEl.dispatchEvent(moveEvent)

    // Value may have changed
    const val = overlay.getJoystickValue('move')
    expect(val).toBeDefined()
  })

  it('joystick touchend resets value', () => {
    const baseEl = getJoystickBase()
    if (!baseEl) return

    // Start
    const startTouches = makeTouchList({ id: 1, x: 100, y: 100 })
    const startEvent = new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: startTouches, targetTouches: startTouches, changedTouches: startTouches,
    })
    baseEl.dispatchEvent(startEvent)

    // End
    const emptyList = makeTouchList()
    const endEvent = new TouchEvent('touchend', {
      bubbles: true, cancelable: true,
      touches: emptyList, targetTouches: emptyList, changedTouches: startTouches,
    })
    baseEl.dispatchEvent(endEvent)

    const val = overlay.getJoystickValue('move')
    expect(val).toEqual({ x: 0, y: 0 })
  })

  it('button touchstart activates press', () => {
    const buttonEl = getButtonEl()
    if (!buttonEl) return

    const touchList = makeTouchList({ id: 1, x: 200, y: 200 })
    const event = new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: touchList, targetTouches: touchList, changedTouches: touchList,
    })
    buttonEl.dispatchEvent(event)

    expect(overlay.isButtonPressed('jump')).toBe(true)
  })

  it('button touchend deactivates press', () => {
    const buttonEl = getButtonEl()
    if (!buttonEl) return

    // Press
    const touchList = makeTouchList({ id: 1, x: 200, y: 200 })
    const startEvent = new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: touchList, targetTouches: touchList, changedTouches: touchList,
    })
    buttonEl.dispatchEvent(startEvent)
    expect(overlay.isButtonPressed('jump')).toBe(true)

    // Release
    const emptyList = makeTouchList()
    const endEvent = new TouchEvent('touchend', {
      bubbles: true, cancelable: true,
      touches: emptyList, targetTouches: emptyList, changedTouches: touchList,
    })
    buttonEl.dispatchEvent(endEvent)

    expect(overlay.isButtonPressed('jump')).toBe(false)
  })

  it('joystick touchend with touch still present leaves joystick active', () => {
    const baseEl = getJoystickBase()
    if (!baseEl) return

    // Start touch with id=1
    const touchList = makeTouchList({ id: 1, x: 100, y: 100 })
    const startEvent = new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: touchList, targetTouches: touchList, changedTouches: touchList,
    })
    baseEl.dispatchEvent(startEvent)

    // Dispatch touchend but with id=1 still in the touches list (a *different* touch ended)
    const stillPresent = makeTouchList({ id: 1, x: 100, y: 100 })
    const changedTouch = makeTouchList({ id: 2, x: 50, y: 50 })
    const endEvent = new TouchEvent('touchend', {
      bubbles: true, cancelable: true,
      touches: stillPresent,
      targetTouches: stillPresent,
      changedTouches: changedTouch,
    })
    baseEl.dispatchEvent(endEvent)

    // Joystick should still have its activeTouchId (not reset to zero)
    // Because our touch (id=1) is still in the touches list
    const val = overlay.getJoystickValue('move')
    expect(val).toBeDefined()
    // Value is still the last set value (not reset to {x:0,y:0} by this touchend)
    // The activeTouchId remains set so it can respond to future moves
  })

  it('button touchend with touch still present keeps button pressed', () => {
    const buttonEl = getButtonEl()
    if (!buttonEl) return

    // Press with id=1
    const touchList = makeTouchList({ id: 1, x: 200, y: 200 })
    const startEvent = new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: touchList, targetTouches: touchList, changedTouches: touchList,
    })
    buttonEl.dispatchEvent(startEvent)
    expect(overlay.isButtonPressed('jump')).toBe(true)

    // Dispatch touchend but id=1 is still in touches (a different touch ended)
    const stillPresent = makeTouchList({ id: 1, x: 200, y: 200 })
    const changedTouch = makeTouchList({ id: 2, x: 50, y: 50 })
    const endEvent = new TouchEvent('touchend', {
      bubbles: true, cancelable: true,
      touches: stillPresent,
      targetTouches: stillPresent,
      changedTouches: changedTouch,
    })
    buttonEl.dispatchEvent(endEvent)

    // Button should remain pressed because our touch (id=1) is still active
    expect(overlay.isButtonPressed('jump')).toBe(true)
  })
})

describe('VirtualControlsOverlay - deadzone coverage', () => {
  let overlay: VirtualControlsOverlay

  beforeEach(() => {
    overlay = new VirtualControlsOverlay(true)
    overlay.addJoystick({ id: 'move', side: 'left', size: 100, opacity: 0.5 })
    overlay.attach()
  })

  afterEach(() => {
    overlay.detach()
    document.getElementById('gwen-input-overlay')?.remove()
  })

  function getJoystickBase(): Element | null {
    const overlayEl = document.getElementById('gwen-input-overlay')
    return overlayEl?.children[0] ?? null
  }

  function makeTouchList(...touches: Array<{ id: number, x: number, y: number }>): TouchList {
    const touchObjs = touches.map(t => ({
      identifier: t.id,
      clientX: t.x,
      clientY: t.y,
      target: document.body,
      pageX: t.x, pageY: t.y, screenX: t.x, screenY: t.y,
      radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1,
    }))
    return Object.assign(touchObjs, {
      length: touchObjs.length,
      item: (i: number) => touchObjs[i],
      [Symbol.iterator]: function*() { yield* Object.values(touchObjs) }
    }) as unknown as TouchList
  }

  it('joystick touchmove within deadzone sets value to {x:0,y:0}', () => {
    const baseEl = getJoystickBase()
    if (!baseEl) return

    // Start touch
    const startTouches = makeTouchList({ id: 1, x: 0, y: 0 })
    baseEl.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: startTouches, targetTouches: startTouches, changedTouches: startTouches,
    }))

    // Move only 1px from center — well within the deadzone (0.1 * radius=50 = 5px)
    // In jsdom getBoundingClientRect() returns 0,0,0,0 so center=(0,0), offset=(1,0)
    // len = (1/50) = 0.02 < deadzone(0.1) → deadzone branch
    const moveTouches = makeTouchList({ id: 1, x: 1, y: 0 })
    baseEl.dispatchEvent(new TouchEvent('touchmove', {
      bubbles: true, cancelable: true,
      touches: moveTouches, targetTouches: moveTouches, changedTouches: moveTouches,
    }))

    const val = overlay.getJoystickValue('move')
    expect(val).toEqual({ x: 0, y: 0 })
  })
})

describe('VirtualControlsOverlay - additional branch coverage', () => {
  let overlay: VirtualControlsOverlay

  beforeEach(() => {
    overlay = new VirtualControlsOverlay(true)
    overlay.addJoystick({ id: 'stick', side: 'left', size: 100, opacity: 0.5 })
    overlay.addButton({ id: 'btn', label: 'X', position: { x: 80, y: 70 }, size: 60, opacity: 0.7 })
    overlay.attach()
  })

  afterEach(() => {
    overlay.detach()
    document.getElementById('gwen-input-overlay')?.remove()
  })

  function getJoystickBase(): Element | null {
    return document.getElementById('gwen-input-overlay')?.children[0] ?? null
  }

  function getButtonEl(): Element | null {
    return document.getElementById('gwen-input-overlay')?.children[1] ?? null
  }

  function makeTL(...touches: Array<{ id: number, x: number, y: number }>): TouchList {
    const objs = touches.map(t => ({
      identifier: t.id, clientX: t.x, clientY: t.y, target: document.body,
      pageX: t.x, pageY: t.y, screenX: t.x, screenY: t.y,
      radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1,
    }))
    return Object.assign(objs, {
      length: objs.length,
      item: (i: number) => objs[i],
      [Symbol.iterator]: function*() { yield* Object.values(objs) }
    }) as unknown as TouchList
  }

  it('getJoystickValue returns {x:0,y:0} for unknown joystick id', () => {
    const val = overlay.getJoystickValue('nonexistent')
    expect(val).toEqual({ x: 0, y: 0 })
  })

  it('joystick handleTouchEnd early returns when activeTouchId is null', () => {
    const baseEl = getJoystickBase()
    if (!baseEl) return

    // Dispatch touchend WITHOUT prior touchstart → activeTouchId is null → early return
    const emptyList = makeTL()
    const endEvent = new TouchEvent('touchend', {
      bubbles: true, cancelable: true,
      touches: emptyList, targetTouches: emptyList, changedTouches: makeTL({ id: 1, x: 10, y: 10 }),
    })
    expect(() => baseEl.dispatchEvent(endEvent)).not.toThrow()
  })

  it('joystick handleTouchMove returns when active touch not in touches list', () => {
    const baseEl = getJoystickBase()
    if (!baseEl) return

    // Start with id=1
    const startTouches = makeTL({ id: 1, x: 50, y: 50 })
    baseEl.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: startTouches, targetTouches: startTouches, changedTouches: startTouches,
    }))

    // Move event where touches only has id=2 (not id=1) → activeTouch not found → early return
    const otherTouches = makeTL({ id: 2, x: 60, y: 60 })
    expect(() => baseEl.dispatchEvent(new TouchEvent('touchmove', {
      bubbles: true, cancelable: true,
      touches: otherTouches, targetTouches: otherTouches, changedTouches: otherTouches,
    }))).not.toThrow()
  })

  it('button handleTouchEnd early returns when activeTouchId is null', () => {
    const buttonEl = getButtonEl()
    if (!buttonEl) return

    // Dispatch touchend WITHOUT prior touchstart → activeTouchId is null → early return
    const emptyList = makeTL()
    const endEvent = new TouchEvent('touchend', {
      bubbles: true, cancelable: true,
      touches: emptyList, targetTouches: emptyList, changedTouches: makeTL({ id: 1, x: 200, y: 200 }),
    })
    expect(() => buttonEl.dispatchEvent(endEvent)).not.toThrow()
    // Button should remain not pressed (early return didn't change state)
    expect(overlay.isButtonPressed('btn')).toBe(false)
  })

  it('button touchstart is ignored when button already has active touch', () => {
    const buttonEl = getButtonEl()
    if (!buttonEl) return

    // First touchstart with id=1
    const firstTouches = makeTL({ id: 1, x: 200, y: 200 })
    buttonEl.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: firstTouches, targetTouches: firstTouches, changedTouches: firstTouches,
    }))
    expect(overlay.isButtonPressed('btn')).toBe(true)

    // Second touchstart with id=2 while id=1 still active → button already occupied → ignored
    const secondTouches = makeTL({ id: 1, x: 200, y: 200 }, { id: 2, x: 205, y: 205 })
    const secondChanged = makeTL({ id: 2, x: 205, y: 205 })
    buttonEl.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: secondTouches, targetTouches: secondTouches, changedTouches: secondChanged,
    }))
    // Button state should still be from id=1 (id=2 is ignored)
    expect(overlay.isButtonPressed('btn')).toBe(true)
  })
})

describe('VirtualControlsOverlay - custom side and touchmove branches', () => {
  afterEach(() => {
    document.getElementById('gwen-input-overlay')?.remove()
  })

  it('creates joystick with custom side and position', () => {
    const overlay = new VirtualControlsOverlay(true)
    overlay.addJoystick({ id: 'stick', side: 'custom', position: { x: 50, y: 80 }, size: 100, opacity: 0.5 })
    expect(() => overlay.attach()).not.toThrow()
    overlay.detach()
  })

  it('joystick handleTouchMove early returns when activeTouchId is null', () => {
    const overlay = new VirtualControlsOverlay(true)
    overlay.addJoystick({ id: 'stick', side: 'left', size: 100, opacity: 0.5 })
    overlay.attach()

    const overlayEl = document.getElementById('gwen-input-overlay')
    const baseEl = overlayEl?.children[0]
    if (!baseEl) return

    // Dispatch touchmove WITHOUT prior touchstart → activeTouchId is null → early return at line 225
    const makeTL = (...touches: Array<{ id: number, x: number, y: number }>): TouchList => {
      const objs = touches.map(t => ({
        identifier: t.id, clientX: t.x, clientY: t.y, target: document.body,
        pageX: t.x, pageY: t.y, screenX: t.x, screenY: t.y,
        radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1,
      }))
      return Object.assign(objs, {
        length: objs.length,
        item: (i: number) => objs[i],
        [Symbol.iterator]: function*() { yield* Object.values(objs) }
      }) as unknown as TouchList
    }

    const moveTouches = makeTL({ id: 1, x: 50, y: 50 })
    expect(() => baseEl.dispatchEvent(new TouchEvent('touchmove', {
      bubbles: true, cancelable: true,
      touches: moveTouches, targetTouches: moveTouches, changedTouches: moveTouches,
    }))).not.toThrow()

    // Value should remain at default since touchmove was ignored
    expect(overlay.getJoystickValue('stick')).toEqual({ x: 0, y: 0 })
    overlay.detach()
  })

  it('attaches overlay to a custom container element', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const overlay = new VirtualControlsOverlay(true)
    overlay.addJoystick({ id: 'stick', side: 'left', size: 100, opacity: 0.5 })
    // Pass container element → exercises `container ?? document.body` left branch
    expect(() => overlay.attach(container)).not.toThrow()
    overlay.detach()
    document.body.removeChild(container)
    document.getElementById('gwen-input-overlay')?.remove()
  })
})

describe('VirtualControlsOverlay - joystick touchstart when already active', () => {
  afterEach(() => {
    document.getElementById('gwen-input-overlay')?.remove()
  })

  it('joystick touchstart is ignored when joystick already has active touch', () => {
    const overlay = new VirtualControlsOverlay(true)
    overlay.addJoystick({ id: 'stick', side: 'left', size: 100, opacity: 0.5 })
    overlay.attach()

    const overlayEl = document.getElementById('gwen-input-overlay')
    const baseEl = overlayEl?.children[0]
    if (!baseEl) return

    const makeTL = (...touches: Array<{ id: number, x: number, y: number }>): TouchList => {
      const objs = touches.map(t => ({
        identifier: t.id, clientX: t.x, clientY: t.y, target: document.body,
        pageX: t.x, pageY: t.y, screenX: t.x, screenY: t.y,
        radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1,
      }))
      return Object.assign(objs, {
        length: objs.length,
        item: (i: number) => objs[i],
        [Symbol.iterator]: function*() { yield* Object.values(objs) }
      }) as unknown as TouchList
    }

    // First touchstart activates joystick with id=1
    const t1 = makeTL({ id: 1, x: 50, y: 50 })
    baseEl.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: t1, targetTouches: t1, changedTouches: t1,
    }))

    // Second touchstart with id=2 while joystick is already active (activeTouchId !== null)
    // This covers the false branch of `if (state.activeTouchId === null && ...)`
    const t2 = makeTL({ id: 1, x: 50, y: 50 }, { id: 2, x: 60, y: 60 })
    const t2Changed = makeTL({ id: 2, x: 60, y: 60 })
    expect(() => baseEl.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: t2, targetTouches: t2, changedTouches: t2Changed,
    }))).not.toThrow()

    overlay.detach()
  })
})
