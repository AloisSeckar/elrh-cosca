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

  // for removeal tests create an extra copy of fixuture files
  cpSync(join(fixtures, 'json-file.json'), join(workspace, 'json-file-2.json'))

  // for deletePath function tests create another copy of fixture files
  cpSync(join(fixtures, 'text-file.txt'), join(workspace, 'del', 'test.file1'))
  cpSync(join(fixtures, 'text-file.txt'), join(workspace, 'del', 'test.file2'))
  cpSync(join(fixtures, 'text-file.txt'), join(workspace, 'del/a', 'test.file1'))

  // teardown (callback runs after all tests)
  // clean up the temp folder
  return () => rmSync(workspace, { recursive: true, force: true })
}
