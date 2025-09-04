import { beforeEach, describe, expect, test } from 'vitest'
import { promptUser } from '../src/main'
import { getConsoleSpy, setPromptSpy } from './cosca-test-utils'

describe('Test promptUser function', () => {

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
})
