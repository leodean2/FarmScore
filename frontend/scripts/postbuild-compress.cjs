const fs = require('fs').promises
const path = require('path')
const zlib = require('zlib')

const DIST = path.resolve(__dirname, '..', 'dist')
const MIN_SIZE = 512 // bytes

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      files.push(...await walk(full))
    } else {
      files.push(full)
    }
  }
  return files
}

async function compress() {
  try {
    const files = await walk(DIST)
    const candidates = files.filter(f => /\.(js|css|html|svg|json|txt|map)$/.test(f))
    for (const file of candidates) {
      const buf = await fs.readFile(file)
      if (buf.length < MIN_SIZE) continue

      // gzip
      try {
        const gz = zlib.gzipSync(buf, { level: zlib.constants.Z_BEST_COMPRESSION })
        await fs.writeFile(file + '.gz', gz)
      } catch (e) {
        console.warn('gzip failed for', file, e.message)
      }

      // brotli
      try {
        const br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } })
        await fs.writeFile(file + '.br', br)
      } catch (e) {
        console.warn('brotli failed for', file, e.message)
      }
    }
    console.log('Compression complete')
  } catch (err) {
    console.error('Postbuild compression failed:', err)
    process.exit(1)
  }
}

compress()
