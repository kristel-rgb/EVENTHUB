// Lector de códigos QR con la cámara.
// Usa el BarcodeDetector del navegador cuando existe (Chrome y Android) y, si no, jsQR (iPhone, Firefox).
// La cámara solo funciona en https o en localhost.

type Detector = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>

async function makeDetector(): Promise<Detector> {
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
  if (BD) {
    const d = new BD({ formats: ['qr_code'] })
    return async (video) => {
      const found = await d.detect(video)
      return found[0]?.rawValue ?? null
    }
  }
  const { default: jsQR } = await import('jsqr')
  return async (video, canvas) => {
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return null
    // Se lee una versión reducida: es más rápido y alcanza para un QR en pantalla
    const scale = Math.min(1, 640 / Math.max(w, h))
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
}

export interface QrScanner {
  stop: () => void
  pause: () => void
  resume: () => void
}

export type ScannerError = 'not-supported' | 'denied' | 'no-camera' | 'insecure' | 'unknown'

/** Enciende la cámara trasera y llama a onCode cada vez que lee un QR */
export async function startQrScanner(video: HTMLVideoElement, onCode: (text: string) => void): Promise<QrScanner> {
  if (!window.isSecureContext) throw Object.assign(new Error('insecure'), { kind: 'insecure' as ScannerError })
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('not-supported'), { kind: 'not-supported' as ScannerError })

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
  }
  catch (err) {
    const name = (err as DOMException).name
    const kind: ScannerError = name === 'NotAllowedError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'no-camera' : 'unknown'
    throw Object.assign(new Error(kind), { kind })
  }

  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.muted = true
  await video.play()

  const detect = await makeDetector()
  const canvas = document.createElement('canvas')
  let running = true
  let paused = false
  let busy = false
  let timer = 0

  const tick = async () => {
    if (!running) return
    if (!paused && !busy && video.readyState >= 2) {
      busy = true
      try {
        const text = await detect(video, canvas)
        if (text && !paused) onCode(text)
      }
      catch { /* un cuadro que no se pudo leer: se sigue con el siguiente */ }
      busy = false
    }
    timer = window.setTimeout(tick, 180)
  }
  tick()

  return {
    stop() {
      running = false
      clearTimeout(timer)
      stream.getTracks().forEach(t => t.stop())
      video.srcObject = null
    },
    pause() { paused = true },
    resume() { paused = false },
  }
}

export const scannerErrorText: Record<ScannerError, string> = {
  'insecure': 'La cámara solo funciona en una conexión segura (https). Podés escribir el código de la entrada.',
  'not-supported': 'Este navegador no permite usar la cámara. Podés escribir el código de la entrada.',
  'denied': 'No diste permiso para usar la cámara. Activalo en la configuración del navegador o escribí el código de la entrada.',
  'no-camera': 'No encontramos una cámara en este dispositivo. Podés escribir el código de la entrada.',
  'unknown': 'No pudimos encender la cámara. Podés escribir el código de la entrada.',
}

/** Vibración y sonido corto (distintos para válida y rechazada) */
export function scanFeedback(ok: boolean, sound: boolean) {
  try { navigator.vibrate?.(ok ? 120 : [90, 60, 90, 60, 160]) }
  catch { /* sin vibración */ }
  if (!sound) return
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const notes = ok ? [880, 1320] : [220, 180]
    notes.forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = ok ? 'sine' : 'square'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.14)
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.14 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.14 + 0.13)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.14)
      o.stop(ctx.currentTime + i * 0.14 + 0.14)
    })
    setTimeout(() => ctx.close(), 600)
  }
  catch { /* sin sonido */ }
}
