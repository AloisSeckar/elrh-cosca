import { vi, type Mock } from 'vitest'

// Mock factories for `vi.mock`. As `vi.mock` is hoisted, import this file dynamically inside the factory:
// vi.mock('../src/_private/check-path', async () => (await import('./cosca-test-mocks')).mockCheckPath())

/**
 * Mock factory of `../src/_private/check-path`. The `checkPath` function must be mocked
 * as it disallows paths outside of CWD, which is not possible because tests run in a temporary folder.
 * @returns module mock where `checkPath` accepts every path
 */
export function mockCheckPath() {
  return {
    checkPath: vi.fn((_path: string) => {
      return { valid: true }
    })
  }
}

/**
 * Mock factory of `../src/terminal/show-message`.
 * @returns module mock where `showMessage` does nothing
 */
export function mockShowMessage(): { showMessage: Mock } {
  return { showMessage: vi.fn() }
}

/**
 * Mock factory of `../src/_private/fetch-file`. Wraps the real `fetchFile` so single calls can be stubbed.
 * @returns module mock with the spy-wrapped `fetchFile`
 */
export async function mockFetchFile() {
  const actual = await vi.importActual<typeof import('../src/_private/fetch-file')>('../src/_private/fetch-file')
  return { ...actual, fetchFile: vi.fn(actual.fetchFile) }
}

/**
 * Mock factory of `node:fs`. Wraps the real implementations of the given functions so single calls can be stubbed.
 * @param names names of the `node:fs` functions to wrap
 * @returns module mock with the spy-wrapped functions
 */
export async function mockNodeFs(...names: (keyof typeof import('node:fs'))[]) {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  const wrapped = Object.fromEntries(names.map(name => [name, vi.fn(actual[name] as (...args: unknown[]) => unknown)]))
  return { ...actual, ...wrapped }
}
