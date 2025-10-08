/**
 * Checks what package manager was used to execute the current command.
 * 
 * @returns {string} The name of the package manager used ('npm', 'yarn', 'pnpm', 'deno' or 'bun').
 */
export function getPackageManager(): 'npm' | 'yarn' | 'pnpm' | 'deno' | 'bun' {
  if ((globalThis as any)?.Deno) {
    return 'deno'
  }

  if ((globalThis as any)?.Bun) {
    return 'bun'
  }

  const userAgent = process?.env?.npm_config_user_agent;
  if (userAgent) {
    if (userAgent.includes('pnpm')) return 'pnpm';
    if (userAgent.includes('yarn')) return 'yarn';
    if (userAgent.includes('bun')) return 'bun';
    if (userAgent.includes('npm')) return 'npm';
  }

  // fallback assumption
  return 'npm'
}