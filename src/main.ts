import { getPackageManager } from './checks/get-package-manager'
import { hasJsonKey } from './checks/has-json-key'
import { hasText } from './checks/has-text'
import { hasYamlKey } from './checks/has-yaml-key'
import { pathExists } from './checks/path-exists'
import { createFileFromTemplate } from './functions/create-file-from-template'
import { createFileFromWebTemplate } from './functions/create-file-from-web-template'
import { deletePath } from './functions/delete-path'
import { removeFromJsonFile } from './functions/remove-from-json-file'
import { removeFromTextFile } from './functions/remove-from-text-file'
import { removeFromYamlFile } from './functions/remove-from-yaml-file'
import { updateConfigFile } from './functions/update-config-file'
import { updateJsonFile } from './functions/update-json-file'
import { updateTextFile } from './functions/update-text-file'
import { updateYamlFile } from './functions/update-yaml-file'
import { promptUser } from './terminal/prompt-user'
import { showError } from './terminal/show-error'
import { showMessage } from './terminal/show-message'
import { getEnvValue } from './utils/get-env-value'
import { parseQualifiedPath } from './utils/parse-qualified-path'
import { resolvePackagePath } from './utils/resolve-package-path'

export type {
  HasJsonKeyOptions,
  HasTextOptions,
  HasYamlKeyOptions,
  PathExistsOptions,
  CreateFileFromTemplateOptions,
  CreateFileFromWebTemplateOptions,
  DeletePathOptions,
  RemoveFromJsonFileOptions,
  RemoveFromTextFileOptions,
  RemoveFromYamlFileOptions,
  UpdateConfigFileOptions,
  UpdateJsonFileOptions,
  UpdateTextFileOptions,
  UpdateYamlFileOptions,
  PromptUserOptions,
  ShowErrorOptions,
  ShowMessageOptions,
  GetEnvValueOptions,
  ParseQualifiedPathOptions,
  ResolvePackagePathOptions,
} from './types/functions'

export {
  //  file-content checks
  getPackageManager,
  hasJsonKey,
  hasText,
  hasYamlKey,
  pathExists,
  // file-manipulation functions
  createFileFromTemplate,
  createFileFromWebTemplate,
  deletePath,
  removeFromJsonFile,
  removeFromTextFile,
  removeFromYamlFile,
  updateConfigFile,
  updateJsonFile,
  updateTextFile,
  updateYamlFile,
  // terminal helpers
  promptUser,
  showError,
  showMessage,
  // other utils
  getEnvValue,
  parseQualifiedPath,
  resolvePackagePath,
}
