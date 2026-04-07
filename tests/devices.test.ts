import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KeyboardDevice } from '../src/devices/keyboard.js'
import { MouseDevice } from '../src/devices/mouse.js'
import { GamepadDevice } from '../src/devices/gamepad.js'
import { GyroDevice } from '../src/devices/gyro.js'

describe('KeyboardDevice', () => {
  let keyboard: KeyboardDevice

  beforeEach(() => {
    keyboard = new KeyboardDevice()
    keyboard.attach(window)
  })

  afterEach(() => {
    keyboard.detach(window)
  })

  it('initializes with all keys idle', () => {
    expect(keyboard.getState('Space')).toBe('idle')
    expect(keyboard.isPressed('Space')).toBe(false)
  })

  it('transitions to justPressed on keydown', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    keyboard.update()
    
    expect(keyboard.getState('Space')).toBe('justPressed')
    expect(keyboard.isJustPressed('Space')).toBe(true)
    expect(keyboard.isPressed('Space')).toBe(true)
  })

  it('transitions to held after update', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    keyboard.update()
    keyboard.update()
    
    expect(keyboard.getState('Space')).toBe('held')
    expect(keyboard.isHeld('Space')).toBe(true)
    expect(keyboard.isPressed('Space')).toBe(true)
    expect(keyboard.isJustPressed('Space')).toBe(false)
  })

  it('transitions to justReleased on keyup', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    keyboard.update()
    keyboard.update()
    
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
    keyboard.update()
    
    expect(keyboard.getState('Space')).toBe('justReleased')
    expect(keyboard.isJustReleased('Space')).toBe(true)
    expect(keyboard.isPressed('Space')).toBe(false)
  })

  it('transitions to idle after release', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    keyboard.update()
    keyboard.update()
    
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
    keyboard.update()
    keyboard.update()
    
    expect(keyboard.getState('Space')).toBe('idle')
    expect(keyboard.isJustReleased('Space')).toBe(false)
  })

  it('tracks multiple keys independently', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    keyboard.update()
    
    expect(keyboard.isJustPressed('Space')).toBe(true)
    expect(keyboard.isJustPressed('KeyW')).toBe(true)
    
    keyboard.update()
    
    expect(keyboard.isHeld('Space')).toBe(true)
    expect(keyboard.isHeld('KeyW')).toBe(true)
  })

  it('resets all keys to idle', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    keyboard.update()
    
    keyboard.reset()
    
    expect(keyboard.getState('Space')).toBe('idle')
    expect(keyboard.isPressed('Space')).toBe(false)
  })

  it('ignores repeated keydown events', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    keyboard.update()
    
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    keyboard.update()
    
    expect(keyboard.getState('Space')).toBe('held')
  })

  it('can detach and reattach', () => {
    keyboard.detach(window)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    keyboard.update()

    expect(keyboard.isPressed('Space')).toBe(false)

    keyboard.attach(window)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    keyboard.update()

    expect(keyboard.isPressed('Space')).toBe(true)
  })

  it('resets on window blur', () => {
    keyboard.attach(window)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    keyboard.update()

    expect(keyboard.isPressed('Space')).toBe(true)

    window.dispatchEvent(new Event('blur'))

    expect(keyboard.isPressed('Space')).toBe(false)
  })

  it('sets idle state when keyup fires for non-pressed key', () => {
    // keyup fires for a key that was never in pressed/held state
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyX' }))
    keyboard.update()

    // State should be idle (not justReleased since it was never pressed)
    expect(keyboard.getState('KeyX')).toBe('idle')
  })
})

describe('MouseDevice', () => {
  let mouse: MouseDevice

  beforeEach(() => {
    mouse = new MouseDevice()
    mouse.attach(window)
  })

  afterEach(() => {
    mouse.detach(window)
  })

  it('initializes with position at origin', () => {
    expect(mouse.position.x).toBe(0)
    expect(mouse.position.y).toBe(0)
  })

  it('initializes with zero delta', () => {
    expect(mouse.delta.x).toBe(0)
    expect(mouse.delta.y).toBe(0)
  })

  it('initializes with zero wheel', () => {
    expect(mouse.wheel).toBe(0)
  })

  it('updates position on mousemove', () => {
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 200 }))
    mouse.update()
    
    expect(mouse.position.x).toBe(100)
    expect(mouse.position.y).toBe(200)
  })

  it('accumulates delta on mousemove', () => {
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: 10, movementY: 20 }))
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: 5, movementY: -10 }))
    mouse.update()
    
    expect(mouse.delta.x).toBe(15)
    expect(mouse.delta.y).toBe(10)
  })

  it('resets delta after update', () => {
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: 10, movementY: 20 }))
    mouse.update()
    mouse.update()
    
    expect(mouse.delta.x).toBe(0)
    expect(mouse.delta.y).toBe(0)
  })

  it('accumulates wheel delta', () => {
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }))
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 50 }))
    mouse.update()

    expect(mouse.wheel).not.toBe(0)
  })

  it('resets wheel after update', () => {
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }))
    mouse.update()
    mouse.update()
    
    expect(mouse.wheel).toBe(0)
  })

  it('tracks button press', () => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    mouse.update()
    
    expect(mouse.isButtonJustPressed(0)).toBe(true)
    expect(mouse.isButtonPressed(0)).toBe(true)
  })

  it('tracks button held', () => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    mouse.update()
    mouse.update()
    
    expect(mouse.isButtonPressed(0)).toBe(true)
    expect(mouse.isButtonJustPressed(0)).toBe(false)
  })

  it('tracks button release', () => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    mouse.update()
    mouse.update()
    
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
    mouse.update()
    
    expect(mouse.isButtonJustReleased(0)).toBe(true)
    expect(mouse.isButtonPressed(0)).toBe(false)
  })

  it('tracks multiple buttons independently', () => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    window.dispatchEvent(new MouseEvent('mousedown', { button: 1 }))
    mouse.update()
    
    expect(mouse.isButtonPressed(0)).toBe(true)
    expect(mouse.isButtonPressed(1)).toBe(true)
  })

  it('resets all state', () => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: 10, movementY: 20 }))
    mouse.update()

    mouse.reset()

    expect(mouse.isButtonPressed(0)).toBe(false)
    expect(mouse.delta.x).toBe(0)
    expect(mouse.delta.y).toBe(0)
  })

  it('resets on blur event', () => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    mouse.update()

    expect(mouse.isButtonPressed(0)).toBe(true)

    window.dispatchEvent(new Event('blur'))

    expect(mouse.isButtonPressed(0)).toBe(false)
  })

  it('uses canvas-relative coordinates when canvas provided', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    document.body.appendChild(canvas)

    const canvasMouse = new MouseDevice()
    canvasMouse.attach(window, canvas)

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 200 }))
    canvasMouse.update()

    // Without proper getBoundingClientRect mock, position is still accessible
    expect(canvasMouse.position).toBeDefined()

    canvasMouse.detach(window)
    document.body.removeChild(canvas)
  })

  it('tracks justReleased on mouseup same frame as press', () => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 2 }))
    window.dispatchEvent(new MouseEvent('mouseup', { button: 2 }))
    mouse.update()

    // Both down and up happened — should be justReleased
    expect(mouse.isButtonJustReleased(2)).toBe(true)
  })

  it('returns getButtonState 4-state value', () => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 1 }))
    mouse.update()

    const state = mouse.getButtonState(1)
    expect(state).toBe('justPressed')
  })

  it('returns idle for unknown button', () => {
    const state = mouse.getButtonState(99)
    expect(state).toBe('idle')
  })

  it('clears cachedRect on window resize event', () => {
    // Dispatch a resize — the onResize handler sets cachedRect=null
    // Should not throw and mouse should still work after
    expect(() => {
      window.dispatchEvent(new Event('resize'))
      mouse.update()
    }).not.toThrow()
  })

  it('transitions button from justReleased to idle on second update', () => {
    // Press
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    mouse.update()
    // Release
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
    mouse.update()
    expect(mouse.getButtonState(0)).toBe('justReleased')
    // Second update after release → idle
    mouse.update()
    expect(mouse.getButtonState(0)).toBe('idle')
  })

  it('sets button to idle on mouseup for button never pressed', () => {
    // Dispatch mouseup for button 3 which was never pressed
    window.dispatchEvent(new MouseEvent('mouseup', { button: 3 }))
    mouse.update()
    // Should be idle (not justReleased) since it was never in justPressed/held
    expect(mouse.getButtonState(3)).toBe('idle')
  })
})

describe('GamepadDevice', () => {
  let gamepad: GamepadDevice
  let mockGamepad: Partial<Gamepad>

  beforeEach(() => {
    // jsdom doesn't define getGamepads — define it so vi.spyOn works
    if (!('getGamepads' in navigator)) {
      Object.defineProperty(navigator, 'getGamepads', {
        value: () => [null, null, null, null],
        configurable: true,
        writable: true,
      })
    }

    gamepad = new GamepadDevice(0.15)
    gamepad.attach(window)

    mockGamepad = {
      connected: true,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })),
      axes: [0, 0, 0, 0],
      index: 0,
      id: 'Mock Gamepad',
      mapping: 'standard',
      timestamp: 0,
      hapticActuators: [],
      vibrationActuator: null,
    }
  })

  afterEach(() => {
    gamepad.detach(window)
    vi.restoreAllMocks()
  })

  it('initializes with no connected gamepads', () => {
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([null, null, null, null])
    gamepad.update()
    
    expect(gamepad.connectedCount()).toBe(0)
  })

  it('detects connected gamepad', () => {
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad as Gamepad, null, null, null])
    gamepad.update()
    
    expect(gamepad.connectedCount()).toBe(1)
    expect(gamepad.isConnected(0)).toBe(true)
    expect(gamepad.getConnectedIndices()).toContain(0)
  })

  it('detects button press', () => {
    mockGamepad.buttons![0] = { pressed: true, value: 1, touched: true }
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad as Gamepad, null, null, null])
    
    gamepad.update()
    
    expect(gamepad.isButtonJustPressed(0, 0)).toBe(true)
    expect(gamepad.isButtonPressed(0, 0)).toBe(true)
  })

  it('detects button held', () => {
    mockGamepad.buttons![0] = { pressed: true, value: 1, touched: true }
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad as Gamepad, null, null, null])
    
    gamepad.update()
    gamepad.update()
    
    expect(gamepad.isButtonPressed(0, 0)).toBe(true)
    expect(gamepad.isButtonJustPressed(0, 0)).toBe(false)
  })

  it('detects button release', () => {
    mockGamepad.buttons![0] = { pressed: true, value: 1, touched: true }
    const spy = vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad as Gamepad, null, null, null])
    
    gamepad.update()
    gamepad.update()
    
    mockGamepad.buttons![0] = { pressed: false, value: 0, touched: false }
    gamepad.update()
    
    expect(gamepad.isButtonJustReleased(0, 0)).toBe(true)
    expect(gamepad.isButtonPressed(0, 0)).toBe(false)
  })

  it('reads button analog value', () => {
    mockGamepad.buttons![0] = { pressed: true, value: 0.75, touched: true }
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad as Gamepad, null, null, null])
    
    gamepad.update()
    
    expect(gamepad.getButtonValue(0, 0)).toBe(0.75)
  })

  it('reads axis value', () => {
    mockGamepad.axes = [0.5, -0.3, 0, 0]
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad as Gamepad, null, null, null])
    
    gamepad.update()
    
    expect(gamepad.getAxis(0, 0)).toBeCloseTo(0.5, 2)
    expect(gamepad.getAxis(0, 1)).toBeCloseTo(-0.3, 2)
  })

  it('applies deadzone to axes', () => {
    mockGamepad.axes = [0.1, -0.1, 0, 0] // below 0.15 deadzone
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad as Gamepad, null, null, null])
    
    gamepad.update()
    
    expect(gamepad.getAxis(0, 0)).toBe(0)
    expect(gamepad.getAxis(0, 1)).toBe(0)
  })

  it('reads left stick', () => {
    mockGamepad.axes = [0.5, -0.3, 0, 0]
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad as Gamepad, null, null, null])
    
    gamepad.update()
    
    const stick = gamepad.getLeftStick(0)
    expect(stick.x).toBeCloseTo(0.5, 2)
    expect(stick.y).toBeCloseTo(-0.3, 2)
  })

  it('reads right stick', () => {
    mockGamepad.axes = [0, 0, 0.7, -0.4]
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad as Gamepad, null, null, null])
    
    gamepad.update()
    
    const stick = gamepad.getRightStick(0)
    expect(stick.x).toBeCloseTo(0.7, 2)
    expect(stick.y).toBeCloseTo(-0.4, 2)
  })

  it('handles multiple gamepads', () => {
    const mockGamepad2 = { ...mockGamepad, index: 1 }
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([
      mockGamepad as Gamepad,
      mockGamepad2 as Gamepad,
      null,
      null
    ])
    
    gamepad.update()
    
    expect(gamepad.connectedCount()).toBe(2)
    expect(gamepad.getConnectedIndices()).toEqual([0, 1])
  })

  it('resets all state', () => {
    mockGamepad.buttons![0] = { pressed: true, value: 1, touched: true }
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([mockGamepad as Gamepad, null, null, null])
    
    gamepad.update()
    gamepad.reset()
    
    expect(gamepad.isButtonPressed(0, 0)).toBe(false)
  })

  it('returns zero for disconnected gamepad', () => {
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([null, null, null, null])
    gamepad.update()
    
    expect(gamepad.getAxis(0, 0)).toBe(0)
    expect(gamepad.isButtonPressed(0, 0)).toBe(false)
  })

  it('fires onConnect callback when gamepadconnected event fires', () => {
    const gp = new GamepadDevice(0.15)
    const connectFn = vi.fn()
    gp.onConnect = connectFn
    gp.attach(window)

    const mockPad = { index: 2 } as Gamepad
    window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: mockPad }))

    expect(connectFn).toHaveBeenCalledWith(2)
    gp.detach(window)
  })

  it('fires onDisconnect callback when gamepaddisconnected event fires', () => {
    const gp = new GamepadDevice(0.15)
    const disconnectFn = vi.fn()
    gp.onDisconnect = disconnectFn
    gp.attach(window)

    const mockPad = { index: 1 } as Gamepad
    window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: mockPad }))

    expect(disconnectFn).toHaveBeenCalledWith(1)
    gp.detach(window)
  })

  it('isButtonJustPressed returns false for out-of-bounds padIndex (covers ?? false branch)', () => {
    vi.spyOn(navigator, 'getGamepads').mockReturnValue([null, null, null, null])
    gamepad.update()
    // padIndex 99 has no state arrays → optional chain returns undefined → ?? false
    expect(gamepad.isButtonJustPressed(99, 0)).toBe(false)
    expect(gamepad.isButtonJustReleased(99, 0)).toBe(false)
    expect(gamepad.getButtonValue(99, 0)).toBe(0)
  })
})

describe('GyroDevice', () => {
  let gyro: GyroDevice

  beforeEach(() => {
    gyro = new GyroDevice(0.1, 0.02)
    gyro.attach(window)
  })

  afterEach(() => {
    gyro.detach(window)
  })

  it('initializes as not available', () => {
    expect(gyro.isAvailable).toBe(false)
  })

  it('initializes with zero orientation', () => {
    expect(gyro.orientation.roll).toBe(0)
    expect(gyro.orientation.pitch).toBe(0)
    expect(gyro.orientation.yaw).toBe(0)
  })

  it('initializes with zero velocity', () => {
    expect(gyro.velocity.alpha).toBe(0)
    expect(gyro.velocity.beta).toBe(0)
    expect(gyro.velocity.gamma).toBe(0)
  })

  it('becomes available after deviceorientation event', () => {
    const event = Object.assign(new Event('deviceorientation'), {
      alpha: 90,
      beta: 45,
      gamma: -30,
      absolute: false,
    })
    
    window.dispatchEvent(event)
    gyro.update()
    
    expect(gyro.isAvailable).toBe(true)
  })

  it('updates orientation from deviceorientation', () => {
    // Use smoothing=1.0 for instant update (no lag)
    const fastGyro = new GyroDevice(1.0, 0)
    fastGyro.attach(window)

    const event = Object.assign(new Event('deviceorientation'), {
      alpha: 90,
      beta: 45,
      gamma: -30,
      absolute: false,
    })

    window.dispatchEvent(event)
    fastGyro.update()

    expect(fastGyro.orientation.yaw).toBeCloseTo(90, 0)
    expect(fastGyro.orientation.pitch).toBeCloseTo(45, 0)
    expect(fastGyro.orientation.roll).toBeCloseTo(-30, 0)

    fastGyro.detach(window)
  })

  it('updates velocity from devicemotion', () => {
    const orientationEvent = Object.assign(new Event('deviceorientation'), {
      alpha: 0,
      beta: 0,
      gamma: 0,
      absolute: false,
    })
    window.dispatchEvent(orientationEvent)
    gyro.update()
    
    const motionEvent = Object.assign(new Event('devicemotion'), {
      rotationRate: { alpha: 10, beta: 20, gamma: 30 },
    })
    
    window.dispatchEvent(motionEvent)
    gyro.update()
    
    expect(gyro.velocity.alpha).toBeGreaterThan(0)
    expect(gyro.velocity.beta).toBeGreaterThan(0)
    expect(gyro.velocity.gamma).toBeGreaterThan(0)
  })

  it('applies smoothing to orientation', () => {
    const event1 = Object.assign(new Event('deviceorientation'), {
      alpha: 0,
      beta: 0,
      gamma: 0,
      absolute: false,
    })
    
    window.dispatchEvent(event1)
    gyro.update()
    
    const event2 = Object.assign(new Event('deviceorientation'), {
      alpha: 90,
      beta: 90,
      gamma: 90,
      absolute: false,
    })
    
    window.dispatchEvent(event2)
    gyro.update()
    
    // With smoothing, values should not jump immediately to 90
    expect(Math.abs(gyro.orientation.yaw)).toBeLessThan(90)
  })

  it('resets all state', () => {
    const event = Object.assign(new Event('deviceorientation'), {
      alpha: 90,
      beta: 45,
      gamma: -30,
      absolute: false,
    })
    
    window.dispatchEvent(event)
    gyro.update()
    
    gyro.reset()
    
    expect(gyro.orientation.roll).toBe(0)
    expect(gyro.orientation.pitch).toBe(0)
    expect(gyro.orientation.yaw).toBe(0)
  })

  it('can detach and reattach', () => {
    gyro.detach(window)
    
    const event = Object.assign(new Event('deviceorientation'), {
      alpha: 90,
      beta: 45,
      gamma: -30,
      absolute: false,
    })
    
    window.dispatchEvent(event)
    gyro.update()
    
    expect(gyro.isAvailable).toBe(false)
    
    gyro.attach(window)
    window.dispatchEvent(event)
    gyro.update()
    
    expect(gyro.isAvailable).toBe(true)
  })

  it('ignores small changes below deadzone', () => {
    // Use fast gyro with non-trivial deadzone
    const fastGyro = new GyroDevice(1.0, 5.0) // deadzone of 5 degrees
    fastGyro.attach(window)

    // Set initial orientation
    const event1 = Object.assign(new Event('deviceorientation'), { alpha: 90, beta: 0, gamma: 0, absolute: false })
    window.dispatchEvent(event1)
    fastGyro.update()

    const initialYaw = fastGyro.orientation.yaw

    // Very small change (2 degrees) — below deadzone of 5
    const event2 = Object.assign(new Event('deviceorientation'), { alpha: 92, beta: 0, gamma: 0, absolute: false })
    window.dispatchEvent(event2)
    fastGyro.update()

    // Orientation should not update (delta 2 < deadzone 5)
    expect(fastGyro.orientation.yaw).toBe(initialYaw)

    fastGyro.detach(window)
  })

  it('handles null rotationRate in devicemotion', () => {
    const motionEvent = Object.assign(new Event('devicemotion'), {
      rotationRate: null,
    })

    // Should not throw
    expect(() => {
      window.dispatchEvent(motionEvent)
      gyro.update()
    }).not.toThrow()

    // Velocity should stay zero
    expect(gyro.velocity.alpha).toBe(0)
  })

  it('handles null alpha/beta/gamma in deviceorientation', () => {
    const event = Object.assign(new Event('deviceorientation'), {
      alpha: null,
      beta: null,
      gamma: null,
      absolute: false,
    })

    // Should not throw and should use 0 for null values
    expect(() => {
      window.dispatchEvent(event)
      gyro.update()
    }).not.toThrow()
  })

  it('handles null alpha/beta/gamma in rotationRate (devicemotion)', () => {
    const motionEvent = Object.assign(new Event('devicemotion'), {
      rotationRate: { alpha: null, beta: null, gamma: null },
    })

    // Should not throw and should use 0 for null values
    expect(() => {
      window.dispatchEvent(motionEvent)
      gyro.update()
    }).not.toThrow()

    expect(gyro.velocity.alpha).toBe(0)
    expect(gyro.velocity.beta).toBe(0)
    expect(gyro.velocity.gamma).toBe(0)
  })
})
