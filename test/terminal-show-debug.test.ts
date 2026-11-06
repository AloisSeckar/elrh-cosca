import { afterEach, describe, expect, test, vi } from 'vitest'
import { showMessage } from '../src/terminal/show-message'
import { showDebug } from '../src/main'

vi.mock('../src/terminal/show-message', () => ({ showMessage: vi.fn() }))

describe('Test showDebug terminal helper', () => {

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('should be defined', () => {
    expect(showDebug).toBeDefined()
  })

  test('should call showMessage with gray color for a plain string', () => {
    showDebug('Hello!')
    expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', color: 'gray' })
  })

  test('should call showMessage with gray color and pass other options', () => {
    showDebug({ message: 'Hello!', linesBefore: 1, linesAfter: 2 })
    expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', linesBefore: 1, linesAfter: 2, color: 'gray' })
  })
})
