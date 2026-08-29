export interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

export function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') {
    return null
  }
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

export function speechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null
}

export function startNoteDictation(options: {
  language: 'en' | 'my'
  onTranscript: (text: string) => void
  onEnd: () => void
}): { stop: () => void } | null {
  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor) {
    return null
  }
  const recognition = new Ctor()
  recognition.lang = options.language === 'my' ? 'my-MM' : 'en-US'
  recognition.interimResults = false
  recognition.continuous = false
  recognition.onresult = (event) => {
    const first = event.results[0]?.[0]?.transcript?.trim()
    if (first) {
      options.onTranscript(first)
    }
  }
  recognition.onerror = () => {
    options.onEnd()
  }
  recognition.onend = () => {
    options.onEnd()
  }
  recognition.start()
  return {
    stop: () => {
      try {
        recognition.stop()
      } catch {
        options.onEnd()
      }
    },
  }
}
