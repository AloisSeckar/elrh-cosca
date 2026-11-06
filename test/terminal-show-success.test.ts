import { afterEach, describe, expect, test, vi } from 'vitest'
import { showMessage } from '../src/terminal/show-message'
import { showSuccess } from '../src/main'

vi.mock('../src/terminal/show-message', () => ({ showMessage: vi.fn() }))

describe('Test showSuccess terminal helper', () => {

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('should be defined', () => {
    expect(showSuccess).toBeDefined()
  })

  test('should call showMessage with green color for a plain string', () => {
    showSuccess('Hello!')
    expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', color: 'green' })
  })

  test('should call showMessage with green color and pass other options', () => {
    showSuccess({ message: 'Hello!', linesBefore: 1, linesAfter: 2 })
    expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', linesBefore: 1, linesAfter: 2, color: 'green' })
  })
})
