import { beforeEach, describe, expect, test, vi} from 'vitest'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { updateConfigFile } from '../src/main'
import { checkPath } from '../src/_private/check-path'
import { getStdoutSpy, setPromptSpy, readNormalizedFile, getPromptUserSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test updateConfigFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getStdoutSpy()
  })

  test('should be defined', () => {
    expect(updateConfigFile).toBeDefined()
  })

  test('should fail when path check fails', async () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    await expect(updateConfigFile({ targetPath: 'a', newConfig: { testKey1: 0 }, force: true })).rejects.toThrow(/Invalid path/)
  })

  test('should update config wrapped in a function call', async () => {
    const file = join(wd, 'config-function-call.ts')
    writeFileSync(file, 'export default defineConfig({\n  testKey1: 1,\n})\n')
    await updateConfigFile({ targetPath: file, newConfig: { testKey2: 2 }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))
    expect(readFileSync(file, 'utf8')).toMatch(/testKey2: 2/)
  })

  test('should merge arrays in config as unique union', async () => {
    const file = join(wd, 'config-array.ts')
    writeFileSync(file, 'export default {\n  list: [\'a\'],\n}\n')
    await updateConfigFile({ targetPath: file, newConfig: { list: ['a', 'b'], other: ['c'] }, force: true })

    const content = readFileSync(file, 'utf8')
    expect(content.match(/['"]a['"]/g)).toHaveLength(1)
    expect(content).toMatch(/['"]b['"]/)
    expect(content).toMatch(/other:\s*\[\s*['"]c['"]/)
  })

  test('should fail when function call has no config object', async () => {
    const file = join(wd, 'config-no-args.ts')
    writeFileSync(file, 'export default defineConfig()\n')
    await expect(updateConfigFile({ targetPath: file, newConfig: { testKey1: 0 }, force: true })).rejects.toThrow(/Could not access config object/)
  })

  test('should fail when config export is not an object', async () => {
    const file = join(wd, 'config-primitive.ts')
    writeFileSync(file, 'export default 5\n')
    await expect(updateConfigFile({ targetPath: file, newConfig: { testKey1: 0 }, force: true })).rejects.toThrow(/Could not access config object/)
  })

  test('should fail when module has no suitable export', async () => {
    const file = join(wd, 'config-no-export.ts')
    writeFileSync(file, 'const internal = { testKey1: 1 }\n')
    await expect(updateConfigFile({ targetPath: file, newConfig: { testKey1: 0 }, force: true })).rejects.toThrow(/No suitable config export found/)
  })

  test('should fail when module has multiple named exports and no default export', async () => {
    const file = join(wd, 'config-multi-named.ts')
    writeFileSync(file, 'export const a = { x: 1 }\nexport const b = { y: 2 }\n')
    await expect(updateConfigFile({ targetPath: file, newConfig: { testKey1: 0 }, force: true })).rejects.toThrow(/No suitable config export found/)
  })

  test('should fail because of non-existent file', async () => {
    await expect(updateConfigFile({ targetPath: `${wd}/uknown`, newConfig: { testKey1: 0 }, force: true })).rejects.toThrow(/No .* found/)
  })

  test('should fail because of non-existent file when createMissing is false', async () => {
    await expect(updateConfigFile({ targetPath: `${wd}/uknown`, newConfig: { testKey1: 0 }, createMissing: false, force: true })).rejects.toThrow(/No .* found/)
  })

  test('should create non-existent file when createMissing is true', async () => {
    await updateConfigFile({ targetPath: `${wd}/new-config/created.ts`, newConfig: { testKey1: 'value', testKey2: { nestedKey: true } }, createMissing: true, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file created/))

    await expect(readNormalizedFile(wd, 'new-config/created.ts')).toMatchFileSnapshot('snapshots/created-config-file.ts')
  })

  test('should not create non-existent file when user declines', async () => {
    setPromptSpy(['y', 'n'])
    await updateConfigFile({ targetPath: `${wd}/new-config/declined.ts`, newConfig: { testKey1: 'value' }, createMissing: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Creation of .* skipped/))
    expect(existsSync(join(wd, 'new-config/declined.ts'))).toBe(false)
  })

  test('should create non-existent file when user confirms', async () => {
    setPromptSpy(['y', 'y'])
    await updateConfigFile({ targetPath: `${wd}/new-config/confirmed.ts`, newConfig: { testKey1: 'value', testKey2: { nestedKey: true } }, createMissing: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file created/))
    await expect(readNormalizedFile(wd, 'new-config/confirmed.ts')).toMatchFileSnapshot('snapshots/created-config-file.ts')
  })

  test('should update config wrapped in defineConfig (function call export)', async () => {
    const file = join(wd, 'config-define.ts')
    writeFileSync(file, [
      "import { defineConfig } from 'vite'",
      '',
      'export default defineConfig({',
      '  // preserved comment',
      "  stringKey: 'value',",
      '  nested: {',
      '    enabled: true,',
      '  },',
      '})',
      '',
    ].join('\n'))

    await updateConfigFile({
      targetPath: file,
      newConfig: { testKey1: 'added', nested: { extra: 42 } },
      force: true,
    })
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    const updated = readFileSync(file, 'utf8')
    expect(updated).toContain('// preserved comment')
    expect(updated).toContain("testKey1: 'added',")
    expect(updated).toContain('enabled: true,')
    expect(updated).toContain('extra: 42,')

    await updateConfigFile({
      targetPath: file,
      newConfig: { testKey1: 'added', nested: { extra: 42 } },
      force: true,
    })
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))
  })

  test('should update CommonJS module.exports config', async () => {
    await updateConfigFile({
      targetPath: `${wd}/config-file.cjs`,
      newConfig: { testKey1: 0, nested: { a: 'x' } },
      force: true,
    })
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    const updated = readNormalizedFile(wd, 'config-file.cjs')
    expect(updated).toBe([
      'module.exports = {',
      "    key: 'value',",
      '    testKey1: 0,',
      '    nested: {',
      "      a: 'x',",
      '    },',
      '}',
      '',
    ].join('\n'))

    await updateConfigFile({
      targetPath: `${wd}/config-file.cjs`,
      newConfig: { testKey1: 0, nested: { a: 'x' } },
      force: true,
    })
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))
  })

  test('should add the new key and values (default export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-default.ts`, newConfig: { testKey1: 'value', testKey2: 2, testKey3: true }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-1.ts')
  })

  test('should not add new same value in key again (default export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-default.ts`, newConfig: { testKey1: 'value' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-1.ts')
  })

  test('should add the new value under existing key (default export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-default.ts`, newConfig: { testKey4: 'value2' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-2.ts')
  })

  test('should add the nested key under existing (default export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-default.ts`, newConfig: { testKey4: { nestedKey: 'nested' } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-3.ts')
  })

  test('should not add the nested key under existing again (default export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-default.ts`, newConfig: { testKey4: { nestedKey: 'nested' } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-3.ts')
  })

  test('should replace nested key (default export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-default.ts`, newConfig: { testKey4: { nestedKey: { deeper: true } } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-4.ts')
  })

  test('should add the new key and values (named export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-named.ts`, newConfig: { testKey1: 'value', testKey2: 2, testKey3: true }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-1.ts')
  })

  test('should not add new same value in key again (named export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-named.ts`, newConfig: { testKey1: 'value' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-1.ts')
  })

  test('should add the new value under existing key (named export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-named.ts`, newConfig: { testKey4: 'value2' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-2.ts')
  })

  test('should add the nested key under existing (named export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-named.ts`, newConfig: { testKey4: { nestedKey: 'nested' } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-3.ts')
  })

  test('should not add the nested key under existing again (named export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-named.ts`, newConfig: { testKey4: { nestedKey: 'nested' } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-3.ts')
  })

  test('should replace nested key (named export)', async () => {
    await updateConfigFile({ targetPath: `${wd}/config-file-named.ts`, newConfig: { testKey4: { nestedKey: { deeper: true } } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-4.ts')
  })
  
  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await updateConfigFile({ targetPath: `${wd}/config-file-named.ts`, newConfig: { testKey5: 0 } })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-4.ts')
  })
  
  test('should not log when silent is true', async () => {
    spy.mockClear()
    const file = join(wd, 'config-silent.ts')
    writeFileSync(file, 'export default {\n  a: 1,\n}\n')
    await updateConfigFile({ targetPath: file, newConfig: { b: 2 }, force: true, silent: true })
    expect(spy).not.toHaveBeenCalled()
    expect(readFileSync(file, 'utf8')).toMatch(/b: 2/)

    setPromptSpy(['n'])
    await updateConfigFile({ targetPath: file, newConfig: { c: 3 }, silent: true })
    expect(spy).not.toHaveBeenCalled()
    expect(readFileSync(file, 'utf8')).not.toMatch(/c: 3/)
  })

  test('should log when silent is false', async () => {
    spy.mockClear()
    const file = join(wd, 'config-silent-2.ts')
    writeFileSync(file, 'export default {\n  b: 2,\n}\n')
    await updateConfigFile({ targetPath: file, newConfig: { b: 2 }, force: true, silent: false })
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/already up to date/))
  })

  // test prompting
  
  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateConfigFile({ targetPath: `a`, newConfig: { testKey5: 0 } })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will update/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateConfigFile({ targetPath: `a`, newConfig: { testKey5: 0 }, force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

})
