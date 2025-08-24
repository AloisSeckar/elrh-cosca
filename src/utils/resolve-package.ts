import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve  } from 'node:path'

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
 * Works with npm/yarn/pnpm, hoisting or not.
 */
export function resolvePackagePath(packageName: string): string {
  // 1. check if it is not called from itself during development
  try {
    const appDir = process.cwd()
    const appPkgJsonPath = join(appDir, 'package.json')
    const txt = readFileSync(appPkgJsonPath, 'utf8')
    const appPkg = JSON.parse(txt);
    if (appPkg?.name === packageName) {
      return appDir
    }
  } catch (err) {
    // no package.json at CWD — carry on to resolver
  }

  // 2. resolve within installed node_modules
  try {
    const requireFromApp = createRequire(resolve(process.cwd(), 'package.json'))
    const pkgJsonPath = requireFromApp.resolve(`${packageName}/package.json`)
    return dirname(pkgJsonPath)
  } catch {
    throw new Error(`Cannot find package "${packageName}" from ${process.cwd()}. Make sure it's installed or linked in this project.`)
  }
}
