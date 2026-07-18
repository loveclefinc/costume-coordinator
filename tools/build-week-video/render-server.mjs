#!/usr/bin/env node

import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs'
import { mkdir, readFile, stat } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const args = new Map()
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1])
}

const assetsDir = path.resolve(args.get('--assets') ?? '/private/tmp/ensemble-ai-video/raw')
const buildDir = path.resolve(args.get('--build') ?? 'build-week-video-output')
const outputFile = path.resolve(args.get('--output') ?? path.join(buildDir, 'ensemble-ai-build-week-ja-en.webm'))
const mp4File = path.resolve(args.get('--mp4') ?? path.join(buildDir, 'ensemble-ai-build-week-ja-en.mp4'))
const port = Number(args.get('--port') ?? 4175)
const maxUploadBytes = 350 * 1024 * 1024
await mkdir(path.dirname(outputFile), { recursive: true })

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.srt': 'application/x-subrip; charset=utf-8',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
}

function sendFile(request, response, filePath) {
  if (!existsSync(filePath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end(`Missing file: ${filePath}`)
    return
  }
  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
    'Content-Length': statSync(filePath).size,
    'Cache-Control': 'no-store',
  })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(filePath).pipe(response)
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)
  const isFileRequest = request.method === 'GET' || request.method === 'HEAD'
  if (isFileRequest && url.pathname === '/') {
    sendFile(request, response, path.join(scriptDir, 'render.html'))
    return
  }
  if (isFileRequest && url.pathname === '/render.js') {
    sendFile(request, response, path.join(scriptDir, 'render.js'))
    return
  }
  if (isFileRequest && url.pathname === '/verify.html') {
    sendFile(request, response, path.join(scriptDir, 'verify.html'))
    return
  }
  if (isFileRequest && url.pathname === '/timeline.json') {
    sendFile(request, response, path.join(buildDir, 'timeline.json'))
    return
  }
  if (isFileRequest && url.pathname === '/narration.wav') {
    sendFile(request, response, path.join(buildDir, 'narration.wav'))
    return
  }
  if (isFileRequest && url.pathname === '/output.webm') {
    sendFile(request, response, outputFile)
    return
  }
  if (isFileRequest && url.pathname === '/output.mp4') {
    sendFile(request, response, mp4File)
    return
  }
  if (isFileRequest && url.pathname.startsWith('/assets/')) {
    const requestedName = path.basename(decodeURIComponent(url.pathname.slice('/assets/'.length)))
    sendFile(request, response, path.join(assetsDir, requestedName))
    return
  }
  if (request.method === 'GET' && url.pathname === '/status') {
    let saved = false
    let bytes = 0
    if (existsSync(outputFile)) {
      const details = await stat(outputFile)
      saved = details.size > 0
      bytes = details.size
    }
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    const mp4Details = existsSync(mp4File) ? await stat(mp4File) : null
    response.end(JSON.stringify({
      saved,
      bytes,
      outputFile,
      mp4File,
      mp4Bytes: mp4Details?.size ?? 0,
    }))
    return
  }
  if (request.method === 'POST' && url.pathname === '/save') {
    const declaredLength = Number(request.headers['content-length'] ?? 0)
    if (declaredLength > maxUploadBytes) {
      response.writeHead(413, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'Recording is too large' }))
      return
    }
    const temporaryFile = `${outputFile}.partial`
    const destination = createWriteStream(temporaryFile)
    let received = 0
    let aborted = false
    request.on('data', (chunk) => {
      received += chunk.length
      if (received > maxUploadBytes) {
        aborted = true
        request.destroy()
        destination.destroy()
      }
    })
    request.pipe(destination)
    destination.on('finish', async () => {
      if (aborted) return
      const { rename } = await import('node:fs/promises')
      await rename(temporaryFile, outputFile)
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ saved: true, bytes: received, outputFile }))
    })
    destination.on('error', (error) => {
      response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ error: error.message }))
    })
    return
  }
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  response.end('Not found')
})

server.listen(port, '127.0.0.1', async () => {
  const timelinePath = path.join(buildDir, 'timeline.json')
  const timeline = existsSync(timelinePath)
    ? JSON.parse(await readFile(timelinePath, 'utf8'))
    : null
  console.log(JSON.stringify({
    url: `http://127.0.0.1:${port}/`,
    assetsDir,
    buildDir,
    outputFile,
    mp4File,
    duration: timeline?.duration ?? null,
  }))
})
