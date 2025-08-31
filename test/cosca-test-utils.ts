import { readFileSync } from 'node:fs'
import { join } from 'node:path';
import { vi } from 'vitest';

export function readNormalizedFile(dir: string, file: string): string {
    const source = join(dir, file)
    const content = readFileSync(source, 'utf8')
    return content.replace(/\r\n/g, '\n')
}

export function getConsoleSpy(logLevel: 'log' | 'debug' |'info' | 'warn' | 'error') {
    return vi.spyOn(console, logLevel).mockImplementation(() => {})
}
