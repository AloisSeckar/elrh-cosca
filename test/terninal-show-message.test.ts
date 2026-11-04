import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { showMessage } from '../src/main'
import { getStdoutSpy } from './cosca-test-utils'

describe('Test showMessage terminal helper', () => {

  let spy: any
  beforeEach(() => {
    spy = getStdoutSpy()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })
  
  test('should be defined', () => {
    expect(showMessage).toBeDefined()
  })

  test('should write message + ONE newline', () => {
    showMessage({ message: 'Hello!' })

    expect(spy).toHaveBeenCalledWith('Hello!')
    expect(spy).toHaveBeenCalledWith('\n')
    expect(spy).toHaveBeenCalledTimes(2) // 1 for message, 1 for newlines
  })

  test('should write message + TWO newlines', () => {
    showMessage({ message: 'Hello!', linesAfter: 1 })

    expect(spy).toHaveBeenCalledWith('Hello!')
    expect(spy).toHaveBeenCalledWith('\n')
    expect(spy).toHaveBeenCalledTimes(3) // 1 for message, 1 own newline, 1 extra newline
  })

  test.each([0, -1])('should write message + ONE newline when linesAfter is %i', (linesAfter) => {
    showMessage({ message: 'Hello!', linesAfter })

    expect(spy).toHaveBeenCalledWith('Hello!')
    expect(spy).toHaveBeenCalledWith('\n')
    expect(spy).toHaveBeenCalledTimes(2) // 1 for message, 1 own newline
  })
})
