import { access, constants, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** 
 * Expects path to file template in `"package:relative/path/to/file"` format and splits it into `{ pkg, file }`. 
 * Throws error on invalid input. 
 */
export function parseTemplatePath(input: string): { pkg: string; file: string } {
  const idx = input.indexOf(':')
  if (idx <= 0 || idx === input.length - 1) {
    throw new Error(
      `Invalid input "${input}". Expected format is "package:relative/path/to/file".`
    )
  }
  const pkg = input.slice(0, idx).trim()
  const file = input.slice(idx + 1).replace(/^[/\\]+/, '')
  // Basic sanity: package names can be scoped (@scope/name) or unscoped
  if (!pkg || pkg.endsWith('/') || pkg.includes(' ')) {
    throw new Error(`Invalid package name in templatePath: "${pkg}"`)
  }
  return { pkg, file }
}

/**
 * Resolve a package's installed root directory *from the target app*.
 * Package name can be scoped.
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
    console.log(nmPkgJson)
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
