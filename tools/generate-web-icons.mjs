/**
 * assets/images の公式アイコンから public/ 用 Web アイコンを生成する。
 * macOS の sips を使用（ローカル実行用。生成物は git にコミット）。
 */
import { execFileSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const assetsDir = resolve(root, 'assets/images')
const publicDir = resolve(root, 'public')

const SOURCES = {
  favicon: resolve(assetsDir, 'favicon.png'),
  icon: resolve(assetsDir, 'icon.png'),
  maskable: resolve(assetsDir, 'android-icon-foreground.png'),
}

function resizeWithSips(input, output, size) {
  execFileSync('sips', ['-z', String(size), String(size), input, '--out', output], {
    stdio: ['ignore', 'ignore', 'ignore'],
  })
}

function pngToIco(pngBuffer, size = 32) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry[0] = size >= 256 ? 0 : size
  entry[1] = size >= 256 ? 0 : size
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngBuffer.length, 8)
  entry.writeUInt32LE(6 + 16, 12)

  return Buffer.concat([header, entry, pngBuffer])
}

mkdirSync(publicDir, { recursive: true })

const outputs = [
  { src: 'favicon', out: 'favicon.png', size: 32 },
  { src: 'favicon', out: 'icon-32.png', size: 32 },
  { src: 'favicon', out: 'icon-64.png', size: 64 },
  { src: 'icon', out: 'icon-192.png', size: 192 },
  { src: 'icon', out: 'icon-256.png', size: 256 },
  { src: 'icon', out: 'icon-512.png', size: 512 },
  { src: 'icon', out: 'apple-touch-icon.png', size: 180 },
  { src: 'maskable', out: 'icon-192-maskable.png', size: 192 },
  { src: 'maskable', out: 'icon-512-maskable.png', size: 512 },
]

for (const { src, out, size } of outputs) {
  const input = SOURCES[src]
  const output = resolve(publicDir, out)
  resizeWithSips(input, output, size)
  console.log(`✓ ${out} (${size}px) ← ${src}`)
}

const favicon32 = readFileSync(resolve(publicDir, 'favicon.png'))
writeFileSync(resolve(publicDir, 'favicon.ico'), pngToIco(favicon32, 32))
console.log('✓ favicon.ico ← favicon.png (32px)')
