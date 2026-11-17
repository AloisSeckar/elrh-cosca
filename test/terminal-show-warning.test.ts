import { afterEach, describe, expect, test, vi } from 'vitest'
import { showMessage } from '../src/terminal/show-message'
import { showWarning } from '../src/main'

vi.mock('../src/terminal/show-message', async () => (await import('./cosca-test-mocks')).mockShowMessage())

describe('Test showWarning terminal helper', () => {

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('should be defined', () => {
    expect(showWarning).toBeDefined()
  })

  test('should call showMessage with yellow color for a plain string', () => {
    showWarning('Hello!')
    expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', color: 'yellow' })
  })

  test('should call showMessage with yellow color and pass other options', () => {
    showWarning({ message: 'Hello!', linesBefore: 1, linesAfter: 2 })
    expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', linesBefore: 1, linesAfter: 2, color: 'yellow' })
  })

  test('should prefer custom color over the default one', () => {
    showWarning({ message: 'Hello!', color: 'magenta' })
    expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', color: 'magenta' })
  })
})
