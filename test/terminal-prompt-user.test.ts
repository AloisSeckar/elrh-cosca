import { beforeEach, describe, expect, test } from 'vitest'
import { promptUser } from '../src/main'
import { getConsoleSpy, setPromptSpy } from './cosca-test-utils'

describe('Test promptUser terminal helper', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(promptUser).toBeDefined()
  })

  test('should prompt the user for input and return true', async () => {
    setPromptSpy(['y'])
    expect(await promptUser('Is it today?')).toBe(true)
  })
  
  
  test('should prompt the user for input and return false', async () => {
    setPromptSpy(['n'])
    expect(await promptUser('Is it today?')).toBe(false)
  })

  test('should accept different variants of yes', async () => {
    setPromptSpy(['Y'])
    expect(await promptUser('Is it today?')).toBe(true)
    setPromptSpy(['yes'])
    expect(await promptUser('Is it today?')).toBe(true)
    setPromptSpy(['Yes'])
    expect(await promptUser('Is it today?')).toBe(true)
    setPromptSpy(['YES'])
    expect(await promptUser('Is it today?')).toBe(true)
    // should not accept those though
    setPromptSpy(['Ye'])
    expect(await promptUser('Is it today?')).toBe(false)
    setPromptSpy(['Yess'])
    expect(await promptUser('Is it today?')).toBe(false)
  })
})
