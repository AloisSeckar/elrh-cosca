import { beforeEach, describe, expect, test } from 'vitest'
import { resolvePackagePath } from '../src/main'
import { getConsoleSpy, getPromptSpy } from './cosca-test-utils'

describe('Test resolvePackagePath function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(resolvePackagePath).toBeDefined()
  })

  test('should resolve current package into local folder', () => {
    const path = resolvePackagePath('elrh-cosca')
    expect(path).toBeDefined()
    expect(path).toMatch(/elrh-cosca$/)
  })

  // vitest must be installed (but this is a requirement for running vitest tests)
  test('should resolve normal package into node_modules', () => {
    const path = resolvePackagePath('vitest')
    expect(path).toBeDefined()
    expect(path).toMatch(/node_modules[\\/]vitest$/)
  })

  // @types/node must be installed (but this should be part of the installation too)
  test('should resolve scoped package into node_modules', () => {
    const path = resolvePackagePath('@types/node')
    expect(path).toBeDefined()
    expect(path).toMatch(/node_modules[\\/]@types[\\/]node$/)
  })
})
