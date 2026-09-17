import { useCallback, useEffect, useRef, useState } from 'react'

// ---------- Speech Recognition (voice input) ----------
// Uses the browser-native Web Speech API. No audio leaves the device.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognitionCtor: any =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null

export function useSpeechRecognition(onResult: (text: string, isFinal: boolean) => void) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(!!SpeechRecognitionCtor)
  const recogRef = useRef<InstanceType<typeof SpeechRecognitionCtor> | null>(null)

  useEffect(() => {
    if (!SpeechRecognitionCtor) return
    const recog = new SpeechRecognitionCtor()
    recog.lang = 'zh-CN'
    recog.continuous = true
    recog.interimResults = true

    recog.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript
        if (e.results[i].isFinal) final += transcript
        else interim += transcript
      }
      if (final) onResult(final, true)
      else if (interim) onResult(interim, false)
    }
    recog.onerror = () => setListening(false)
    recog.onend = () => setListening(false)
    recogRef.current = recog
    return () => {
      try {
        recog.stop()
      } catch {
        /* noop */
      }
    }
  }, [onResult])

  const start = useCallback(() => {
    if (!recogRef.current || listening) return
    try {
      recogRef.current.start()
      setListening(true)
    } catch {
      /* already started */
    }
  }, [listening])

  const stop = useCallback(() => {
    if (!recogRef.current) return
    try {
      recogRef.current.stop()
    } catch {
      /* noop */
    }
    setListening(false)
  }, [])

  return { listening, supported, start, stop }
}

// ---------- Speech Synthesis (voice output / TTS) ----------
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(
    typeof window !== 'undefined' && 'speechSynthesis' in window,
  )

  const cancel = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text) return
      cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'zh-CN'
      utter.rate = 1
      utter.pitch = 1
      utter.onend = () => setSpeaking(false)
      utter.onerror = () => setSpeaking(false)
      setSpeaking(true)
      window.speechSynthesis.speak(utter)
    },
    [supported, cancel],
  )

  useEffect(() => () => cancel(), [cancel])

  return { speaking, supported, speak, cancel }
}
