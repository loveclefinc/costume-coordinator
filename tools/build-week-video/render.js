const canvas = document.querySelector('#stage')
const context = canvas.getContext('2d', { alpha: false })
const renderButton = document.querySelector('#render')
const statusText = document.querySelector('#status')
const progress = document.querySelector('#progress')

const timeline = await fetch('/timeline.json', { cache: 'no-store' }).then((response) => response.json())
const images = new Map()
for (const scene of timeline.scenes) {
  if (!scene.image || images.has(scene.image)) continue
  const image = new Image()
  image.src = `/assets/${encodeURIComponent(scene.image)}`
  await image.decode()
  images.set(scene.image, image)
}

function roundedRect(x, y, width, height, radius) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function wrapLines(text, maxWidth, maxLines = 3) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate
      continue
    }
    lines.push(line)
    line = word
    if (lines.length === maxLines - 1) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  return lines
}

function drawImageScene(scene, localTime) {
  const image = images.get(scene.image)
  if (!image) return
  const progress = Math.max(0, Math.min(1, localTime / Math.max(1, scene.duration)))
  const scale = 1 + progress * 0.018
  const width = canvas.width * scale
  const height = canvas.height * scale
  const x = (canvas.width - width) / 2
  const y = (canvas.height - height) / 2 - progress * 4
  context.drawImage(image, x, y, width, height)
}

function drawBeforeAfter() {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#111b31')
  gradient.addColorStop(1, '#38213a')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#fff'
  context.font = '800 48px -apple-system, BlinkMacSystemFont, sans-serif'
  context.fillText('Build Week: what changed', 72, 112)
  const cards = [
    { x: 72, title: 'BEFORE BUILD WEEK', color: '#93a4bd', lines: ['Single-item wardrobe & search', 'Invitations and online submission', 'Deterministic group assignment'] },
    { x: 656, title: 'BUILT / EXTENDED THIS WEEK', color: '#ff8da1', lines: ['Reviewed on-device photo input', 'Favorite and suggested complete outfits', 'Multi-item submission and result display'] },
  ]
  for (const card of cards) {
    context.fillStyle = '#ffffff10'
    roundedRect(card.x, 162, 552, 390, 28)
    context.fill()
    context.strokeStyle = `${card.color}88`
    context.lineWidth = 2
    context.stroke()
    context.fillStyle = card.color
    context.font = '800 22px -apple-system, BlinkMacSystemFont, sans-serif'
    context.fillText(card.title, card.x + 34, 214)
    context.fillStyle = '#f8fafc'
    context.font = '650 27px -apple-system, BlinkMacSystemFont, sans-serif'
    card.lines.forEach((line, index) => context.fillText(`• ${line}`, card.x + 34, 282 + index * 76))
  }
}

function drawDevelopment(kind) {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#101a2d')
  gradient.addColorStop(1, kind === 'validation' ? '#17352f' : '#41233f')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#ff8da1'
  context.font = '800 22px -apple-system, BlinkMacSystemFont, sans-serif'
  context.fillText(kind === 'validation' ? 'VERIFICATION' : 'DEVELOPMENT-TIME AI', 72, 86)
  context.fillStyle = '#fff'
  context.font = '800 48px -apple-system, BlinkMacSystemFont, sans-serif'
  context.fillText(kind === 'validation' ? 'Production-shaped and tested' : 'GPT-5.6 + Codex built the extension', 72, 150)
  const rows = kind === 'validation'
    ? [
        ['424 tests / 56 files', 'Type check, Worker check, and production build passed'],
        ['Runtime: no OpenAI API', 'No API key, model inference, or per-use token cost'],
        ['Private by default', 'Photo attributes and outfit suggestions run on device'],
      ]
    : [
        ['GPT-5.6 Sol', 'PM, product decisions, privacy, security, and review'],
        ['GPT-5.6 Luna', 'Implementation across the React and TypeScript codebase'],
        ['Codex', 'Repository audit, edits, tests, builds, docs, and Git history'],
      ]
  rows.forEach(([title, detail], index) => {
    const y = 210 + index * 118
    context.fillStyle = '#ffffff12'
    roundedRect(72, y, 1136, 92, 22)
    context.fill()
    context.fillStyle = '#fff'
    context.font = '800 28px -apple-system, BlinkMacSystemFont, sans-serif'
    context.fillText(title, 104, y + 38)
    context.fillStyle = '#d5deec'
    context.font = '500 22px -apple-system, BlinkMacSystemFont, sans-serif'
    context.fillText(detail, 104, y + 70)
  })
}

function drawOutro() {
  const gradient = context.createRadialGradient(640, 300, 40, 640, 300, 760)
  gradient.addColorStop(0, '#4b2945')
  gradient.addColorStop(1, '#0d1728')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.textAlign = 'center'
  context.fillStyle = '#ff8da1'
  context.font = '800 24px -apple-system, BlinkMacSystemFont, sans-serif'
  context.fillText('OPENAI BUILD WEEK 2026', 640, 188)
  context.fillStyle = '#fff'
  context.font = '850 72px -apple-system, BlinkMacSystemFont, sans-serif'
  context.fillText('Ensemble AI', 640, 292)
  context.fillStyle = '#dce5f2'
  context.font = '600 29px -apple-system, BlinkMacSystemFont, sans-serif'
  context.fillText('Complete group outfits from real wardrobes', 640, 354)
  context.font = '500 23px -apple-system, BlinkMacSystemFont, sans-serif'
  context.fillText('Human-reviewed · Explainable · Private by default · No per-use token cost', 640, 430)
  context.textAlign = 'left'
}

function drawChrome(scene, time) {
  context.fillStyle = '#0b1220d9'
  roundedRect(24, 20, 500, 48, 18)
  context.fill()
  context.fillStyle = '#ff9bad'
  context.font = '800 18px -apple-system, BlinkMacSystemFont, sans-serif'
  context.fillText(scene.label, 46, 51)

  context.fillStyle = '#0b1220d9'
  roundedRect(1130, 20, 126, 48, 18)
  context.fill()
  context.fillStyle = '#eef2f7'
  context.font = '700 17px ui-monospace, SFMono-Regular, monospace'
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60).toString().padStart(2, '0')
  context.fillText(`${minutes}:${seconds}`, 1164, 51)

  context.fillStyle = '#07101dea'
  context.fillRect(0, 598, canvas.width, 122)
  context.fillStyle = '#fff'
  context.font = '650 25px -apple-system, BlinkMacSystemFont, sans-serif'
  context.textAlign = 'center'
  const lines = wrapLines(scene.subtitle, 1120, 3)
  lines.forEach((line, index) => context.fillText(line, 640, 642 + index * 34))
  context.textAlign = 'left'
}

function sceneAt(time) {
  return timeline.scenes.find((scene) => time >= scene.start && time < scene.end) ?? timeline.scenes.at(-1)
}

function draw(time) {
  const scene = sceneAt(time)
  const localTime = Math.max(0, time - scene.start)
  context.fillStyle = '#101827'
  context.fillRect(0, 0, canvas.width, canvas.height)
  if (scene.kind === 'image') drawImageScene(scene, localTime)
  else if (scene.kind === 'before-after') drawBeforeAfter()
  else if (scene.kind === 'development' || scene.kind === 'validation') drawDevelopment(scene.kind)
  else drawOutro()
  drawChrome(scene, time)
}

draw(0)
statusText.textContent = `Ready — ${timeline.duration.toFixed(1)} seconds, Japanese narration + burned-in English subtitles`

renderButton.addEventListener('click', async () => {
  renderButton.disabled = true
  statusText.textContent = 'Rendering in real time…'
  const audio = new Audio('/narration.wav')
  audio.preload = 'auto'
  await new Promise((resolve, reject) => {
    audio.addEventListener('canplaythrough', resolve, { once: true })
    audio.addEventListener('error', reject, { once: true })
    audio.load()
  })

  const audioContext = new AudioContext({ sampleRate: 44100 })
  const audioSource = audioContext.createMediaElementSource(audio)
  const audioDestination = audioContext.createMediaStreamDestination()
  audioSource.connect(audioDestination)
  await audioContext.resume()

  const canvasStream = canvas.captureStream(30)
  const stream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDestination.stream.getAudioTracks(),
  ])
  const preferredTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type))
  if (!mimeType) throw new Error('This browser cannot encode a WebM recording')
  const chunks = []
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5_500_000,
    audioBitsPerSecond: 128_000,
  })
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size) chunks.push(event.data)
  })

  let animationFrame = 0
  const animate = () => {
    draw(audio.currentTime)
    progress.value = Math.min(1, audio.currentTime / timeline.duration)
    animationFrame = requestAnimationFrame(animate)
  }

  const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve, { once: true }))
  recorder.start(1000)
  animate()
  await audio.play()
  await new Promise((resolve) => audio.addEventListener('ended', resolve, { once: true }))
  draw(timeline.duration)
  await new Promise((resolve) => setTimeout(resolve, 250))
  recorder.stop()
  await stopped
  cancelAnimationFrame(animationFrame)
  stream.getTracks().forEach((track) => track.stop())
  await audioContext.close()

  statusText.textContent = 'Saving recording…'
  const recording = new Blob(chunks, { type: mimeType })
  const response = await fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': mimeType },
    body: recording,
  })
  if (!response.ok) throw new Error(`Save failed: ${response.status}`)
  const result = await response.json()
  progress.value = 1
  statusText.textContent = `Complete — ${(result.bytes / 1024 / 1024).toFixed(1)} MB saved locally`
  document.title = 'COMPLETE — Ensemble AI video'
})
