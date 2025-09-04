import { access, constants, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Resolve a package's installed root directory *from the target app*.
 * Package name can be scoped (e.g. `@scope/package`).
 * Works with npm/yarn/pnpm, hoisting or not.
 */
export function resolvePackagePath(packageName: string): string {
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
    access(nmPkgJson, constants.R_OK, (err) => { 
      if (err) {
        throw new Error(`Cannot access "${nmPkgJson}"`)
      }
    })
    return nmRoot
  } catch (err) {
    console.error(err)
  }
    
  throw new Error(`Cannot find package "${packageName}" from ${process.cwd()}. Make sure it's installed or linked in this project.`)
}
