import { mkdtempSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default async function () {
  // setup (runs before all tests)
  // copy /test/fixtures into temp folder
  const workspace = mkdtempSync(join(tmpdir(), 'cosca-'))
  const fixtures = join(process.cwd(), 'test', 'fixtures')
  cpSync(fixtures, workspace, { recursive: true })
  process.env.WORKSPACE_DIR = workspace

  // for remove tests, create an extra copy of fixuture files
  cpSync(join(fixtures, 'json-file.json'), join(workspace, 'json-file-2.json'))

  // teardown (callback runs after all tests)
  // clean up the temp folder
  return () => rmSync(workspace, { recursive: true, force: true })
}
