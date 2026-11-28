import { PassThrough } from 'node:stream'
import { CANCEL_SYMBOL, cancel, multiselect } from '@clack/prompts'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { promptQuestionMulti } from '../src/_private/prompt-question-multi'

vi.mock('@clack/prompts', async () => {
  const actual = await vi.importActual<typeof import('@clack/prompts')>('@clack/prompts')
  return {
    ...actual,
    multiselect: vi.fn(),
    cancel: vi.fn(),
  }
})

describe('Test private promptQuestionMulti helper', () => {

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('should throw when multiChoice is empty', async () => {
    await expect(promptQuestionMulti({ question: 'Pick:', multiChoice: [] }))
      .rejects.toThrow('multiChoice must contain at least one option')
    expect(multiselect).not.toHaveBeenCalled()
  })

  test('should call Clack multiselect with 1-based options and required false', async () => {
    vi.mocked(multiselect).mockResolvedValueOnce([1])
    expect(await promptQuestionMulti({ question: 'Pick:', multiChoice: ['Alpha', 'Beta'] })).toEqual([1])
    expect(multiselect).toHaveBeenCalledWith({
      message: 'Pick:',
      options: [
        { value: 1, label: 'Alpha' },
        { value: 2, label: 'Beta' },
      ],
      required: false,
      input: undefined,
      output: undefined,
    })
  })

  test('should return empty array when nothing is selected', async () => {
    vi.mocked(multiselect).mockResolvedValueOnce([])
    expect(await promptQuestionMulti({ question: 'Pick:', multiChoice: ['A', 'B'] })).toEqual([])
  })

  test('should return selected 1-based numbers sorted in ascending order', async () => {
    vi.mocked(multiselect).mockResolvedValueOnce([3, 1, 2])
    expect(await promptQuestionMulti({ question: 'Pick:', multiChoice: ['A', 'B', 'C'] })).toEqual([1, 2, 3])
  })

  test('should forward custom streams and style the question when color is set', async () => {
    const previous = process.env.FORCE_COLOR
    process.env.FORCE_COLOR = '1'
    const input = new PassThrough()
    const output = new PassThrough()
    try {
      vi.mocked(multiselect).mockResolvedValueOnce([1])
      expect(await promptQuestionMulti({
        question: 'Pick:',
        multiChoice: ['A'],
        input,
        output,
        color: 'red',
      })).toEqual([1])
      expect(multiselect).toHaveBeenCalledWith({
        message: '\u001b[31mPick:\u001b[39m',
        options: [{ value: 1, label: 'A' }],
        required: false,
        input,
        output,
      })
    } finally {
      input.destroy()
      output.destroy()
      if (previous === undefined) delete process.env.FORCE_COLOR
      else process.env.FORCE_COLOR = previous
    }
  })

  test('should cancel and exit with code 0 when prompt is cancelled', async () => {
    const output = new PassThrough()
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit')
    }) as never)
    try {
      vi.mocked(multiselect).mockResolvedValueOnce(CANCEL_SYMBOL)
      await expect(promptQuestionMulti({ question: 'Pick:', multiChoice: ['A'], output })).rejects.toThrow('process.exit')
      expect(cancel).toHaveBeenCalledWith('User abort', { output })
      expect(exitSpy).toHaveBeenCalledWith(0)
    } finally {
      exitSpy.mockRestore()
      output.destroy()
    }
  })
})
