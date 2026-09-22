import type { DeletePathOptions } from '../types/functions.js'
import { resolve } from 'node:path'
import { existsSync, rmSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Deletes given path from FS.
 * 
 * @param {DeletePathOptions} opts - Options for this operation.
 * @param {string} opts.targetPath - The path to delete (relative to CWD).
 * @param {boolean} opts.force - Whether to force the deletion without prompting.
 * @param {string} opts.prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the path is deleted.
 * @throws Will throw an error if the path is invalid.
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
