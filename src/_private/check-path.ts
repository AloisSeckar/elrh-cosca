import { resolve, sep } from "node:path"

export function checkPath(path: string): { valid: boolean; error?: string } {
  console.warn(path)
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

  // Checks passed
  return { valid: true }
}
