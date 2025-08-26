#!/usr/bin/env node

// manual test script for COSCA functions

import { 
  createFileFromTemplate, promptUser, updateConfigFile, updateJsonFile, updateTextFile 
} from '../dist/elrh-cosca.mjs'

async function main() {
  /*
  console.log('Test promptUser')
  const input = await promptUser('Is it today?')
  console.log('User input:', input)

  console.log('\nTest createFileFromTemplate')
  await createFileFromTemplate('vite:README.md', 'test.file1')
  await createFileFromTemplate('elrh-cosca:README.md', 'test.file2')
  */

  console.log('\nTest updateConfigFile')
  await updateConfigFile('test/cosca-test-config.ts', { compatibilityDate: '2025-08-26', extends: ['nuxt-iignis'], cosca: { exists: true, data: ['some', 'other'], raw: 'war' } })

  /*
  console.log('\nTest updateJsonFile')
  await updateJsonFile('package.json', 'scripts', { 'cosca' : 'cosca' })

  console.log('\nTest updateTextFile')
  await updateTextFile('.gitignore', ['# COSCA'])
  */
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
