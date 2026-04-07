import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockEngine } from './mocks/@gwenjs/core.js'
import { useAction } from '../src/composables/use-action.js'
import { useKeyboard } from '../src/composables/use-keyboard.js'
import { useMouse } from '../src/composables/use-mouse.js'
import { useGamepad } from '../src/composables/use-gamepad.js'
import { useTouch } from '../src/composables/use-touch.js'
import { useGyro } from '../src/composables/use-gyro.js'
import { usePointer } from '../src/composables/use-pointer.js'
import { useInput, usePlayer, useInputRecorder, useInputPlayback } from '../src/composables.js'
import { defineAction } from '../src/actions/define-action.js'
import { Keys } from '../src/constants/keys.js'
import { GamepadButtons, GamepadStick, GyroAxis } from '../src/constants/gamepad.js'

// Verify we can import the constants
describe('Keys constants', () => {
  it('has Space key', () => {
    expect(Keys.Space).toBe('Space')
  })

  it('has letter keys', () => {
    expect(Keys.W).toBe('KeyW')
    expect(Keys.A).toBe('KeyA')
    expect(Keys.S).toBe('KeyS')
    expect(Keys.D).toBe('KeyD')
  })

  it('has arrow keys', () => {
    expect(Keys.ArrowUp).toBe('ArrowUp')
    expect(Keys.ArrowDown).toBe('ArrowDown')
    expect(Keys.ArrowLeft).toBe('ArrowLeft')
    expect(Keys.ArrowRight).toBe('ArrowRight')
  })

  it('has Enter and Escape', () => {
    expect(Keys.Enter).toBe('Enter')
    expect(Keys.Escape).toBe('Escape')
  })
})

describe('GamepadButtons constants', () => {
  it('has face buttons', () => {
    expect(GamepadButtons.South).toBe(0)
    expect(GamepadButtons.East).toBe(1)
    expect(GamepadButtons.West).toBe(2)
    expect(GamepadButtons.North).toBe(3)
  })

  it('has shoulder buttons', () => {
    expect(GamepadButtons.LeftBump).toBe(4)
    expect(GamepadButtons.RightBump).toBe(5)
  })
})

describe('GamepadStick constants', () => {
  it('has stick identifiers', () => {
    expect(GamepadStick.Left).toBeDefined()
    expect(GamepadStick.Right).toBeDefined()
  })
})

describe('GyroAxis constants', () => {
  it('has axis identifiers', () => {
    expect(GyroAxis.Roll).toBeDefined()
    expect(GyroAxis.Pitch).toBeDefined()
    expect(GyroAxis.Yaw).toBeDefined()
  })
})

describe('useAction composable', () => {
  let mockAction: ReturnType<typeof defineAction>
  const mockButtonState = { type: 'button' as const, isPressed: true, isJustTriggered: true, isJustReleased: false, holdTime: 0 }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAction = defineAction('jump', { type: 'button' })
  })

  it('throws GwenPluginNotFoundError when input plugin not registered', () => {
    mockEngine.tryInject.mockReturnValue(null)

    expect(() => useAction(mockAction)).toThrow('Plugin not found: @gwenjs/input')
  })

  it('returns action state when plugin is registered', () => {
    const mockPlayerAction = vi.fn().mockReturnValue(mockButtonState)
    const mockPlayer = { action: mockPlayerAction }
    const mockInput = { player: vi.fn().mockReturnValue(mockPlayer) }
    mockEngine.tryInject.mockReturnValue(mockInput)

    const result = useAction(mockAction, 0)

    expect(result).toBe(mockButtonState)
    expect(mockInput.player).toHaveBeenCalledWith(0)
    expect(mockPlayerAction).toHaveBeenCalledWith(mockAction)
  })

  it('defaults to player 0', () => {
    const mockPlayerAction = vi.fn().mockReturnValue(mockButtonState)
    const mockPlayer = { action: mockPlayerAction }
    const mockInput = { player: vi.fn().mockReturnValue(mockPlayer) }
    mockEngine.tryInject.mockReturnValue(mockInput)

    useAction(mockAction)

    expect(mockInput.player).toHaveBeenCalledWith(0)
  })
})

describe('useKeyboard composable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws when plugin not registered', () => {
    mockEngine.tryInject.mockReturnValue(null)
    expect(() => useKeyboard()).toThrow('Plugin not found: @gwenjs/input')
  })

  it('returns keyboard device when registered', () => {
    const mockKeyboard = { isPressed: vi.fn() }
    const mockInput = { keyboard: mockKeyboard }
    mockEngine.tryInject.mockReturnValue(mockInput)

    const result = useKeyboard()

    expect(result).toBe(mockKeyboard)
  })
})

describe('useMouse composable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws when plugin not registered', () => {
    mockEngine.tryInject.mockReturnValue(null)
    expect(() => useMouse()).toThrow('Plugin not found: @gwenjs/input')
  })

  it('returns mouse device when registered', () => {
    const mockMouse = { position: { x: 0, y: 0 } }
    const mockInput = { mouse: mockMouse }
    mockEngine.tryInject.mockReturnValue(mockInput)

    const result = useMouse()

    expect(result).toBe(mockMouse)
  })
})

describe('useGamepad composable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws when plugin not registered', () => {
    mockEngine.tryInject.mockReturnValue(null)
    expect(() => useGamepad()).toThrow('Plugin not found: @gwenjs/input')
  })

  it('returns gamepad device when registered', () => {
    const mockGamepad = { isButtonPressed: vi.fn() }
    const mockInput = { gamepad: mockGamepad }
    mockEngine.tryInject.mockReturnValue(mockInput)

    const result = useGamepad()

    expect(result).toBe(mockGamepad)
  })
})

describe('useTouch composable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws when plugin not registered', () => {
    mockEngine.tryInject.mockReturnValue(null)
    expect(() => useTouch()).toThrow('Plugin not found: @gwenjs/input')
  })

  it('returns touch device when registered', () => {
    const mockTouch = { isTouching: vi.fn() }
    const mockInput = { touch: mockTouch }
    mockEngine.tryInject.mockReturnValue(mockInput)

    const result = useTouch()

    expect(result).toBe(mockTouch)
  })
})

describe('useGyro composable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws when plugin not registered', () => {
    mockEngine.tryInject.mockReturnValue(null)
    expect(() => useGyro()).toThrow('Plugin not found: @gwenjs/input')
  })

  it('returns gyro device when registered', () => {
    const mockGyro = { orientation: { roll: 0, pitch: 0, yaw: 0 } }
    const mockInput = { gyro: mockGyro }
    mockEngine.tryInject.mockReturnValue(mockInput)

    const result = useGyro()

    expect(result).toBe(mockGyro)
  })
})

describe('useInput composable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws when plugin not registered', () => {
    mockEngine.tryInject.mockReturnValue(null)
    expect(() => useInput()).toThrow('Plugin not found: @gwenjs/input')
  })

  it('returns input service when registered', () => {
    const mockService = { player: vi.fn() }
    mockEngine.tryInject.mockReturnValue(mockService)

    const result = useInput()

    expect(result).toBe(mockService)
  })
})

describe('usePlayer composable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns player from input service', () => {
    const mockPlayer = { action: vi.fn() }
    const mockService = { player: vi.fn().mockReturnValue(mockPlayer) }
    mockEngine.tryInject.mockReturnValue(mockService)

    const result = usePlayer(1)

    expect(result).toBe(mockPlayer)
    expect(mockService.player).toHaveBeenCalledWith(1)
  })
})

describe('useInputRecorder composable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns recorder from input service', () => {
    const mockRecorder = { start: vi.fn() }
    const mockService = { recorder: mockRecorder, player: vi.fn() }
    mockEngine.tryInject.mockReturnValue(mockService)

    const result = useInputRecorder()

    expect(result).toBe(mockRecorder)
  })
})

describe('useInputPlayback composable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns playback from input service', () => {
    const mockPlayback = { play: vi.fn() }
    const mockService = { playback: mockPlayback, player: vi.fn() }
    mockEngine.tryInject.mockReturnValue(mockService)

    const result = useInputPlayback()

    expect(result).toBe(mockPlayback)
  })
})

describe('usePointer composable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns mouse-based pointer state when no touch', () => {
    const mockMouse = {
      position: { x: 100, y: 200 },
      delta: { x: 5, y: -3 },
      isButtonPressed: vi.fn().mockReturnValue(false),
      isButtonJustPressed: vi.fn().mockReturnValue(false),
      isButtonJustReleased: vi.fn().mockReturnValue(false),
    }
    mockEngine.tryInject.mockReturnValue({ mouse: mockMouse })

    const result = usePointer()

    expect(result.type).toBe('mouse')
    expect(result.position.x).toBe(100)
    expect(result.position.y).toBe(200)
    expect(result.delta.x).toBe(5)
    expect(result.delta.y).toBe(-3)
    expect(result.isPressed).toBe(false)
  })

  it('returns pressed=true when left mouse button pressed', () => {
    const mockMouse = {
      position: { x: 0, y: 0 },
      delta: { x: 0, y: 0 },
      isButtonPressed: vi.fn().mockReturnValue(true),
      isButtonJustPressed: vi.fn().mockReturnValue(true),
      isButtonJustReleased: vi.fn().mockReturnValue(false),
    }
    mockEngine.tryInject.mockReturnValue({ mouse: mockMouse })

    const result = usePointer()

    expect(result.isPressed).toBe(true)
    expect(result.isJustPressed).toBe(true)
  })
})
