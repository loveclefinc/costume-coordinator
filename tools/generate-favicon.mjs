/**
 * PNG を ICO に変換（PNG 埋め込み形式。外部依存なし）
 * npx の npm 警告が stdout に混ざって favicon.ico を壊すのを避けるためのローカル生成用。
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')
const pngPath = resolve(publicDir, 'icon-64.png')
const icoPath = resolve(publicDir, 'favicon.ico')

const png = readFileSync(pngPath)

function pngToIco(pngBuffer, size = 64) {
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

const ico = pngToIco(png)
writeFileSync(icoPath, ico)
console.log(`Wrote ${icoPath} (${ico.length} bytes)`)
