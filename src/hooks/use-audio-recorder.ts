import { useState, useRef, useEffect, useCallback } from 'react'
import { pedirPermissaoMicrofone, type EstadoPermissaoMicrofone } from '@/lib/permissoesMicrofone'

export interface UseAudioRecorderReturn {
  gravando: boolean
  pausado: boolean
  tempoSegundos: number
  audioBlob: Blob | null
  audioUrl: string | null
  transcricaoParcial: string
  suportaSpeech: boolean
  iniciarGravacao: () => Promise<void>
  pausarGravacao: () => void
  retomarGravacao: () => void
  pararGravacao: () => Promise<Blob | null>
  descartarGravacao: () => void
  setTranscricaoParcial: (texto: string) => void
  erroGravacao: string | null
  /** Nome do erro da última falha de getUserMedia (NotAllowedError etc.). */
  erroGravacaoNome: string | null
  /**
   * Pede o microfone proativamente SEM começar a gravar (chamado ao abrir o
   * modal, para o popup de autorização aparecer no primeiro uso). Se o usuário
   * conceder, o stream fica guardado e o próximo iniciarGravacao() o reusa —
   * sem abrir uma segunda vez. Devolve o estado da permissão.
   */
  solicitarPermissaoProativa: () => Promise<EstadoPermissaoMicrofone>
}

/** Estado em que o stream proativo ficou guardado (para reuso pelo iniciarGravacao). */
interface StreamProativo {
  stream: MediaStream | null
  /** true se o stream guardado ainda tem tracks vivas. */
  valido: boolean
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [gravando, setGravando] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [tempoSegundos, setTempoSegundos] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [transcricaoParcial, setTranscricaoParcial] = useState('')
  const [erroGravacao, setErroGravacao] = useState<string | null>(null)
  const [erroGravacaoNome, setErroGravacaoNome] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerIntervalRef = useRef<number | null>(null)
  const speechRecognitionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Stream obtido na permissão proativa (ao abrir o modal) — reusado pelo iniciarGravacao.
  const streamProativoRef = useRef<StreamProativo>({ stream: null, valido: false })

  const [suportaSpeech, setSuportaSpeech] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setSuportaSpeech(!!SpeechRecognition)
    }
  }, [])

  // Limpa o timer
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }

  // Iniciar timer
  const startTimer = () => {
    stopTimer()
    timerIntervalRef.current = window.setInterval(() => {
      setTempoSegundos((prev) => prev + 1)
    }, 1000)
  }

  const iniciarGravacao = useCallback(async () => {
    setErroGravacao(null)
    setErroGravacaoNome(null)
    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setTempoSegundos(0)
    chunksRef.current = []

    try {
      // Reusa o stream proativo obtido ao abrir o modal (se ainda estiver vivo)
      // em vez de abrir uma segunda permissão/stream.
      let stream: MediaStream | null = null
      const proativo = streamProativoRef.current
      if (
        proativo.stream &&
        proativo.stream.getAudioTracks().some((t) => t.readyState === 'live')
      ) {
        stream = proativo.stream
      } else if (proativo.stream) {
        // Stream guardado ficou morto (tracks encerradas): não guarda mais.
        streamProativoRef.current = { stream: null, valido: false }
      }

      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      }
      streamProativoRef.current = { stream: null, valido: false }
      streamRef.current = stream

      // Seleciona mimeType suportado
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4'
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg'
        else mimeType = ''
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.start(1000) // fatia a cada 1s
      setGravando(true)
      setPausado(false)
      startTimer()

      // Inicia reconhecimento de fala no browser se disponível (pt-BR)
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = 'pt-BR'

          recognition.onresult = (event: any) => {
            let textoAcumulado = ''
            for (let i = 0; i < event.results.length; i++) {
              textoAcumulado += event.results[i][0].transcript + ' '
            }
            if (textoAcumulado.trim()) {
              setTranscricaoParcial(textoAcumulado.trim())
            }
          }

          recognition.onerror = (e: any) => {
            console.warn('Reconhecimento de fala local aviso:', e.error)
          }

          recognition.onend = () => {
            // Se ainda estiver gravando e não pausado, tenta reiniciar o recognition
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              try {
                recognition.start()
              } catch {
                /* intentionally ignored */
              }
            }
          }

          recognition.start()
          speechRecognitionRef.current = recognition
        } catch (speechErr) {
          console.warn('Não foi possível iniciar Web Speech API:', speechErr)
        }
      }
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err)
      const negado =
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.name === 'SecurityError'
      const msg = negado
        ? 'Permissão de microfone negada. Autorize o acesso ao microfone no navegador.'
        : 'Não foi possível acessar o dispositivo de áudio/microfone.'
      setErroGravacao(msg)
      setErroGravacaoNome(err.name || 'ErroDesconhecido')
      throw new Error(msg)
    }
  }, [audioUrl])

  const pausarGravacao = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setPausado(true)
      stopTimer()
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop()
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }, [])

  const retomarGravacao = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setPausado(false)
      startTimer()
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start()
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }, [])

  /**
   * Pede o microfone proativamente SEM começar a gravar (chamado ao abrir o
   * modal da Nova Reunião, para o popup de autorização aparecer no primeiro
   * uso). Se o usuário conceder, o stream fica guardado em streamProativoRef
   * e o próximo iniciarGravacao() o reusa — sem abrir getUserMedia 2x.
   */
  const solicitarPermissaoProativa = useCallback(async (): Promise<EstadoPermissaoMicrofone> => {
    // Já gravando ou já com stream vivo: nada a pedir, permissão concedida.
    if (
      gravando ||
      (streamRef.current && streamRef.current.getAudioTracks().some((t) => t.readyState === 'live'))
    ) {
      return 'concedida'
    }
    // Stream proativo vivo guardado de uma abertura anterior: reuso sem novo prompt.
    const proativo = streamProativoRef.current
    if (proativo.stream && proativo.stream.getAudioTracks().some((t) => t.readyState === 'live')) {
      return 'concedida'
    }
    // Descarta stream guardado que tenha morrido entre aberturas.
    if (proativo.stream) {
      streamProativoRef.current = { stream: null, valido: false }
    }

    setErroGravacao(null)
    setErroGravacaoNome(null)

    const resultado = await pedirPermissaoMicrofone()
    if (resultado.stream) {
      streamProativoRef.current = { stream: resultado.stream, valido: true }
      return 'concedida'
    }
    if (resultado.estado === 'negada') {
      setErroGravacaoNome(resultado.erroNome || 'NotAllowedError')
      return 'negada'
    }
    return resultado.estado
  }, [gravando])

  const pararGravacao = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      stopTimer()

      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop()
        } catch {
          /* intentionally ignored */
        }
        speechRecognitionRef.current = null
      }

      const recorder = mediaRecorderRef.current
      if (!recorder) {
        setGravando(false)
        setPausado(false)
        resolve(null)
        return
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setGravando(false)
        setPausado(false)

        // Encerra as tracks do microfone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        resolve(blob)
      }

      if (recorder.state !== 'inactive') {
        recorder.stop()
      } else {
        setGravando(false)
        setPausado(false)
        resolve(null)
      }
    })
  }, [])

  const descartarGravacao = useCallback(() => {
    stopTimer()
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop()
      } catch {
        /* intentionally ignored */
      }
      speechRecognitionRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        /* intentionally ignored */
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (streamProativoRef.current.stream) {
      streamProativoRef.current.stream.getTracks().forEach((track) => track.stop())
      streamProativoRef.current = { stream: null, valido: false }
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }

    setGravando(false)
    setPausado(false)
    setTempoSegundos(0)
    setAudioBlob(null)
    setAudioUrl(null)
    setTranscricaoParcial('')
    setErroGravacao(null)
    setErroGravacaoNome(null)
    chunksRef.current = []
  }, [audioUrl])

  // Cleanup geral ao desmontar componente
  useEffect(() => {
    return () => {
      stopTimer()
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop()
        } catch {
          /* intentionally ignored */
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (streamProativoRef.current.stream) {
        streamProativoRef.current.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return {
    gravando,
    pausado,
    tempoSegundos,
    audioBlob,
    audioUrl,
    transcricaoParcial,
    suportaSpeech,
    iniciarGravacao,
    pausarGravacao,
    retomarGravacao,
    pararGravacao,
    descartarGravacao,
    setTranscricaoParcial,
    erroGravacao,
    erroGravacaoNome,
    solicitarPermissaoProativa,
  }
}
