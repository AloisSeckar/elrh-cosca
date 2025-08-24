import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Node will inject __filename/__dirname in CJS builds
declare const __filename: string
declare const __dirname: string

/**
 * Normalized __filename that works in both ESM (.mjs) and CJS (.cjs).
 * In CJS, __filename is available as a global variable.
 * In MJS, import.meta.url is available instead.
 */
export const module_file: string =
  typeof __filename !== 'undefined'
    ? __filename
    // otherwise we must be in ESM
    : fileURLToPath(import.meta.url)

/**
 * Normalized __dirname that works in both ESM (.mjs) and CJS (.cjs).
 * In CJS, __filename is available as a global variable.
 * In MJS, import.meta.url is available instead.
 */
export const module_dir: string =
  typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))
