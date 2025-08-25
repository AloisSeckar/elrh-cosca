import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { defu } from 'defu'
import JSON5 from 'json5'
import { promptUser } from './prompt-user.js'

/**
 * Update the single object-literal config found in a file.
 *
 * It:
 *  - Extracts the top-level config object (between the first '{' and the last '}').
 *  - Parses that block with JSON5 (tolerates comments, unquoted keys, trailing commas).
 *  - Merges with `newConfig` using defu, giving userConfig precedence.
 *  - Writes the merged object back, preserving the file's prefix/suffix text.
 *
 * @param {string} pathToFile - Path to file, relative to project root (process.cwd()).
 * @param {object} newConfig - Config to merge in (takes precedence).
 * @returns {Promise<void>}
 */
export async function updateConfigFile(
  pathToFile: string, newConfig: Record<string | number | symbol, any>, force: boolean = false
): Promise<void> {
  const shouldUpdate = force || await promptUser(
    `This will update '${pathToFile}' file. Continue?`,
  )
  if (shouldUpdate) {
    const absPath = resolve(process.cwd(), pathToFile)
    const rawContent = await fs.readFile(absPath, 'utf8')

    // locate top-level config object in the file
    // assumed being between first '{' and last '}'
    const start = rawContent.indexOf('{')
    const end = rawContent.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`Could not locate the top-level config object in ${pathToFile}.`)
    }

    // parse the input
    // extract the part before config, the config object itself, and the part after
    const partBefore = rawContent.slice(0, start)
    const configObject = rawContent.slice(start, end + 1)
    const partAfter = rawContent.slice(end + 1)

    // parse configObject with JSON5 for flexibility 
    // (comments, trailing commas, unquoted keys)
    let currentConfig
    try {
      currentConfig = JSON5.parse(configObject)
    } catch (err) {
      throw new Error(`Failed to parse the config object ${pathToFile} as JSON5:\n${err}`)
    }

    // merge new config excerpt into existing using 'defu'
    const mergedConfig = defu(newConfig, currentConfig)

    // serialize the updated config back into plain string
    // and concatenate with original before/after part
    const formattedConfig = JSON5.stringify(mergedConfig, null, 2)
    const updatedContent = `${partBefore}${formattedConfig}${partAfter}`

    // only write down if contents changed
    if (updatedContent !== rawContent) {
      await fs.writeFile(absPath, updatedContent, 'utf8')
    } else {
       console.log(`'${pathToFile}' file already up to date.`)
    }
  }
}
