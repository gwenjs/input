import { describe, it, expect } from 'vitest'
import { InteractionPipeline } from '../src/interactions/pipeline.js'
import { Press } from '../src/interactions/press.js'
import { Release } from '../src/interactions/release.js'
import { Tap } from '../src/interactions/tap.js'
import { Hold } from '../src/interactions/hold.js'
import { DoubleTap } from '../src/interactions/double-tap.js'
import { Toggle } from '../src/interactions/toggle.js'
import { Repeat } from '../src/interactions/repeat.js'
import { ChordedWith } from '../src/interactions/chorded-with.js'
import { AllOf } from '../src/interactions/all-of.js'
import { defineAction } from '../src/actions/define-action.js'

describe('InteractionPipeline - default (Press)', () => {
  it('defaults to Press behavior when no descriptors', () => {
    const pipeline = new InteractionPipeline([])

    const result = pipeline.evaluate(true, 16)

    expect(result.isPressed).toBe(true)
    expect(result.isJustTriggered).toBe(true)
    expect(result.isJustReleased).toBe(false)
  })

  it('tracks hold time while pressed', () => {
    const pipeline = new InteractionPipeline([])

    pipeline.evaluate(true, 16)
    const result = pipeline.evaluate(true, 16)

    expect(result.holdTime).toBeGreaterThan(0)
  })
})

describe('Press interaction', () => {
  it('triggers on first press', () => {
    const pipeline = new InteractionPipeline([Press()])

    const result = pipeline.evaluate(true, 16)

    expect(result.isPressed).toBe(true)
    expect(result.isJustTriggered).toBe(true)
  })

  it('remains pressed while held', () => {
    const pipeline = new InteractionPipeline([Press()])

    pipeline.evaluate(true, 16)
    const result = pipeline.evaluate(true, 16)

    expect(result.isPressed).toBe(true)
    expect(result.isJustTriggered).toBe(false)
  })

  it('releases when input released', () => {
    const pipeline = new InteractionPipeline([Press()])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(true, 16)
    const result = pipeline.evaluate(false, 16)

    expect(result.isPressed).toBe(false)
    expect(result.isJustReleased).toBe(true)
  })

  it('resets hold time on release', () => {
    const pipeline = new InteractionPipeline([Press()])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(true, 16)
    pipeline.evaluate(false, 16)
    const result = pipeline.evaluate(false, 16)

    expect(result.holdTime).toBe(0)
  })

  it('does not trigger while not pressed', () => {
    const pipeline = new InteractionPipeline([Press()])

    const result = pipeline.evaluate(false, 16)

    expect(result.isPressed).toBe(false)
    expect(result.isJustTriggered).toBe(false)
  })
})

describe('Release interaction', () => {
  it('does not trigger immediately on press', () => {
    const pipeline = new InteractionPipeline([Release()])

    const result = pipeline.evaluate(true, 16)

    expect(result.isPressed).toBe(false)
    expect(result.isJustTriggered).toBe(false)
  })

  it('triggers on release', () => {
    const pipeline = new InteractionPipeline([Release()])

    pipeline.evaluate(true, 16)
    const result = pipeline.evaluate(false, 16)

    expect(result.isPressed).toBe(true)
    expect(result.isJustTriggered).toBe(true)
  })

  it('does not fire again on subsequent not-pressed frames', () => {
    const pipeline = new InteractionPipeline([Release()])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(false, 16) // triggers
    const result = pipeline.evaluate(false, 16) // nothing

    expect(result.isPressed).toBe(false)
    expect(result.isJustTriggered).toBe(false)
  })

  it('fires isJustReleased when button pressed again', () => {
    const pipeline = new InteractionPipeline([Release()])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(false, 16) // triggers Release
    const result = pipeline.evaluate(true, 16) // pressing again = end of Release state

    expect(result.isJustReleased).toBe(true)
  })
})

describe('Tap interaction', () => {
  it('triggers on quick press-release', () => {
    const pipeline = new InteractionPipeline([Tap({ maxDuration: 200 })])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(true, 16)
    const result = pipeline.evaluate(false, 100)

    expect(result.isJustTriggered).toBe(true)
  })

  it('does not trigger if held too long', () => {
    const pipeline = new InteractionPipeline([Tap({ maxDuration: 200 })])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(true, 300) // exceed duration
    const result = pipeline.evaluate(false, 16)

    expect(result.isPressed).toBe(false)
    expect(result.isJustTriggered).toBe(false)
  })

  it('does not trigger while still held', () => {
    const pipeline = new InteractionPipeline([Tap({ maxDuration: 200 })])

    pipeline.evaluate(true, 16)
    const result = pipeline.evaluate(true, 16)

    expect(result.isJustTriggered).toBe(false)
  })

  it('uses default maxDuration when none specified', () => {
    const pipeline = new InteractionPipeline([Tap()])

    // Default maxDuration is 0.3 (seconds)
    // With dt values: 0.3 of 1 unit total < 0.3 threshold
    pipeline.evaluate(true, 0.1)
    const result = pipeline.evaluate(false, 0.1)

    expect(result.isJustTriggered).toBe(true)
  })
})

describe('Hold interaction', () => {
  it('does not trigger immediately', () => {
    const pipeline = new InteractionPipeline([Hold({ holdTime: 500 })])

    const result = pipeline.evaluate(true, 16)

    expect(result.isPressed).toBe(false)
    expect(result.isJustTriggered).toBe(false)
  })

  it('triggers after duration threshold', () => {
    const pipeline = new InteractionPipeline([Hold({ holdTime: 500 })])

    pipeline.evaluate(true, 16)
    const result = pipeline.evaluate(true, 500)

    expect(result.isPressed).toBe(true)
    expect(result.isJustTriggered).toBe(true)
  })

  it('remains pressed after triggering', () => {
    const pipeline = new InteractionPipeline([Hold({ holdTime: 500 })])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(true, 500)
    const result = pipeline.evaluate(true, 16)

    expect(result.isPressed).toBe(true)
    expect(result.isJustTriggered).toBe(false)
  })

  it('does not trigger if released before duration', () => {
    const pipeline = new InteractionPipeline([Hold({ holdTime: 500 })])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(true, 200)
    const result = pipeline.evaluate(false, 16)

    expect(result.isPressed).toBe(false)
    expect(result.isJustTriggered).toBe(false)
  })

  it('fires isJustReleased when released after trigger', () => {
    const pipeline = new InteractionPipeline([Hold({ holdTime: 500 })])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(true, 500) // triggers
    pipeline.evaluate(true, 16)  // still held
    const result = pipeline.evaluate(false, 16) // release

    expect(result.isJustReleased).toBe(true)
  })
})

describe('DoubleTap interaction', () => {
  it('does not trigger on single tap', () => {
    const pipeline = new InteractionPipeline([DoubleTap({ maxGap: 300 })])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(false, 16)
    const result = pipeline.evaluate(false, 16)

    expect(result.isPressed).toBe(false)
    expect(result.isJustTriggered).toBe(false)
  })

  it('triggers on two quick taps', () => {
    const pipeline = new InteractionPipeline([DoubleTap({ maxGap: 300 })])

    // First tap
    pipeline.evaluate(true, 16)
    pipeline.evaluate(false, 16)
    pipeline.evaluate(false, 50)

    // Second tap
    pipeline.evaluate(true, 16)
    const result = pipeline.evaluate(false, 16)

    expect(result.isPressed).toBe(true)
    expect(result.isJustTriggered).toBe(true)
  })

  it('does not trigger if second tap too slow', () => {
    const pipeline = new InteractionPipeline([DoubleTap({ maxGap: 300 })])

    // First tap
    pipeline.evaluate(true, 16)
    pipeline.evaluate(false, 16)
    pipeline.evaluate(false, 400) // exceed maxGap

    // Second tap
    pipeline.evaluate(true, 16)
    const result = pipeline.evaluate(false, 16)

    expect(result.isPressed).toBe(false)
  })

  it('uses default maxGap when none specified', () => {
    const pipeline = new InteractionPipeline([DoubleTap()])

    // First tap
    pipeline.evaluate(true, 0.01)
    pipeline.evaluate(false, 0.01)
    pipeline.evaluate(false, 0.1)

    // Second tap within default 0.3s gap
    pipeline.evaluate(true, 0.01)
    const result = pipeline.evaluate(false, 0.01)

    expect(result.isJustTriggered).toBe(true)
  })
})

describe('Toggle interaction', () => {
  it('toggles on each press', () => {
    const pipeline = new InteractionPipeline([Toggle()])

    const result1 = pipeline.evaluate(true, 16)
    expect(result1.isPressed).toBe(true)

    pipeline.evaluate(false, 16)
    const result2 = pipeline.evaluate(true, 16)
    expect(result2.isPressed).toBe(false)

    pipeline.evaluate(false, 16)
    const result3 = pipeline.evaluate(true, 16)
    expect(result3.isPressed).toBe(true)
  })

  it('does not toggle while held', () => {
    const pipeline = new InteractionPipeline([Toggle()])

    const result1 = pipeline.evaluate(true, 16)
    const result2 = pipeline.evaluate(true, 16)

    expect(result1.isPressed).toBe(true)
    expect(result2.isPressed).toBe(true)
  })

  it('fires isJustTriggered on toggle-on', () => {
    const pipeline = new InteractionPipeline([Toggle()])

    const result = pipeline.evaluate(true, 16)

    expect(result.isJustTriggered).toBe(true)
  })

  it('fires isJustReleased on toggle-off', () => {
    const pipeline = new InteractionPipeline([Toggle()])

    pipeline.evaluate(true, 16) // toggle on
    pipeline.evaluate(false, 16)
    const result = pipeline.evaluate(true, 16) // toggle off

    expect(result.isJustReleased).toBe(true)
  })
})

describe('Repeat interaction', () => {
  it('triggers on initial press', () => {
    const pipeline = new InteractionPipeline([Repeat({ interval: 100, delay: 200 })])

    const result = pipeline.evaluate(true, 16)

    expect(result.isPressed).toBe(true)
    expect(result.isJustTriggered).toBe(true)
  })

  it('repeats after initial delay', () => {
    const pipeline = new InteractionPipeline([Repeat({ interval: 100, delay: 200 })])

    pipeline.evaluate(true, 16)        // first trigger, delayRemaining=200
    pipeline.evaluate(true, 16)        // delay running: 200-16=184
    pipeline.evaluate(true, 200)       // delay expires: 184-200=-16; intervalRemaining=84
    const result = pipeline.evaluate(true, 100) // interval: 84-100=-16 <= 0 → trigger

    expect(result.isJustTriggered).toBe(true)
  })

  it('repeats at regular intervals', () => {
    const pipeline = new InteractionPipeline([Repeat({ interval: 100, delay: 200 })])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(true, 200) // first repeat
    const result = pipeline.evaluate(true, 100) // second repeat

    expect(result.isJustTriggered).toBe(true)
  })

  it('stops repeating when released', () => {
    const pipeline = new InteractionPipeline([Repeat({ interval: 100, delay: 200 })])

    pipeline.evaluate(true, 16)
    pipeline.evaluate(true, 200)
    const result = pipeline.evaluate(false, 100)

    expect(result.isPressed).toBe(false)
    expect(result.isJustReleased).toBe(true)
  })

  it('uses interval as default delay', () => {
    const pipeline = new InteractionPipeline([Repeat({ interval: 100 })])

    pipeline.evaluate(true, 16)        // first trigger, delay=100
    pipeline.evaluate(true, 100)       // delay expires: 100-100=0, intervalRemaining=100
    const result = pipeline.evaluate(true, 100) // interval: 100-100=0 <= 0 → trigger

    expect(result.isJustTriggered).toBe(true)
  })
})

describe('ChordedWith interaction', () => {
  it('requires companion action to be pressed', () => {
    const companion = defineAction('ctrl', { type: 'button' })
    const pipeline = new InteractionPipeline([ChordedWith(companion, 'isPressed')])

    const getActionState = (id: symbol) => {
      if (id === companion.id) {
        return { isPressed: false, isJustTriggered: false, isJustReleased: false, holdTime: 0 }
      }
      return null
    }

    const result = pipeline.evaluate(true, 16, getActionState)

    expect(result.isPressed).toBe(false)
  })

  it('triggers when companion is pressed', () => {
    const companion = defineAction('ctrl', { type: 'button' })
    // ChordedWith modifies rawPressed; need Press() to produce output
    const pipeline = new InteractionPipeline([ChordedWith(companion, 'isPressed'), Press()])

    const getActionState = (id: symbol) => {
      if (id === companion.id) {
        return { isPressed: true, isJustTriggered: false, isJustReleased: false, holdTime: 100 }
      }
      return null
    }

    const result = pipeline.evaluate(true, 16, getActionState)

    expect(result.isPressed).toBe(true)
    expect(result.isJustTriggered).toBe(true)
  })

  it('suppresses when companion not pressed', () => {
    const companion = defineAction('shift', { type: 'button' })
    const pipeline = new InteractionPipeline([ChordedWith(companion, 'isJustTriggered')])

    const getActionState = (_id: symbol) => {
      return { isPressed: true, isJustTriggered: false, isJustReleased: false, holdTime: 0 }
    }

    const result = pipeline.evaluate(true, 16, getActionState)

    expect(result.isPressed).toBe(false)
  })

  it('suppresses when getActionState is not provided', () => {
    const companion = defineAction('ctrl', { type: 'button' })
    const pipeline = new InteractionPipeline([ChordedWith(companion, 'isPressed')])

    const result = pipeline.evaluate(true, 16)

    expect(result.isPressed).toBe(false)
  })
})

describe('AllOf interaction', () => {
  it('is a no-op in the pipeline (handled by PlayerInput)', () => {
    // AllOf is resolved in PlayerInput._evaluateButtonBindings, not InteractionPipeline
    // In the pipeline alone, AllOf is a no-op (continue) and returns false
    const pipeline = new InteractionPipeline([AllOf('KeyA', 'KeyB')])

    const result = pipeline.evaluate(true, 16)

    // AllOf is skipped via 'continue' — no other descriptor, so result is all-false
    expect(result.isPressed).toBe(false)
    expect(result.isJustTriggered).toBe(false)
  })

  it('descriptor is created correctly', () => {
    const desc = AllOf('Space', 'KeyW', 'ControlLeft')

    expect(desc._type).toBe('allof')
    expect(desc.keys).toEqual(['Space', 'KeyW', 'ControlLeft'])
  })

  it('handles empty keys array', () => {
    const desc = AllOf()

    expect(desc._type).toBe('allof')
    expect(desc.keys).toEqual([])
  })
})

describe('Multiple interaction descriptors', () => {
  it('chains ChordedWith and Hold', () => {
    const companion = defineAction('shift', { type: 'button' })
    const pipeline = new InteractionPipeline([ChordedWith(companion, 'isPressed'), Hold({ holdTime: 500 })])

    const getActionState = (id: symbol) => {
      if (id === companion.id) {
        return { isPressed: true, isJustTriggered: false, isJustReleased: false, holdTime: 100 }
      }
      return null
    }

    // Should require both chord and hold
    pipeline.evaluate(true, 16, getActionState)
    const result = pipeline.evaluate(true, 500, getActionState)

    expect(result.isPressed).toBe(true)
  })

  it('OR-combines results from multiple Press descriptors', () => {
    const pipeline = new InteractionPipeline([Press(), Press()])

    const result = pipeline.evaluate(true, 16)

    expect(result.isPressed).toBe(true)
    expect(result.isJustTriggered).toBe(true)
  })
})
