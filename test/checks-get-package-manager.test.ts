import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { getPackageManager } from '../src/main'

describe('Test getPackageManager checker', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
    delete (globalThis as any).Deno
    delete (globalThis as any).Bun
  })

  test('should detect npm from user agent', () => {
    process.env.npm_config_user_agent = 'npm/8.19.2 node/v18.12.1 linux x64 workspaces/false'
    expect(getPackageManager()).toBe('npm')
  })

  test('should detect yarn from user agent', () => {
    process.env.npm_config_user_agent = 'yarn/1.22.19 npm/? node/v18.12.1 linux x64'
    expect(getPackageManager()).toBe('yarn')
  })

  test('should detect pnpm from user agent', () => {
    process.env.npm_config_user_agent = 'pnpm/7.14.0 npm/? node/v18.12.1 linux x64'
    expect(getPackageManager()).toBe('pnpm')
  })

  test('should detect bun from user agent', () => {
    process.env.npm_config_user_agent = 'bun/0.8.1 npm/? node/v18.12.1 linux x64'
    expect(getPackageManager()).toBe('bun')
  })

  test('should detect deno from global', () => {
    // Mock Deno global
    (globalThis as any).Deno = { version: { deno: '1.28.0' } }
    expect(getPackageManager()).toBe('deno')
  })

  test('should detect bun from global', () => {
    // Mock Bun global  
    (globalThis as any).Bun = { version: '0.8.1' }
    expect(getPackageManager()).toBe('bun')
  })

  test('should fallback to npm when no user agent', () => {
    delete process.env.npm_config_user_agent
    expect(getPackageManager()).toBe('npm')
  })

  test('should fallback to npm with unknown user agent', () => {
    process.env.npm_config_user_agent = 'unknown-manager/1.0.0'
    expect(getPackageManager()).toBe('npm')
  })

})