import { PassThrough } from 'node:stream'
import { log } from '@clack/prompts'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { showError } from '../src/main'
import { getStderrSpy } from './cosca-test-utils'

describe('Test showError terminal helper', () => {

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('should be defined', () => {
    expect(showError).toBeDefined()
  })

  test('should write error message to stderr via Clack log.error', () => {
    const logSpy = vi.spyOn(log, 'error')
    const stderrSpy = getStderrSpy()
    showError({ message: 'Error!' })
    expect(logSpy).toHaveBeenCalledWith('Error!', { output: process.stderr })
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Error!'))
  })

  test('should accept a plain string', () => {
    const logSpy = vi.spyOn(log, 'error')
    getStderrSpy()
    showError('Error!')
    expect(logSpy).toHaveBeenCalledWith('Error!', { output: process.stderr })
  })

  test('should style the message when color is set', () => {
    const previous = process.env.FORCE_COLOR
    process.env.FORCE_COLOR = '1'
    const logSpy = vi.spyOn(log, 'error')
    getStderrSpy()
    try {
      showError({ message: 'Error!', color: 'yellow' })
    } finally {
      if (previous === undefined) delete process.env.FORCE_COLOR
      else process.env.FORCE_COLOR = previous
    }
    expect(logSpy).toHaveBeenCalledWith('\u001b[33mError!\u001b[39m', { output: process.stderr })
  })

  test('should write to a custom output stream instead of stderr', () => {
    const stderrSpy = getStderrSpy()
    const output = new PassThrough()
    try {
      showError({ message: 'Error!', output })
      expect(output.read().toString()).toContain('Error!')
      expect(stderrSpy).not.toHaveBeenCalled()
    } finally {
      output.destroy()
    }
  })
})
