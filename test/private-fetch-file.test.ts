import https from 'node:https'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { fetchFile } from '../src/_private/fetch-file'

type FakeResponse = {
  statusCode?: number
  headers?: Record<string, string>
  chunks?: (string | Buffer)[]
  error?: Error
}

// replaces `https.get` so no real network request is made
function mockHttps(responses: (FakeResponse | Error)[]) {
  let call = 0
  return vi.spyOn(https, 'get').mockImplementation(((_url: string, callback: (res: unknown) => void) => {
    const req = new EventEmitter()
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
    callback(res)
    if (next.error) {
      res.emit('error', next.error)
    } else {
      next.chunks?.forEach(chunk => res.emit('data', Buffer.from(chunk)))
      res.emit('end')
    }
    return req
  }) as never)
}

describe('Test fetchFile function', () => {

  afterEach(() => {
    vi.restoreAllMocks()
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

  test('should fail when no redirects are left', async () => {
    mockHttps([{ statusCode: 301, headers: { location: '/next' } }])
    await expect(fetchFile('https://example.com/file.txt', 0)).rejects.toThrow(/too many redirects/)
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

})
