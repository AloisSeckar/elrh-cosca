import { PassThrough } from 'node:stream'
import { log } from '@clack/prompts'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { showMessage } from '../src/main'
import { getStdoutSpy } from './cosca-test-utils'

describe('Test showMessage terminal helper', () => {

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('should be defined', () => {
    expect(showMessage).toBeDefined()
  })

  test('should write message to stdout via Clack log.message', () => {
    const logSpy = vi.spyOn(log, 'message')
    const stdoutSpy = getStdoutSpy()
    showMessage({ message: 'Hello!' })
    expect(logSpy).toHaveBeenCalledWith('Hello!', { output: process.stdout })
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('Hello!'))
  })

  test('should accept a plain string', () => {
    const logSpy = vi.spyOn(log, 'message')
    getStdoutSpy()
    showMessage('Hello!')
    expect(logSpy).toHaveBeenCalledWith('Hello!', { output: process.stdout })
  })

  test('should style the message when color is set', () => {
    const previous = process.env.FORCE_COLOR
    process.env.FORCE_COLOR = '1'
    const logSpy = vi.spyOn(log, 'message')
    getStdoutSpy()
    try {
      showMessage({ message: 'Hello!', color: 'red' })
    } finally {
      if (previous === undefined) delete process.env.FORCE_COLOR
      else process.env.FORCE_COLOR = previous
    }
    expect(logSpy).toHaveBeenCalledWith('\u001b[31mHello!\u001b[39m', { output: process.stdout })
  })

  test('should write to a custom output stream instead of stdout', () => {
    const stdoutSpy = getStdoutSpy()
    const output = new PassThrough()
    try {
      showMessage({ message: 'Hello!', output })
      expect(output.read().toString()).toContain('Hello!')
      expect(stdoutSpy).not.toHaveBeenCalled()
    } finally {
      output.destroy()
    }
  })
})
