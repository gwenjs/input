import { describe, it, expect, beforeEach } from 'vitest'
import { bind } from '../src/contexts/binding.js'
import { InputContext } from '../src/contexts/input-context.js'
import { defineInputContext } from '../src/contexts/define-input-context.js'
import { defineAction } from '../src/actions/define-action.js'
import type { InputContextDef } from '../src/contexts/define-input-context.js'

describe('bind', () => {
  it('creates a binding entry with action and source', () => {
    const action = defineAction('jump', { type: 'button' })
    const binding = bind(action, 'Space')
    
    expect(binding.action).toBe(action)
    expect(binding.source).toBe('Space')
    expect(binding.processors).toEqual([])
    expect(binding.interactions).toEqual([])
  })

  it('creates binding with processors', () => {
    const action = defineAction('aim', { type: 'axis1d' })
    const processors = [{ _type: 'scale' as const, factor: 2 }]
    const binding = bind(action, 'mouse:x', { processors })
    
    expect(binding.processors).toEqual(processors)
  })

  it('creates binding with interactions', () => {
    const action = defineAction('fire', { type: 'button' })
    const interactions = [{ _type: 'hold' as const, duration: 500 }]
    const binding = bind(action, 'Space', { interactions })
    
    expect(binding.interactions).toEqual(interactions)
  })

  it('creates binding with both processors and interactions', () => {
    const action = defineAction('charge', { type: 'axis1d' })
    const processors = [{ _type: 'clamp' as const, min: 0, max: 1 }]
    const interactions = [{ _type: 'press' as const }]
    const binding = bind(action, 0, { processors, interactions })
    
    expect(binding.processors).toEqual(processors)
    expect(binding.interactions).toEqual(interactions)
  })

  it('handles numeric source (gamepad button)', () => {
    const action = defineAction('shoot', { type: 'button' })
    const binding = bind(action, 0)
    
    expect(binding.source).toBe(0)
  })

  it('handles object source (composite)', () => {
    const action = defineAction('move', { type: 'axis2d' })
    const source = { _type: 'composite2d' as const, up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }
    const binding = bind(action, source)
    
    expect(binding.source).toEqual(source)
  })
})

describe('InputContext', () => {
  let context: InputContext

  beforeEach(() => {
    context = new InputContext()
  })

  it('initializes with no registered contexts', () => {
    expect(context.getAllRegistered()).toHaveLength(0)
    expect(context.activeContextNames).toHaveLength(0)
  })

  it('registers a context definition', () => {
    const def: InputContextDef = {
      name: 'gameplay',
      priority: 10,
      bindings: [],
    }
    
    context.register(def)
    
    expect(context.getAllRegistered()).toHaveLength(1)
    expect(context.getAllRegistered()[0]).toBe(def)
  })

  it('registers multiple contexts', () => {
    const def1: InputContextDef = { name: 'gameplay', priority: 10, bindings: [] }
    const def2: InputContextDef = { name: 'menu', priority: 20, bindings: [] }
    
    context.register(def1)
    context.register(def2)
    
    expect(context.getAllRegistered()).toHaveLength(2)
  })

  it('activates a registered context', () => {
    const def: InputContextDef = { name: 'gameplay', priority: 10, bindings: [] }
    context.register(def)
    
    context.activate('gameplay')
    
    expect(context.activeContextNames).toContain('gameplay')
  })

  it('throws when activating unregistered context', () => {
    expect(() => context.activate('nonexistent')).toThrow()
  })

  it('deactivates an active context', () => {
    const def: InputContextDef = { name: 'gameplay', priority: 10, bindings: [] }
    context.register(def)
    context.activate('gameplay')
    
    context.deactivate('gameplay')
    
    expect(context.activeContextNames).not.toContain('gameplay')
  })

  it('does not throw when deactivating inactive context', () => {
    const def: InputContextDef = { name: 'gameplay', priority: 10, bindings: [] }
    context.register(def)
    
    expect(() => context.deactivate('gameplay')).not.toThrow()
  })

  it('does not throw when deactivating unregistered context', () => {
    expect(() => context.deactivate('nonexistent')).not.toThrow()
  })

  it('returns bindings for an action from active contexts', () => {
    const action = defineAction('jump', { type: 'button' })
    const binding = bind(action, 'Space')
    const def: InputContextDef = {
      name: 'gameplay',
      priority: 10,
      bindings: [binding],
    }
    
    context.register(def)
    context.activate('gameplay')
    
    const bindings = context.getBindingsForAction(action)
    expect(bindings).toHaveLength(1)
    expect(bindings[0]).toBe(binding)
  })

  it('returns empty array for action with no bindings', () => {
    const action = defineAction('jump', { type: 'button' })
    const def: InputContextDef = { name: 'gameplay', priority: 10, bindings: [] }
    
    context.register(def)
    context.activate('gameplay')
    
    const bindings = context.getBindingsForAction(action)
    expect(bindings).toHaveLength(0)
  })

  it('returns empty array when no contexts are active', () => {
    const action = defineAction('jump', { type: 'button' })
    const bindings = context.getBindingsForAction(action)
    expect(bindings).toHaveLength(0)
  })

  it('combines bindings from multiple active contexts', () => {
    const action = defineAction('jump', { type: 'button' })
    const binding1 = bind(action, 'Space')
    const binding2 = bind(action, 0)
    
    const def1: InputContextDef = { name: 'gameplay', priority: 10, bindings: [binding1] }
    const def2: InputContextDef = { name: 'alt', priority: 5, bindings: [binding2] }
    
    context.register(def1)
    context.register(def2)
    context.activate('gameplay')
    context.activate('alt')
    
    const bindings = context.getBindingsForAction(action)
    expect(bindings).toHaveLength(2)
  })

  it('orders active contexts by priority (higher first)', () => {
    const def1: InputContextDef = { name: 'low', priority: 5, bindings: [] }
    const def2: InputContextDef = { name: 'high', priority: 20, bindings: [] }
    const def3: InputContextDef = { name: 'medium', priority: 10, bindings: [] }
    
    context.register(def1)
    context.register(def2)
    context.register(def3)
    
    context.activate('low')
    context.activate('high')
    context.activate('medium')
    
    const names = context.activeContextNames
    expect(names[0]).toBe('high')
    expect(names[1]).toBe('medium')
    expect(names[2]).toBe('low')
  })

  it('allows activating the same context multiple times (idempotent)', () => {
    const def: InputContextDef = { name: 'gameplay', priority: 10, bindings: [] }
    context.register(def)
    
    context.activate('gameplay')
    context.activate('gameplay')
    context.activate('gameplay')
    
    expect(context.activeContextNames.filter(n => n === 'gameplay')).toHaveLength(1)
  })
})

describe('defineInputContext', () => {
  it('creates an input context definition with name and priority', () => {
    const def = defineInputContext('gameplay', { priority: 10, bindings: [] })
    
    expect(def.name).toBe('gameplay')
    expect(def.priority).toBe(10)
    expect(def.bindings).toEqual([])
  })

  it('creates context with bindings', () => {
    const action = defineAction('jump', { type: 'button' })
    const binding = bind(action, 'Space')
    
    const def = defineInputContext('gameplay', { priority: 10, bindings: [binding] })
    
    expect(def.bindings).toHaveLength(1)
    expect(def.bindings[0]).toBe(binding)
  })

  it('handles multiple bindings', () => {
    const action1 = defineAction('jump', { type: 'button' })
    const action2 = defineAction('move', { type: 'axis2d' })
    const bindings = [bind(action1, 'Space'), bind(action2, 'wasd')]
    
    const def = defineInputContext('gameplay', { priority: 5, bindings })
    
    expect(def.bindings).toHaveLength(2)
  })

  it('preserves priority value', () => {
    const def1 = defineInputContext('high', { priority: 100, bindings: [] })
    const def2 = defineInputContext('low', { priority: -10, bindings: [] })
    
    expect(def1.priority).toBe(100)
    expect(def2.priority).toBe(-10)
  })
})
