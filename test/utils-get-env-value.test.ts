import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { getEnvValue } from '../src/main'

describe('Test getEnvValue util function', () => {

  test('should be defined', () => {
    expect(getEnvValue).toBeDefined()
  })

  test('should return value for existing keys', () => {
    const valueA = getEnvValue({ key: 'A' })
    expect(valueA).toBe('1')
    const valueB = getEnvValue({ key: 'B' })
    expect(valueB).toBe('2')
    const valueC = getEnvValue({ key: 'C' })
    expect(valueC).toBe('3')
    const valueD = getEnvValue({ key: 'D' })
    expect(valueD).toBe('4.56')
  })

  test('should return value for existing value in custom .env file', () => {
    const value = getEnvValue({ key: 'A', envFilePath: 'test/fixtures/.env.test' })
    expect(value).toBe('ABC')
  })

  test('should resolve the default .env path at call time', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cosca-env-'))
    const cwdSpy = vi.spyOn(process, 'cwd')
    try {
      expect(getEnvValue({ key: 'A' })).toBe('1')
      writeFileSync(join(directory, '.env'), 'A=changed\n')
      cwdSpy.mockReturnValue(directory)
      expect(getEnvValue({ key: 'A' })).toBe('changed')
      expect(getEnvValue({ key: 'A', envFilePath: undefined })).toBe('changed')
    } finally {
      cwdSpy.mockRestore()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('should return undefined for non-existing value in custom .env file', () => {
    const value = getEnvValue({ key: 'B', envFilePath: 'test/fixtures/.env.test' })
    expect(value).toBeUndefined()
  })

  test('should return undefined from non-existing .env file', () => {
    const value = getEnvValue({ key: 'A', envFilePath: 'test/fixtures/.env.none' })
    expect(value).toBeUndefined()
  })

})