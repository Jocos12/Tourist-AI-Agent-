// Voice I/O for Hodari — speech-to-speech via the Gemini SDK (server-side).
//
// Input:  the mic is recorded in the browser, converted to WAV, and POSTed to
//         /api/voice/transcribe, which runs Gemini speech-to-text.
// Output: reply text is POSTed to /api/voice/speak, which runs Gemini TTS and
//         returns WAV audio that we play here.
//
// The Gemini API key lives only in the server routes, never in the browser.

// ── Capability detection ─────────────────────────────────────────────────────

export function isSpeechInputSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== 'undefined'
  )
}

export function isSpeechOutputSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.Audio !== 'undefined'
}

// ── Voice activity broadcast (drives the reactive UI bubble) ─────────────────

export type VoiceActivity = 'idle' | 'listening' | 'speaking'
type ActivityListener = (state: VoiceActivity, level: number) => void

const activityListeners = new Set<ActivityListener>()
let activityState: VoiceActivity = 'idle'
let activityLevel = 0

/** Subscribe to voice activity (state + 0..1 audio level). Returns unsubscribe. */
export function subscribeVoiceActivity(cb: ActivityListener): () => void {
  activityListeners.add(cb)
  cb(activityState, activityLevel) // emit current immediately
  return () => { activityListeners.delete(cb) }
}

function emitActivity(state: VoiceActivity, level: number): void {
  activityState = state
  activityLevel = level
  activityListeners.forEach((l) => l(state, level))
}

function makeAudioContext(): AudioContext {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  return new AC()
}

// Real-time RMS level from a source node -> emits 'listening' + level each frame.
let micMeterStop: (() => void) | null = null
function startMicMeter(stream: MediaStream): void {
  try {
    const ctx = makeAudioContext()
    const src = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    let raf = 0
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v }
      emitActivity('listening', Math.min(1, Math.sqrt(sum / data.length) * 3.2))
      raf = requestAnimationFrame(tick)
    }
    tick()
    micMeterStop = () => {
      cancelAnimationFrame(raf)
      try { analyser.disconnect(); src.disconnect(); ctx.close() } catch { /* noop */ }
    }
  } catch {
    emitActivity('listening', 0)
  }
}
function stopMicMeter(): void {
  if (micMeterStop) { micMeterStop(); micMeterStop = null }
}

// ── Speech input (record -> Gemini STT) ──────────────────────────────────────

export interface Recorder {
  /** Stop recording, transcribe via Gemini, and resolve the transcript. */
  stop(): Promise<string>
  /** Abort recording and discard audio (no transcription). */
  cancel(): void
}

function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return undefined
}

/** Begin recording from the mic. Returns a handle to stop (and transcribe) or cancel. */
export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  recorder.start()
  startMicMeter(stream) // live level for the reactive bubble

  let done = false
  const teardown = () => {
    stream.getTracks().forEach((t) => t.stop())
    stopMicMeter()
    emitActivity('idle', 0)
  }

  return {
    async stop(): Promise<string> {
      if (done) return ''
      done = true
      const blob: Blob | null = await new Promise((resolve) => {
        recorder.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null)
        try { recorder.stop() } catch { resolve(null) }
      })
      teardown()
      if (!blob) return ''
      const wavBase64 = await blobToWavBase64(blob)
      return transcribe(wavBase64)
    },
    cancel(): void {
      if (done) return
      done = true
      try { recorder.stop() } catch { /* already stopped */ }
      teardown()
    },
  }
}

async function transcribe(wavBase64: string): Promise<string> {
  const res = await fetch('/api/voice/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64: wavBase64, mimeType: 'audio/wav' }),
  })
  if (!res.ok) throw new Error(`Transcription failed: ${res.status}`)
  const { text } = await res.json()
  return (text ?? '').trim()
}

// Decode the recorded clip and re-encode as mono 16-bit WAV — a format Gemini
// reliably accepts (browsers record webm/opus, which it does not).
async function blobToWavBase64(blob: Blob): Promise<string> {
  const arrayBuf = await blob.arrayBuffer()
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AC()
  try {
    const audioBuf = await ctx.decodeAudioData(arrayBuf)
    return arrayBufferToBase64(audioBufferToWav(audioBuf))
  } finally {
    ctx.close()
  }
}

function audioBufferToWav(buf: AudioBuffer): ArrayBuffer {
  const length = buf.length
  const sampleRate = buf.sampleRate
  // Downmix every channel to mono.
  const mono = new Float32Array(length)
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < length; i++) mono[i] += data[i] / buf.numberOfChannels
  }

  const bytesPerSample = 2
  const out = new ArrayBuffer(44 + length * bytesPerSample)
  const view = new DataView(out)
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + length * bytesPerSample, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)            // PCM
  view.setUint16(22, 1, true)            // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, length * bytesPerSample, true)

  let off = 44
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return out
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// ── Speech output (Gemini TTS -> play) ───────────────────────────────────────

// Strip markdown / emoji so the spoken text sounds natural.
function toSpeakable(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>~]/g, '')
    .replace(/^\s*\d+\.\s*/gm, '')
    .replace(/^\s*[-•›]\s*/gm, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

let currentAudio: HTMLAudioElement | null = null

/** Speak text aloud via Gemini TTS. Cancels any in-flight playback first. */
export async function speak(markdown: string): Promise<void> {
  if (!isSpeechOutputSupported()) return
  const text = toSpeakable(markdown)
  if (!text) return
  cancelSpeech()

  try {
    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return
    const blob = new Blob([await res.arrayBuffer()], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio
    const cleanup = () => {
      URL.revokeObjectURL(url)
      if (currentAudio === audio) {
        currentAudio = null
        emitActivity('idle', 0)
      }
    }
    audio.onended = cleanup
    audio.onerror = cleanup
    audio.onplay = () => { if (currentAudio === audio) emitActivity('speaking', 0.6) }
    await audio.play()
  } catch {
    /* playback is best-effort */
  }
}

export function cancelSpeech(): void {
  if (currentAudio) {
    try { currentAudio.pause() } catch { /* noop */ }
    currentAudio = null
  }
  emitActivity('idle', 0)
}
