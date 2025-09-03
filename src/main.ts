import { createFileFromTemplate } from './functions/create-file-from-template'
import { updateConfigFile } from './functions/update-config-file'
import { updateJsonFile } from './functions/update-json-file'
import { updateTextFile } from './functions/update-text-file'
import { promptUser } from './terminal/prompt-user'
import { parseQualifiedPath } from './utils/parse-qualified-path'
import { resolvePackagePath } from './utils/resolve-package-path'

export {
  // file-manipulation functions
  createFileFromTemplate,
  updateConfigFile,
  updateJsonFile,
  updateTextFile,
  // terminal helpers
  promptUser,
  // other utils
  parseQualifiedPath,
  resolvePackagePath,
}
