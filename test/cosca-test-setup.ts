import { mkdtempSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default async function () {
  // setup (runs before all tests)
  // copy /test/src into temp folder
  const workspace = mkdtempSync(join(tmpdir(), 'cosca-'))
  const fixtures = join(process.cwd(), 'test', 'src')
  cpSync(fixtures, workspace, { recursive: true })
  process.env.WORKSPACE_DIR = workspace
    console.error(workspace)

  // teardown (callback runs after all tests)
  // clean up the temp folder
  return () => rmSync(workspace, { recursive: true, force: true })
}