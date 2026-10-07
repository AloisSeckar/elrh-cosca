import https from 'node:https'

const MAX_REDIRECTS = 5

export async function fetchFile(url: string, redirectsLeft = MAX_REDIRECTS): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const status = res.statusCode ?? 0

      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume()
        if (redirectsLeft <= 0) {
          reject(new Error(`Failed to fetch file: too many redirects (${MAX_REDIRECTS} allowed)`))
          return
        }
        let nextUrl: string
        try {
          nextUrl = new URL(res.headers.location, url).toString()
        } catch (err) {
          reject(err)
          return
        }
        fetchFile(nextUrl, redirectsLeft - 1).then(resolve, reject)
        return
      }

      if (status < 200 || status >= 300) {
        res.resume()
        reject(new Error(`Failed to fetch file: ${status}`))
        return
      }

      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}
