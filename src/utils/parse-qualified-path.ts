/** 
 * Expects path to file in `"package:relative/path/to/file"` format and splits it into `{ pkg, file }`. 
 * The package name can be scoped (e.g. `@scope/package`).
 * 
 * @param {string} path - The qualified path string to parse.
 * @returns {{ pkg: string; file: string }} An object containing the package name and the relative file path.
 * @throws Will throw an error if the input format is invalid.
 */
export function parseQualifiedPath(path: string): { pkg: string; file: string } {
  if ((path.match(/:/g) || []).length !== 1) {
    throw new Error(`Invalid input "${path}". Expected format is "package:relative/path/to/file".`)
  }

  const idx = path.indexOf(':')
  if (idx <= 0 || idx === path.length - 1) {
    throw new Error(`Invalid input "${path}". Expected format is "package:relative/path/to/file".`)
  }

  const pkg = path.slice(0, idx).trim()
  const file = path.slice(idx + 1).replace(/^[/\\]+/, '')

  // Basic sanity: package names can be scoped (@scope/name) or unscoped
  if (!pkg || pkg.endsWith('/') || pkg.includes(' ')) {
    throw new Error(`Invalid package name in input: "${pkg}".`)
  }

  return { pkg, file }
}
