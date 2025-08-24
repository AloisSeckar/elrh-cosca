#!/usr/bin/env node

// test script for createFileFromTemplate function

import { createFileFromTemplate } from '../dist/elrh-cosca.cjs'

async function main() {
  await createFileFromTemplate('vite:README.md', 'test.file')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
