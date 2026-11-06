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
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['Error!', '\n'])
  })

  test('should accept a plain string', () => {
    showError('Error!')
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['Error!', '\n'])
  })

  test('should write message + TWO newlines', () => {
    showError({ message: 'Error!', linesAfter: 1 })
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['Error!', '\n', '\n'])
  })

  test('should write newlines BEFORE the message', () => {
    showError({ message: 'Error!', linesBefore: 2 })
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['\n', '\n', 'Error!', '\n'])
  })

  test.each([0, -1])('should write no leading newlines when linesBefore is %i', (linesBefore) => {
    showError({ message: 'Error!', linesBefore })
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['Error!', '\n'])
  })

  test.each([0, -1])('should write message + ONE newline when linesAfter is %i', (linesAfter) => {
    showError({ message: 'Error!', linesAfter })
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['Error!', '\n'])
  })
})
