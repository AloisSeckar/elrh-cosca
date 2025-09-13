import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { getEnvValue } from '../src/main'

describe('Test getEnvValue util function', () => {

  test('should be defined', () => {
    expect(getEnvValue).toBeDefined()
  })

  test('should return value for existing keys', () => {
    const valueA = getEnvValue('A')
    expect(valueA).toBe('1')
    const valueB = getEnvValue('B')
    expect(valueB).toBe('2')
    const valueC = getEnvValue('C')
    expect(valueC).toBe('3')
    const valueD = getEnvValue('D')
    expect(valueD).toBe('4.56')
  })

  test('should return value for existing value in custom .env file', () => {
    const value = getEnvValue('A', 'test/fixtures/.env.test')
    expect(value).toBe('ABC')
  })

  test('should return undefined for non-existing value in custom .env file', () => {
    const value = getEnvValue('B', 'test/fixtures/.env.test')
    expect(value).toBeUndefined()
  })

  test('should return undefined from non-existing .env file', () => {
    const value = getEnvValue('A', 'test/fixtures/.env.none')
    expect(value).toBeUndefined()
  })

})