const express = require('express')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 5000
const DIST = path.resolve(__dirname, '..', 'dist')

function getContentType(file) {
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (file.endsWith('.css')) return 'text/css; charset=utf-8'
  if (file.endsWith('.html')) return 'text/html; charset=utf-8'
  if (file.endsWith('.svg')) return 'image/svg+xml'
  if (file.endsWith('.json')) return 'application/json; charset=utf-8'
  if (file.endsWith('.map')) return 'application/json; charset=utf-8'
  return 'application/octet-stream'
}

const app = express()

app.use((req, res, next) => {
  // Only handle GET for static files
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()

  const accept = req.headers['accept-encoding'] || ''
  const urlPath = decodeURIComponent(req.path.split('?')[0])
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath)

  // If request maps to directory, serve index.html
  if (filePath.endsWith(path.sep)) filePath = path.join(filePath, 'index.html')

  // If no file extension (SPA route), serve index.html
  if (!path.extname(filePath)) filePath = path.join(DIST, 'index.html')

  // Try brotli then gzip then raw
  const tryFiles = []
  if (accept.includes('br')) tryFiles.push(filePath + '.br')
  if (accept.includes('gzip') || accept.includes('gzip')) tryFiles.push(filePath + '.gz')
  tryFiles.push(filePath)

  for (const candidate of tryFiles) {
    try {
      if (fs.existsSync(candidate)) {
        const isCompressed = candidate.endsWith('.br') || candidate.endsWith('.gz')
        const encoding = candidate.endsWith('.br') ? 'br' : candidate.endsWith('.gz') ? 'gzip' : null

        const contentType = getContentType(candidate.replace(/\.br$|\.gz$/, ''))
        res.setHeader('Content-Type', contentType)
        res.setHeader('Vary', 'Accept-Encoding')

        // Cache static assets aggressively, but not index.html
        if (!candidate.endsWith('index.html') && !candidate.endsWith('index.html.br') && !candidate.endsWith('index.html.gz')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        } else {
          res.setHeader('Cache-Control', 'no-cache')
        }

        if (encoding) res.setHeader('Content-Encoding', encoding)
        return res.sendFile(candidate)
      }
    } catch (e) {
      // continue to next candidate
    }
  }

  // Not found
  return res.status(404).send('Not found')
})

app.listen(PORT, () => {
  console.log(`Static server serving ${DIST} on http://localhost:${PORT}`)
})
