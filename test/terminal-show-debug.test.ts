import { PassThrough } from 'node:stream'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { showMessage } from '../src/terminal/show-message'
import { showDebug } from '../src/main'

vi.mock('../src/terminal/show-message', async () => (await import('./cosca-test-mocks')).mockShowMessage())

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
    const output = new PassThrough()
    try {
      showDebug({ message: 'Hello!', output })
      expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', output, color: 'gray' })
    } finally {
      output.destroy()
    }
  })

  test('should prefer custom color over the default one', () => {
    showDebug({ message: 'Hello!', color: 'magenta' })
    expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', color: 'magenta' })
  })
})
