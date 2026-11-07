import https from 'node:https'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { fetchFile } from '../src/_private/fetch-file'
import { getStdoutSpy } from './cosca-test-utils'

type FakeResponse = {
  statusCode?: number
  headers?: Record<string, string>
  chunks?: (string | Buffer)[]
  error?: Error
  hang?: boolean
}

// replaces `https.get` so no real network request is made
function mockHttps(responses: (FakeResponse | Error)[]) {
  let call = 0
  return vi.spyOn(https, 'get').mockImplementation(((_url: string, callback: (res: unknown) => void) => {
    const req = Object.assign(new EventEmitter(), {
      destroy: vi.fn((err?: Error) => { if (err) req.emit('error', err) }),
    })
    const next = responses[call++]
    if (next instanceof Error) {
      queueMicrotask(() => req.emit('error', next))
      return req
    }
    const res = Object.assign(new EventEmitter(), {
      statusCode: next.statusCode,
      headers: next.headers ?? {},
      resume: vi.fn(),
    })
    // real responses arrive asynchronously, after `https.get` has returned the request
    queueMicrotask(() => {
      if (next.hang) return
      callback(res)
      if (next.error) {
        res.emit('error', next.error)
      } else {
        next.chunks?.forEach(chunk => res.emit('data', Buffer.from(chunk)))
        res.emit('end')
      }
    })
    return req
  }) as never)
}

describe('Test fetchFile function', () => {

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  test('should return the response body', async () => {
    mockHttps([{ statusCode: 200, chunks: ['Hello, ', 'world'] }])
    await expect(fetchFile('https://example.com/file.txt').then(String)).resolves.toBe('Hello, world')
  })

  test('should return binary content unchanged', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0xFF, 0x00])
    mockHttps([{ statusCode: 200, chunks: [png.subarray(0, 5), png.subarray(5)] }])
    await expect(fetchFile('https://example.com/file.png')).resolves.toEqual(png)
  })

  test('should follow relative redirect', async () => {
    const spy = mockHttps([
      { statusCode: 302, headers: { location: '/next' } },
      { statusCode: 200, chunks: ['done'] },
    ])
    await expect(fetchFile('https://example.com/file.txt').then(String)).resolves.toBe('done')
    expect(spy.mock.calls[1][0]).toBe('https://example.com/next')
  })

  test('should fail after too many redirects', async () => {
    const spy = mockHttps(Array.from({ length: 10 }, () => ({ statusCode: 302, headers: { location: '/loop' } })))
    await expect(fetchFile('https://example.com/file.txt')).rejects.toThrow(/too many redirects/)
    expect(spy).toHaveBeenCalledTimes(6)
  })

  test('should fail when no redirects are allowed', async () => {
    vi.stubEnv('COSCA_FETCH_REDIRECTS', '0')
    mockHttps([{ statusCode: 301, headers: { location: '/next' } }])
    await expect(fetchFile('https://example.com/file.txt')).rejects.toThrow(/too many redirects \(0 allowed\)/)
  })

  test('should fail on invalid redirect location', async () => {
    mockHttps([{ statusCode: 302, headers: { location: 'http://' } }])
    await expect(fetchFile('https://example.com/file.txt')).rejects.toThrow(/Invalid URL/)
  })

  test('should fail on non-2xx response', async () => {
    mockHttps([{ statusCode: 404 }])
    await expect(fetchFile('https://example.com/file.txt')).rejects.toThrow(/Failed to fetch file: 404/)
  })

  test('should fail on missing status code', async () => {
    mockHttps([{}])
    await expect(fetchFile('https://example.com/file.txt')).rejects.toThrow(/Failed to fetch file: 0/)
  })

  test('should fail on request error', async () => {
    mockHttps([new Error('connection refused')])
    await expect(fetchFile('https://example.com/file.txt')).rejects.toThrow(/connection refused/)
  })

  test('should fail on response error', async () => {
    mockHttps([{ statusCode: 200, error: new Error('connection reset') }])
    await expect(fetchFile('https://example.com/file.txt')).rejects.toThrow(/connection reset/)
  })

  test('should fail when content-length exceeds the limit', async () => {
    mockHttps([{ statusCode: 200, headers: { 'content-length': String(10 * 1024 * 1024 + 1) }, chunks: ['x'] }])
    await expect(fetchFile('https://example.com/big.bin')).rejects.toThrow(/larger than/)
  })

  test('should fail when streamed body exceeds the limit', async () => {
    const chunk = Buffer.alloc(6 * 1024 * 1024)
    mockHttps([{ statusCode: 200, chunks: [chunk, chunk] }])
    await expect(fetchFile('https://example.com/big.bin')).rejects.toThrow(/larger than/)
  })

  test('should accept body at the limit', async () => {
    const body = Buffer.alloc(10 * 1024 * 1024)
    mockHttps([{ statusCode: 200, headers: { 'content-length': String(body.length) }, chunks: [body] }])
    await expect(fetchFile('https://example.com/big.bin')).resolves.toHaveLength(body.length)
  })

  test('should fail when the server does not respond in time', async () => {
    vi.useFakeTimers()
    try {
      mockHttps([{ hang: true }])
      const result = expect(fetchFile('https://example.com/slow.bin')).rejects.toThrow(/timed out/)
      await vi.advanceTimersByTimeAsync(30_000)
      await result
    } finally {
      vi.useRealTimers()
    }
  })

  test('should respect COSCA_FETCH_REDIRECTS', async () => {
    vi.stubEnv('COSCA_FETCH_REDIRECTS', '1')
    const spy = mockHttps(Array.from({ length: 5 }, () => ({ statusCode: 302, headers: { location: '/loop' } })))
    await expect(fetchFile('https://example.com/file.txt')).rejects.toThrow(/too many redirects \(1 allowed\)/)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  test('should respect COSCA_FETCH_SIZE', async () => {
    vi.stubEnv('COSCA_FETCH_SIZE', '4')
    mockHttps([{ statusCode: 200, chunks: ['12345'] }])
    await expect(fetchFile('https://example.com/file.txt')).rejects.toThrow(/larger than 4 bytes/)
  })

  test('should respect COSCA_FETCH_TIMEOUT', async () => {
    vi.stubEnv('COSCA_FETCH_TIMEOUT', '1000')
    vi.useFakeTimers()
    try {
      mockHttps([{ hang: true }])
      const result = expect(fetchFile('https://example.com/slow.bin')).rejects.toThrow(/timed out after 1s/)
      await vi.advanceTimersByTimeAsync(1000)
      await result
    } finally {
      vi.useRealTimers()
    }
  })

  test('should use defaults for empty env values', async () => {
    vi.stubEnv('COSCA_FETCH_SIZE', '')
    mockHttps([{ statusCode: 200, chunks: ['ok'] }])
    await expect(fetchFile('https://example.com/file.txt').then(String)).resolves.toBe('ok')
  })

  test.each([
    ['COSCA_FETCH_REDIRECTS', '-1'],
    ['COSCA_FETCH_REDIRECTS', 'abc'],
    ['COSCA_FETCH_SIZE', '0'],
    ['COSCA_FETCH_TIMEOUT', '1.5'],
  ])('should warn and use default for invalid %s value %s', async (name, value) => {
    vi.stubEnv(name, value)
    const stdout = getStdoutSpy()
    mockHttps([{ statusCode: 200, chunks: ['ok'] }])
    await expect(fetchFile('https://example.com/file.txt').then(String)).resolves.toBe('ok')
    const output = stdout.mock.calls.map(c => String(c[0])).join('')
    expect(output).toContain(`Ignoring invalid ${name} value '${value}'`)
  })

  test('should warn only once when following redirects', async () => {
    vi.stubEnv('COSCA_FETCH_SIZE', 'abc')
    const stdout = getStdoutSpy()
    mockHttps([
      { statusCode: 302, headers: { location: '/next' } },
      { statusCode: 200, chunks: ['done'] },
    ])
    await expect(fetchFile('https://example.com/file.txt').then(String)).resolves.toBe('done')
    const output = stdout.mock.calls.map(c => String(c[0])).join('')
    expect(output.match(/Ignoring invalid/g)).toHaveLength(1)
  })

})
