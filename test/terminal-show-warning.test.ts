import { PassThrough } from 'node:stream'
import { log } from '@clack/prompts'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { showWarning } from '../src/main'
import { getStdoutSpy } from './cosca-test-utils'

describe('Test showWarning terminal helper', () => {

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('should be defined', () => {
    expect(showWarning).toBeDefined()
  })

  test('should call Clack log.warn for a plain string', () => {
    const logSpy = vi.spyOn(log, 'warn')
    getStdoutSpy()
    showWarning('Hello!')
    expect(logSpy).toHaveBeenCalledWith('Hello!', { output: process.stdout })
  })

  test('should pass custom output stream to Clack log.warn', () => {
    const logSpy = vi.spyOn(log, 'warn')
    const output = new PassThrough()
    try {
      showWarning({ message: 'Hello!', output })
      expect(logSpy).toHaveBeenCalledWith('Hello!', { output })
      expect(output.read().toString()).toContain('Hello!')
    } finally {
      output.destroy()
    }
  })

  test('should style the message when custom color is set', () => {
    const previous = process.env.FORCE_COLOR
    process.env.FORCE_COLOR = '1'
    const logSpy = vi.spyOn(log, 'warn')
    getStdoutSpy()
    try {
      showWarning({ message: 'Hello!', color: 'magenta' })
    } finally {
      if (previous === undefined) delete process.env.FORCE_COLOR
      else process.env.FORCE_COLOR = previous
    }
    expect(logSpy).toHaveBeenCalledWith('\u001b[35mHello!\u001b[39m', { output: process.stdout })
  })
})
