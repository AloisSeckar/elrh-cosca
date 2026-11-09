import type { IncomingMessage } from 'node:http'
import https from 'node:https'
import { showWarning } from '../terminal/show-warning'

const DEFAULT_MAX_REDIRECTS = 5
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 30_000

interface FetchConfig {
  maxRedirects: number
  maxSize: number
  timeoutMs: number
  redirectsLeft: number
}

// read at call time so changes to `process.env` apply immediately
function readConfig(name: string, fallback: number, min: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min) {
    showWarning(`Ignoring invalid ${name} value '${raw}' (expected an integer >= ${min}), using default ${fallback}.`)
    return fallback
  }
  return value
}

export async function fetchFile(url: string): Promise<Buffer> {
  // get fetch config (env or defaults)
  const maxRedirects = readConfig('COSCA_FETCH_REDIRECTS', DEFAULT_MAX_REDIRECTS, 0)
  const maxSize = readConfig('COSCA_FETCH_SIZE', DEFAULT_MAX_SIZE, 1)
  const timeoutMs = readConfig('COSCA_FETCH_TIMEOUT', DEFAULT_TIMEOUT_MS, 1)
  // possibly recursive due to redirects
  return doFetch(url, { maxRedirects, maxSize, timeoutMs, redirectsLeft: maxRedirects })
}

async function doFetch(url: string, config: FetchConfig): Promise<Buffer> {
  const { maxRedirects, maxSize, timeoutMs, redirectsLeft } = config

  return new Promise((resolve, reject) => {
    // settle at most once; later calls (e.g. the `error` event caused by `req.destroy`) are ignored
    let settled = false
    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn()
    }
    const fail = (err: Error) => done(() => reject(err))
    // the promise is already rejected, so a failing destroy must not escape
    const abort = (err?: Error) => {
      try {
        req.destroy(err)
      } catch { /* ignore */ }
    }

    // timeout
    const timer = setTimeout(() => {
      const err = new Error(`Failed to fetch file: timed out after ${timeoutMs / 1000}s`)
      fail(err)
      abort(err)
    }, timeoutMs)

    const req = https.get(url, (res) => {
      try {
        handleResponse(res)
      } catch (err) {
        fail(err as Error)
        abort()
      }
    })
    req.on('error', fail)

    function handleResponse(res: IncomingMessage) {
      const status = res.statusCode ?? 0

      // redirect
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume()
        if (redirectsLeft <= 0) {
          fail(new Error(`Failed to fetch file: too many redirects (${maxRedirects} allowed)`))
          return
        }
        let nextUrl: string
        try {
          nextUrl = new URL(res.headers.location, url).toString()
        } catch (err) {
          fail(err as Error)
          return
        }
        done(() => doFetch(nextUrl, { ...config, redirectsLeft: redirectsLeft - 1 }).then(resolve, reject))
        return
      }

      // error
      if (status < 200 || status >= 300) {
        res.resume()
        fail(new Error(`Failed to fetch file: ${status}`))
        return
      }

      // filesize limit
      const tooLarge = new Error(`Failed to fetch file: larger than ${maxSize} bytes`)
      if (Number(res.headers['content-length']) > maxSize) {
        fail(tooLarge)
        abort()
        return
      }

      // 200 response
      const chunks: Buffer[] = []
      let received = 0
      res.on('data', (chunk: Buffer) => {
        received += chunk.length
        if (received > maxSize) {
          fail(tooLarge)
          abort()
          return
        }
        chunks.push(chunk)
      })
      res.on('end', () => done(() => resolve(Buffer.concat(chunks))))
      res.on('error', fail)
    }
  })
}
