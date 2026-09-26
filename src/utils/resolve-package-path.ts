import type { ResolvePackagePathOptions } from '../types/functions.js'
import { accessSync, constants, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Resolve a package's installed root directory *from the target app*.
 * Package name can be scoped (e.g. `@scope/package`).
 * Works with npm/yarn/pnpm, hoisting or not.
 * 
 * @param {ResolvePackagePathOptions} opts - Options for this operation.
 * @param {string} opts.packageName - The name of the package to resolve.
 * @returns {string} The absolute path to the package's root directory.
 * @throws Will throw an error if the package cannot be found or accessed.
 */
export function resolvePackagePath(opts: ResolvePackagePathOptions): string {
  const { packageName } = opts
  const appDir = process.cwd()

  // 1. check if it is not called from itself during development
  try {
    const appPkgJsonPath = join(appDir, 'package.json')
    const txt = readFileSync(appPkgJsonPath, 'utf8')
    const appPkg = JSON.parse(txt);
    if (appPkg?.name === packageName) {
      return appDir
    }
  } catch (err) {
    console.error(err)
  }

  // 2. resolve within installed node_modules
  try {
    const nmRoot = join(appDir, 'node_modules', ...packageName.split('/'))
    const nmPkgJson = join(nmRoot, 'package.json')
    accessSync(nmPkgJson, constants.R_OK)
    return nmRoot
  } catch (err) {
    console.error(err)
  }
    
  throw new Error(`Cannot find package "${packageName}" from ${process.cwd()}. Make sure it's installed or linked in this project.`)
}
