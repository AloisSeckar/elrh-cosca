import { createFileFromTemplate } from './functions/create-file-from-template'
import { createFileFromWebTemplate } from './functions/create-file-from-web-template'
import { updateConfigFile } from './functions/update-config-file'
import { updateJsonFile } from './functions/update-json-file'
import { updateTextFile } from './functions/update-text-file'
import { promptUser } from './terminal/prompt-user'
import { showError } from './terminal/show-error' 
import { showMessage } from './terminal/show-message'
import { getEnvValue } from './utils/get-env-value'
import { parseQualifiedPath } from './utils/parse-qualified-path'
import { resolvePackagePath } from './utils/resolve-package-path'

export {
  // file-manipulation functions
  createFileFromTemplate,
  createFileFromWebTemplate,
  updateConfigFile,
  updateJsonFile,
  updateTextFile,
  // terminal helpers
  promptUser,
  showError,
  showMessage,
  // other utils
  getEnvValue,
  parseQualifiedPath,
  resolvePackagePath,
}
