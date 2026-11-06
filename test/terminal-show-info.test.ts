import { afterEach, describe, expect, test, vi } from 'vitest'
import { showMessage } from '../src/terminal/show-message'
import { showInfo } from '../src/main'

vi.mock('../src/terminal/show-message', () => ({ showMessage: vi.fn() }))

describe('Test showInfo terminal helper', () => {

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('should be defined', () => {
    expect(showInfo).toBeDefined()
  })

  test('should call showMessage with white color for a plain string', () => {
    showInfo('Hello!')
    expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', color: 'white' })
  })

  test('should call showMessage with white color and pass other options', () => {
    showInfo({ message: 'Hello!', linesBefore: 1, linesAfter: 2 })
    expect(showMessage).toHaveBeenCalledWith({ message: 'Hello!', linesBefore: 1, linesAfter: 2, color: 'white' })
  })
})
