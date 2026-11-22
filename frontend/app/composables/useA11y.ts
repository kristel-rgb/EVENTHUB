// Ajustes de accesibilidad: tema, alto contraste, tamaño de letra y animaciones.
// Se guardan en una cookie propia por 12 meses, así se aplican desde el primer
// momento al volver a abrir el sitio (sin parpadeo, porque el servidor ya los lee).

export type ThemeMode = 'light' | 'dark' | 'system'

export interface A11ySettings {
  theme: ThemeMode
  contrast: 'normal' | 'high'
  fontScale: number
  motion: 'normal' | 'reduce'
}

/** Tamaños de letra disponibles (1 = 100 %) */
export const FONT_SCALES = [1, 1.125, 1.25, 1.375, 1.5]

export const A11Y_DEFAULTS: A11ySettings = { theme: 'light', contrast: 'normal', fontScale: 1, motion: 'normal' }

const COOKIE = 'eh_a11y'
const cookieOptions = { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' as const }

/** Limpia lo que venga en la cookie para que siempre sea un ajuste válido */
function sanitize(raw: Partial<A11ySettings> | null | undefined): A11ySettings {
  const r = raw ?? {}
  return {
    theme: r.theme === 'dark' || r.theme === 'system' ? r.theme : 'light',
    contrast: r.contrast === 'high' ? 'high' : 'normal',
    fontScale: FONT_SCALES.includes(Number(r.fontScale)) ? Number(r.fontScale) : 1,
    motion: r.motion === 'reduce' ? 'reduce' : 'normal',
  }
}

/** Ajustes compartidos por toda la app (el menú los cambia, app.vue los aplica) */
export function useA11y() {
  const settings = useState<A11ySettings>('a11y', () =>
    sanitize(useCookie<Partial<A11ySettings> | null>(COOKIE, cookieOptions).value),
  )

  function setFontScale(direction: 1 | -1) {
    const i = FONT_SCALES.indexOf(settings.value.fontScale)
    const next = FONT_SCALES[Math.min(FONT_SCALES.length - 1, Math.max(0, i + direction))]
    settings.value = { ...settings.value, fontScale: next ?? 1 }
  }

  function reset() {
    settings.value = { ...A11Y_DEFAULTS }
  }

  return { settings, setFontScale, reset }
}

/**
 * Aplica los ajustes al <html> y los guarda en la cookie cuando cambian.
 * Se llama una sola vez, en app.vue.
 */
export function useA11yRoot() {
  const { settings } = useA11y()
  const cookie = useCookie<A11ySettings>(COOKIE, cookieOptions)

  watch(settings, (value) => { cookie.value = { ...value } }, { deep: true })

  useHead({
    htmlAttrs: {
      'data-theme': () => settings.value.theme,
      'data-contrast': () => (settings.value.contrast === 'high' ? 'high' : undefined),
      'data-motion': () => (settings.value.motion === 'reduce' ? 'reduce' : undefined),
      'style': () => `--font-scale: ${settings.value.fontScale}`,
    },
  })
}
