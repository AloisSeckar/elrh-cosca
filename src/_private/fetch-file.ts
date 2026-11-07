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
    // timeout
    const timer = setTimeout(() => req.destroy(new Error(`Failed to fetch file: timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    const done = (fn: () => void) => {
      clearTimeout(timer)
      fn()
    }

    const req = https.get(url, (res) => {
      const status = res.statusCode ?? 0

      // redirect
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume()
        if (redirectsLeft <= 0) {
          done(() => reject(new Error(`Failed to fetch file: too many redirects (${maxRedirects} allowed)`)))
          return
        }
        let nextUrl: string
        try {
          nextUrl = new URL(res.headers.location, url).toString()
        } catch (err) {
          done(() => reject(err))
          return
        }
        done(() => doFetch(nextUrl, { ...config, redirectsLeft: redirectsLeft - 1 }).then(resolve, reject))
        return
      }

      // error
      if (status < 200 || status >= 300) {
        res.resume()
        done(() => reject(new Error(`Failed to fetch file: ${status}`)))
        return
      }

      // filesize limit
      const tooLarge = new Error(`Failed to fetch file: larger than ${maxSize} bytes`)
      if (Number(res.headers['content-length']) > maxSize) {
        req.destroy(tooLarge)
        return
      }

      // 200 response
      const chunks: Buffer[] = []
      let received = 0
      res.on('data', (chunk: Buffer) => {
        received += chunk.length
        if (received > maxSize) {
          req.destroy(tooLarge)
          return
        }
        chunks.push(chunk)
      })
      res.on('end', () => done(() => resolve(Buffer.concat(chunks))))
      res.on('error', err => done(() => reject(err)))
    })
    req.on('error', err => done(() => reject(err)))
  })
}
