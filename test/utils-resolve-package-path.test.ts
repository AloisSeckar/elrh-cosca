import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { resolvePackagePath } from '../src/main'
import { getConsoleSpy } from './cosca-test-utils'

describe('Test resolvePackagePath util function', () => {

  test('should be defined', () => {
    expect(resolvePackagePath).toBeDefined()
  })

  test('should resolve current package into local folder', () => {
    const path = resolvePackagePath({ packageName: 'elrh-cosca' })
    expect(path).toBeDefined()
    expect(path).toMatch(/elrh-cosca$/)
  })

  // vitest must be installed (but this is a requirement for running vitest tests)
  test('should resolve normal package into node_modules', () => {
    const path = resolvePackagePath({ packageName: 'vitest' })
    expect(path).toBeDefined()
    expect(path).toMatch(/node_modules[\\/]vitest$/)
  })

  // @types/node must be installed (but this should be part of the installation too)
  test('should resolve scoped package into node_modules', () => {
    const path = resolvePackagePath({ packageName: '@types/node' })
    expect(path).toBeDefined()
    expect(path).toMatch(/node_modules[\\/]@types[\\/]node$/)
  })

  test('should throw for non-existent package', () => {
    const spy = getConsoleSpy('error')
    expect(() => resolvePackagePath({ packageName: 'non-existent-package' })).toThrow(/Cannot find package "non-existent-package"/)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  test('should throw when CWD has no package.json nor node_modules', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cosca-pkg-'))
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(directory)
    const spy = getConsoleSpy('error')
    try {
      expect(() => resolvePackagePath({ packageName: 'vitest' })).toThrow(/Cannot find package "vitest"/)
      expect(spy).toHaveBeenCalledTimes(2)
    } finally {
      spy.mockRestore()
      cwdSpy.mockRestore()
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
