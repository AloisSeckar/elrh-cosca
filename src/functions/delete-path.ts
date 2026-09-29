import type { DeletePathOptions } from '../types/functions.js'
import { resolve } from 'node:path'
import { existsSync, rmSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Deletes a file or a directory (recursively) from FS.
 * 
 * @param {DeletePathOptions} opts - Options for this operation.
 * @param {string} opts.targetPath - The path to the file or directory to delete (relative to CWD).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid or the path failed to be deleted.
 */
export async function deletePath(opts: DeletePathOptions): Promise<void> {
  const { targetPath, force = false, prompt = '' } = opts
  const shouldUpdate = force || await promptUser({ question: prompt || `This will delete '${targetPath}'. Continue?` })
  if (shouldUpdate) {
    const check = checkPath(targetPath)
    if (!check.valid) {
      throw new Error(check.error)
    }

    const fullPath = resolve(process.cwd(), targetPath)
    
    if (existsSync(fullPath)) {
      rmSync(fullPath, { recursive: true, force: true })

      if (!existsSync(fullPath)) {
        console.log(`'${targetPath}' deleted from project.`)
      } else {
        throw new Error(`Failed to delete '${targetPath}'.`)
      }
    } else {
      console.log(`'${targetPath}' does not exist — nothing to delete.`)
    }
  } else {
    console.log(`Removing '${targetPath}' skipped.`)
  }
}
