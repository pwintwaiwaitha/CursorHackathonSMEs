import { useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { speechSupported, startNoteDictation } from '../../lib/speechNotes'

export function SpeakInsteadButton({
  language,
  onTranscript,
  large = false,
  label,
}: {
  language: PreferredLanguage
  onTranscript?: (text: string) => void
  large?: boolean
  label?: string
}) {
  const [listening, setListening] = useState(false)
  const [message, setMessage] = useState('')
  const session = useRef<{ stop: () => void } | null>(null)

  function stop() {
    session.current?.stop()
    session.current = null
    setListening(false)
  }

  function onSpeak() {
    if (!speechSupported()) {
      setMessage(pickLine(DASHBOARD_COPY.speechUnsupported, language))
      return
    }
    if (listening) {
      stop()
      return
    }
    setMessage(pickLine(DASHBOARD_COPY.speechHint, language))
    setListening(true)
    const handle = startNoteDictation({
      language,
      onTranscript: (text) => {
        onTranscript?.(text)
      },
      onEnd: () => {
        session.current = null
        setListening(false)
      },
    })
    if (!handle) {
      setListening(false)
      setMessage(pickLine(DASHBOARD_COPY.speechUnsupported, language))
      return
    }
    session.current = handle
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onSpeak}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-md bg-healthy-bg px-4 text-base font-semibold text-navy ${
          large ? 'min-h-14' : 'min-h-11'
        }`}
      >
        <Mic size={large ? 24 : 20} />
        {listening
          ? pickLine(DASHBOARD_COPY.listening, language)
          : (label ?? pickLine(DASHBOARD_COPY.speakInstead, language))}
      </button>
      {message ? (
        <p className="text-base text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
