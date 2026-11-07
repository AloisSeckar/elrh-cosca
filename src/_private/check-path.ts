import { lstatSync, realpathSync } from "node:fs"
import { dirname, resolve, sep } from "node:path"

export function checkPath(path: string): { valid: boolean; error?: string } {
  // Check if path is empty
  if (!path) {
    return { valid: false, error: `Path cannot be empty` }
  }

  // Disallow absolute paths (Windows drives or Unix absolute paths)
  if (/^[A-Za-z]:/.test(path) || path.startsWith('/')) {
    return { valid: false, error: `Path must be relative to CWD: '${path}'` }
  }

  // Check for illegal file system characters
  if (/[<>:"|?*]/.test(path)) {
    return { valid: false, error: `Path contains illegal characters: '${path}'` }
  }

  // Check for consistent path separators
  const hasForwardSlash = path.includes('/')
  const hasBackSlash = path.includes('\\')
  if (hasForwardSlash && hasBackSlash) {
    return { valid: false, error: `Path contains mixed separators: '${path}'` }
  }

  // Check for path traversal attempts
  const pathTraversalRegex = /(?:^|[\/\\])\.\.(?:[\/\\]|$)/
  if (pathTraversalRegex.test(path)) {
    return { valid: false, error: `Path traversal not allowed: '${path}'` }
  }

  // Ensure resolved path is within current working directory
  const fullPath = resolve(process.cwd(), path)
  const cwd = resolve(process.cwd())
  if (!fullPath.startsWith(cwd + sep) && fullPath !== cwd) {
    return { valid: false, error: `Path outside of CWD not allowed: '${path}'` }
  }

  // Ensure symlinks/junctions do not lead outside of current working directory
  const realCwd = realpathSync.native(cwd)
  const realFullPath = realpathOfExistingPart(fullPath)
  if (realFullPath === null || (realFullPath !== realCwd && !realFullPath.startsWith(realCwd + sep))) {
    return { valid: false, error: `Path resolves outside of CWD via symlink: '${path}'` }
  }

  // Checks passed
  return { valid: true }
}

// real location of the deepest existing part of the path; null if a dangling symlink is hit
function realpathOfExistingPart(path: string): string | null {
  let current = path
  while (true) {
    try {
      lstatSync(current)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      const parent = dirname(current)
      if ((code === 'ENOENT' || code === 'ENOTDIR') && parent !== current) {
        current = parent
        continue
      }
      return null
    }
    try {
      return realpathSync.native(current)
    } catch {
      return null
    }
  }
}