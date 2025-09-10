import { beforeEach, describe, expect, test, vi } from 'vitest'
import { showMessage } from '../src/main'
import { getStdoutSpy } from './cosca-test-utils'

describe('Test `showMessage` terminal helper', () => {

  let spy: any
  beforeEach(() => {
    spy = getStdoutSpy()
  })
  
  test('should be defined', () => {
    expect(showMessage).toBeDefined()
  })

  test('should write message + ONE newline', () => {
    showMessage('Hello!')

    expect(spy).toHaveBeenCalledWith('Hello!')
    expect(spy).toHaveBeenCalledWith('\n')
    expect(spy).toHaveBeenCalledTimes(2) // 1 for message, 1 for newlines
  })

  test('should write message + TWO newlines', () => {
    showMessage('Hello!', 2)

    expect(spy).toHaveBeenCalledWith('Hello!')
    expect(spy).toHaveBeenCalledWith('\n')
    expect(spy).toHaveBeenCalledTimes(3) // 1 for message, 2 for newlines
  })

  test('should write message + NO newlines', () => {
    showMessage('Hello!', -1)

    expect(spy).toHaveBeenCalledWith('Hello!')
    expect(spy).not.toHaveBeenCalledWith('\n')
    expect(spy).toHaveBeenCalledTimes(1) // 1 for message, 0 for newlines
  })
})
