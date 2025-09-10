#!/usr/bin/env node

// manual test script for COSCA functions

import {
  createFileFromTemplate, createFileFromWebTemplate, promptUser, showError, showMessage,
  updateConfigFile, updateJsonFile, updateTextFile
} from '../dist/elrh-cosca.mjs'

async function main() {
  console.log('Test showMessage')
  showMessage('Hello!')
  console.log('Test showMessage')
  showError('ERROR!')

  console.log('Test promptUser')
  const input = await promptUser('Is it today?')
  console.log('User input:', input)

  console.log('\nTest createFileFromTemplate')
  await createFileFromTemplate('vitest:README.md', 'test/snapshots/test.file1')
  await createFileFromTemplate('elrh-cosca:test/fixtures/text-file.txt', 'test/snapshots/test.file2')
  
  console.log('\nTest createFileFromWebTemplate')
  await createFileFromWebTemplate('https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/vitest.config.ts.template', 'test/snapshots/test.file3')

  console.log('\nTest updateConfigFile')
  await updateConfigFile('test/fixtures/config-file-default.ts', { compatibilityDate: '2025-08-26', extends: ['nuxt-iignis'], cosca: { exists: true, data: ['some', 'other'], raw: 'war' } })

  console.log('\nTest updateJsonFile')
  await updateJsonFile('test/fixtures/json-file.json', 'scripts', { 'cosca' : 'cosca' })

  console.log('\nTest updateTextFile')
  await updateTextFile('test/fixtures/text-file.txt', ['# COSCA'])
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
