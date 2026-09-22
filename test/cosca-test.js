#!/usr/bin/env node

// manual test script for COSCA functions

import {
  createFileFromTemplate, createFileFromWebTemplate, promptUser, showError, showMessage,
  updateConfigFile, getEnvValue, updateJsonFile, updateTextFile, deletePath, removeFromJsonFile
} from '../dist/elrh-cosca.mjs'

async function main() {
  console.log('Test showMessage')
  showMessage({ message: 'Hello!' })
  console.log('Test showMessage')
  showError({ message: 'ERROR!' })

  console.log('Test getEnvValue')
  const a = getEnvValue({ key: 'A' })
  const b = getEnvValue({ key: 'B' })
  const c = getEnvValue({ key: 'C' })
  const d = getEnvValue({ key: 'D' })
  const e = getEnvValue({ key: 'E' })
  console.log(a, b, c, d, e)

  console.log('Test promptUser')
  const input = await promptUser({ question: 'Is it today?' })
  console.log('User input:', input)

  console.log('\nTest createFileFromTemplate')
  await createFileFromTemplate({ templateFile: 'vitest:README.md', targetFile: 'test/snapshots/test.file1' })
  await createFileFromTemplate({ templateFile: 'elrh-cosca:test/fixtures/text-file.txt', targetFile: 'test/snapshots/test.file2' })
  
  console.log('\nTest createFileFromWebTemplate')
  await createFileFromWebTemplate({ url: 'https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/vitest.config.ts.template', targetFile: 'test/snapshots/test.file3' })

  console.log('\nTest updateConfigFile')
  await updateConfigFile({ targetFile: 'test/fixtures/config-file-default.ts', newConfig: { compatibilityDate: '2025-08-26', extends: ['nuxt-iignis'], cosca: { exists: true, data: ['some', 'other'], raw: 'war' } } })

  console.log('\nTest updateJsonFile')
  await updateJsonFile({ targetFile: 'test/fixtures/json-file.json', jsonKey: 'scripts', patch: { 'cosca' : 'cosca' } })
  await updateJsonFile({ targetFile: 'test/fixtures/json-file.json', jsonKey: 'packageManager', patch: 'pnpm' })

  console.log('\nTest removeFromJsonFile')
  await removeFromJsonFile({ targetFile: 'test/fixtures/json-file.json', jsonKey: 'cosca' })

  console.log('\nTest updateTextFile')
  await updateTextFile({ targetFile: 'test/fixtures/text-file.txt', rowsToAdd: ['# COSCA'] })

  console.log('\nTest deletePath')
  await deletePath({ targetPath: 'test/snapshots/test.file1' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
