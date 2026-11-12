// Badge de não lidas do Chat interno — usado no menu lateral (desktop + mobile).
import { useCallback, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { contarNaoLidas } from '@/services/chatMensagens'

export function useBadgeChatNaoLidas(ativo = true) {
  const [naoLidas, setNaoLidas] = useState(0)

  const atualizar = useCallback(async () => {
    const id = pb.authStore.record?.id
    if (!id) {
      setNaoLidas(0)
      return
    }
    try {
      setNaoLidas(await contarNaoLidas(id))
    } catch {
      // silencioso: badge é cosmético
    }
  }, [])

  useEffect(() => {
    if (!ativo) return
    atualizar()
    const interval = window.setInterval(atualizar, 5000)
    let unsub: (() => void) | undefined
    pb.collection('chat_mensagens')
      .subscribe('*', () => void atualizar())
      .then((u) => {
        unsub = u as () => void
      })
      .catch(() => undefined)
    return () => {
      window.clearInterval(interval)
      if (unsub) unsub()
      pb.collection('chat_mensagens').unsubscribe('*')
    }
  }, [ativo, atualizar])

  return { naoLidas, atualizar }
}
