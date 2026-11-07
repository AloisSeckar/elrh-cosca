import type { CreateFileFromTemplateOptions } from '../types/functions.js'
import { isAbsolute, relative, resolve } from 'node:path'
import { existsSync, copyFileSync } from 'node:fs'
import { parseQualifiedPath } from '../utils/parse-qualified-path'
import { resolvePackagePath } from '../utils/resolve-package-path'
import { confirmAction, resolveCheckedPath, writeCreatedFile } from '../_private/file-helpers.js'

/**
 * Creates a new file as a copy of a template file from an installed package.
 * 
 * @param {string} opts.templateFile - The path to the template file in `package:relative/path/to/file` format (relative to the package root).
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid, the template path cannot be parsed or points outside of the package, the package or the template file cannot be found or the target file failed to be created.
 */
export async function createFileFromTemplate(opts: CreateFileFromTemplateOptions): Promise<void> {
  const { templateFile, targetPath } = opts
  if (!await confirmAction(opts, `This will create '${targetPath}' file. Continue?`, `Creation of '${targetPath}' skipped.`)) {
    return
  }

  const { pkg, file } = parseQualifiedPath({ path: templateFile })
  const packagePath = resolvePackagePath({ packageName: pkg })
  const templatePath = resolve(packagePath, file)
  const fullPath = resolveCheckedPath(targetPath)

  const templateRelPath = relative(packagePath, templatePath)
  if (templateRelPath === '' || templateRelPath.startsWith('..') || isAbsolute(templateRelPath)) {
    throw new Error(`Template file must be inside the package: '${templateFile}'`)
  }

  if (!existsSync(templatePath)) {
    throw new Error(`Template file not found at ${templatePath}`)
  }

  await writeCreatedFile(targetPath, fullPath, () => copyFileSync(templatePath, fullPath), opts)
}
