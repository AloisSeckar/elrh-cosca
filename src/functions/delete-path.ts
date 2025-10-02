import { resolve } from 'node:path'
import { existsSync, rmSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Deletes given path from FS.
 * 
 * @param {string} targetPath - The path to delete (relative to CWD).
 * @param {boolean} force - Whether to force the deletion without prompting.
 * @param {string} prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the path is deleted.
 * @throws Will throw an error if the path is invalid.
 */
export async function deletePath(
  targetPath: string, force: boolean = false, prompt: string = ''
): Promise<void> {
  const shouldUpdate = force || await promptUser(
    prompt || `This will delete '${targetPath}'. Continue?`,
  )
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
