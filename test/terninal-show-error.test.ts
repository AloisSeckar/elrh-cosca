import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { showError } from '../src/main'
import { getStderrSpy } from './cosca-test-utils'

describe('Test showError terminal helper', () => {

  let spy: any
  beforeEach(() => {
    spy = getStderrSpy()
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })
  
  test('should be defined', () => {
    expect(showError).toBeDefined()
  })

  test('should write message + ONE newline', () => {
    showError({ message: 'Error!' })

    expect(spy).toHaveBeenCalledWith('Error!')
    expect(spy).toHaveBeenCalledWith('\n')
    expect(spy).toHaveBeenCalledTimes(2) // 1 for message, 1 for newlines
  })

  test('should write message + TWO newlines', () => {
    showError({ message: 'Error!', linesAfter: 2 })

    expect(spy).toHaveBeenCalledWith('Error!')
    expect(spy).toHaveBeenCalledWith('\n')
    expect(spy).toHaveBeenCalledTimes(3) // 1 for message, 2 for newlines
  })

  test.each([0, -1])('should write message + NO newlines when linesAfter is %i', (linesAfter) => {
    showError({ message: 'Error!', linesAfter })

    expect(spy).toHaveBeenCalledWith('Error!')
    expect(spy).not.toHaveBeenCalledWith('\n')
    expect(spy).toHaveBeenCalledTimes(1) // 1 for message, 0 for newlines
  })
})
