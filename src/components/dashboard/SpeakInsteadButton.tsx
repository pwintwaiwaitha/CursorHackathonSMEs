import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic } from 'lucide-react'
import type { PreferredLanguage } from '../../types/models'
import { bilingualLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { speechSupported, startNoteDictation } from '../../lib/speechNotes'

export function SpeakInsteadButton({ language }: { language: PreferredLanguage }) {
  const navigate = useNavigate()
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
      setMessage(bilingualLine(DASHBOARD_COPY.speechUnsupported, language))
      return
    }
    if (listening) {
      stop()
      return
    }
    setMessage(bilingualLine(DASHBOARD_COPY.speechHint, language))
    setListening(true)
    const handle = startNoteDictation({
      language,
      onTranscript: (text) => {
        navigate(`/check-in?notes=${encodeURIComponent(text)}`)
      },
      onEnd: () => {
        session.current = null
        setListening(false)
      },
    })
    if (!handle) {
      setListening(false)
      setMessage(bilingualLine(DASHBOARD_COPY.speechUnsupported, language))
      return
    }
    session.current = handle
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onSpeak}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-bank-blue-light px-4 text-base font-semibold text-navy"
      >
        <Mic size={20} />
        {listening
          ? bilingualLine(DASHBOARD_COPY.listening, language)
          : bilingualLine(DASHBOARD_COPY.speakInstead, language)}
      </button>
      {message ? (
        <p className="text-base text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
