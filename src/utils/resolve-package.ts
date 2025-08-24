import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'

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
export function resolvePackagePath(pkg: string): string {
  const requireFromApp = createRequire(resolve(process.cwd(), 'package.json'))
  const pkgJsonPath = requireFromApp.resolve(`${pkg}/package.json`)
  return dirname(pkgJsonPath)
}
