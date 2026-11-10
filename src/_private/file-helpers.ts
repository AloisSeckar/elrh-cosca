import type { FileOperationOptions } from '../types/functions.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from './check-path.js'
import { showDebug, showMessage } from '../main.js'

// guards against prototype pollution via crafted property names / key segments
export const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function resolveCheckedPath(targetPath: string): string {
  const pathCheck = checkPath(targetPath)
  if (!pathCheck.valid) {
    throw new Error(pathCheck.error)
  }
  return resolve(process.cwd(), targetPath)
}

export function readTargetFile(targetPath: string, missingAction: string): { fullPath: string; content: string } {
  const fullPath = resolveCheckedPath(targetPath)
  if (!existsSync(fullPath)) {
    throw new Error(`No '${targetPath}' found — cannot ${missingAction}.`)
  }
  return { fullPath, content: readFileSync(fullPath, 'utf8') }
}

export async function confirmAction(
  opts: FileOperationOptions,
  defaultQuestion: string,
  skipMessage: string,
): Promise<boolean> {
  const { force = false, prompt = '', silent = false } = opts
  const confirmed = force || await promptUser({ question: prompt || defaultQuestion })
  if (!confirmed && !silent) {
    showDebug(skipMessage)
  }
  return confirmed
}

export async function prepareTargetFile(
  targetPath: string,
  opts: { createMissing?: boolean; force?: boolean; silent?: boolean },
): Promise<{ fullPath: string; content: string | null; created: boolean } | null> {
  const { createMissing = false, force = false, silent = false } = opts
  const fullPath = resolveCheckedPath(targetPath)
  const created = !existsSync(fullPath)
  if (created) {
    if (!createMissing) {
      throw new Error(`No '${targetPath}' found — cannot update its contents.`)
    }
    const shouldCreate = force || await promptUser({ question: `File '${targetPath}' does not exist. Create it?` })
    if (!shouldCreate) {
      if (!silent) showDebug(`Creation of '${targetPath}' skipped.`)
      return null
    }
    return { fullPath, content: null, created: true }
  }
  return { fullPath, content: readFileSync(fullPath, 'utf8'), created: false }
}

export function writeUpdatedFile(
  targetPath: string,
  fullPath: string,
  content: string,
  modified: boolean,
  created: boolean,
  silent: boolean,
): void {
  if (modified) {
    if (created) {
      mkdirSync(dirname(fullPath), { recursive: true })
    }
    writeFileSync(fullPath, content, 'utf8')
    if (!silent) showMessage({ message: `'${targetPath}' file ${created ? 'created' : 'updated'}.`, color: 'blue' })
  } else {
    if (!silent) showDebug(`'${targetPath}' file already up to date.`)
  }
}

export async function writeCreatedFile(
  targetPath: string,
  fullPath: string,
  writeFn: () => void,
  opts: { force?: boolean; silent?: boolean },
): Promise<void> {
  const { force = false, silent = false } = opts
  if (existsSync(fullPath)) {
    const shouldOverwrite = force || await promptUser({ question: `File '${targetPath}' already exists. Overwrite?` })
    if (!shouldOverwrite) {
      if (!silent) showDebug('Aborted.')
      return
    }
  }

  mkdirSync(dirname(fullPath), { recursive: true })
  writeFn()

  if (existsSync(fullPath)) {
    if (!silent) showMessage({ message: `New file '${targetPath}' successfully created.`, color: 'blue' })
  } else {
    throw new Error(`Failed to create '${targetPath}'.`)
  }
}
