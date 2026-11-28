#!/usr/bin/env node

// manual test script for COSCA functions

import {
  createFileFromTemplate, createFileFromWebTemplate, promptUser, 
  showInfo, showError, showMessage, showWarning, showSuccess, showDebug,
  updateConfigFile, getEnvValue, updateJsonFile, updateTextFile, 
  deletePath, removeFromJsonFile
} from '../dist/elrh-cosca.mjs'

async function main() {
  console.log('\nTest showMessage')
  showMessage({ message: 'Hello!' })
  showMessage({ message: 'Hello!', color: 'cyan' })
  console.log('\nTest showInfo')
  showInfo({ message: 'Info...' })
  showInfo({ message: 'Info...', color: 'cyan' })
  console.log('\nTest showDebug')
  showDebug({ message: 'Debug...' })
  showDebug({ message: 'Debug...', color: 'cyan' })
  console.log('\nTest showSuccess')
  showSuccess({ message: 'OK!' })
  showSuccess({ message: 'OK!', color: 'cyan' })
  console.log('\nTest showWarning')
  showWarning({ message: 'WARN!' })
  showWarning({ message: 'WARN!', color: 'cyan' })
  console.log('\nTest showError')
  showError({ message: 'ERROR!' })
  showError({ message: 'ERROR!', color: 'cyan' })

  console.log('\nTest getEnvValue')
  const envFilePath = 'test/fixtures/.env'
  const a = getEnvValue({ key: 'A', envFilePath })
  const b = getEnvValue({ key: 'B', envFilePath })
  const c = getEnvValue({ key: 'C', envFilePath })
  const d = getEnvValue({ key: 'D', envFilePath })
  const e = getEnvValue({ key: 'E', envFilePath })
  console.log(a, b, c, d, e)

  console.log('\nTest promptUser')
  const input = await promptUser({ question: 'Is it today?' })
  console.log('User input:', input)
  const inputMulti = await promptUser({ question: 'What day is it?', multiChoice: ['Yesterday', 'Today', 'Tomorrow'] })
  console.log('User input:', inputMulti)

  console.log('\nTest createFileFromTemplate')
  await createFileFromTemplate({ templateFile: 'vitest:README.md', targetPath: 'test/snapshots/test.file1' })
  await createFileFromTemplate({ templateFile: 'elrh-cosca:test/fixtures/text-file.txt', targetPath: 'test/snapshots/test.file2' })
  
  console.log('\nTest createFileFromWebTemplate')
  await createFileFromWebTemplate({ url: 'https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/templates/vitest.config.ts.template', targetPath: 'test/snapshots/test.file3' })

  console.log('\nTest updateConfigFile')
  await updateConfigFile({ targetPath: 'test/fixtures/config-file-default.ts', newConfig: { compatibilityDate: '2025-08-26', extends: ['nuxt-iignis'], cosca: { exists: true, data: ['some', 'other'], raw: 'war' } } })

  console.log('\nTest updateJsonFile')
  await updateJsonFile({ targetPath: 'test/fixtures/json-file.json', jsonKey: 'scripts', patch: { 'cosca' : 'cosca' } })
  await updateJsonFile({ targetPath: 'test/fixtures/json-file.json', jsonKey: 'packageManager', patch: 'pnpm' })

  console.log('\nTest removeFromJsonFile')
  await removeFromJsonFile({ targetPath: 'test/fixtures/json-file.json', jsonKey: 'cosca' })

  console.log('\nTest updateTextFile')
  await updateTextFile({ targetPath: 'test/fixtures/text-file.txt', rowsToAdd: ['# COSCA'] })

  console.log('\nTest deletePath')
  await deletePath({ targetPath: 'test/snapshots/test.file1' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
