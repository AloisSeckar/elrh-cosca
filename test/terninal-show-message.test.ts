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
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['Hello!', '\n'])
  })

  test('should write message + TWO newlines', () => {
    showMessage({ message: 'Hello!', linesAfter: 1 })
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['Hello!', '\n', '\n'])
  })

  test('should write newlines BEFORE the message', () => {
    showMessage({ message: 'Hello!', linesBefore: 2 })
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['\n', '\n', 'Hello!', '\n'])
  })

  test.each([0, -1])('should write no leading newlines when linesBefore is %i', (linesBefore) => {
    showMessage({ message: 'Hello!', linesBefore })
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['Hello!', '\n'])
  })

  test.each([0, -1])('should write message + ONE newline when linesAfter is %i', (linesAfter) => {
    showMessage({ message: 'Hello!', linesAfter })
    expect(spy.mock.calls.map((c: any[]) => c[0])).toEqual(['Hello!', '\n'])
  })
})
