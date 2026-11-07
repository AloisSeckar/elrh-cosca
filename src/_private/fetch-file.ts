import https from 'node:https'

const MAX_REDIRECTS = 5
const MAX_SIZE = 10 * 1024 * 1024
const TIMEOUT_MS = 30_000

export async function fetchFile(url: string, redirectsLeft = MAX_REDIRECTS): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // time limit per request
    const timer = setTimeout(() => req.destroy(new Error(`Failed to fetch file: timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)
    const done = (fn: () => void) => {
      clearTimeout(timer)
      fn()
    }

    const req = https.get(url, (res) => {
      const status = res.statusCode ?? 0

      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume()
        if (redirectsLeft <= 0) {
          done(() => reject(new Error(`Failed to fetch file: too many redirects (${MAX_REDIRECTS} allowed)`)))
          return
        }
        let nextUrl: string
        try {
          nextUrl = new URL(res.headers.location, url).toString()
        } catch (err) {
          done(() => reject(err))
          return
        }
        done(() => fetchFile(nextUrl, redirectsLeft - 1).then(resolve, reject))
        return
      }

      if (status < 200 || status >= 300) {
        res.resume()
        done(() => reject(new Error(`Failed to fetch file: ${status}`)))
        return
      }

      // filesize limit
      const tooLarge = new Error(`Failed to fetch file: larger than ${MAX_SIZE} bytes`)
      if (Number(res.headers['content-length']) > MAX_SIZE) {
        req.destroy(tooLarge)
        return
      }

      const chunks: Buffer[] = []
      let received = 0
      res.on('data', (chunk: Buffer) => {
        received += chunk.length
        if (received > MAX_SIZE) {
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
