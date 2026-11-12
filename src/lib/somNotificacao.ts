// Som de notificação do chat: beep curto via WebAudio, mudo persistido
// em localStorage. Sem dependência de arquivos de áudio.
const CHAVE_MUDO = 'chat_som_mudo'

export function estaMudo(): boolean {
  try {
    return localStorage.getItem(CHAVE_MUDO) === '1'
  } catch {
    return false
  }
}

export function alternarMudo(): boolean {
  const novo = !estaMudo()
  try {
    localStorage.setItem(CHAVE_MUDO, novo ? '1' : '0')
  } catch {
    // sem localStorage: segue com estado em memória desta chamada
  }
  return novo
}

let ctxAudio: AudioContext | null = null

/** Toca um beep curto (2 notas descendo), estilo mensagem nova. */
export function tocarSomMensagem(): void {
  if (estaMudo()) return
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctxAudio = ctxAudio || new AC()
    if (ctxAudio.state === 'suspended') void ctxAudio.resume()
    const agora = ctxAudio.currentTime
    const osc = ctxAudio.createOscillator()
    const gain = ctxAudio.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, agora)
    osc.frequency.setValueAtTime(660, agora + 0.12)
    gain.gain.setValueAtTime(0.0001, agora)
    gain.gain.exponentialRampToValueAtTime(0.18, agora + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, agora + 0.3)
    osc.connect(gain).connect(ctxAudio.destination)
    osc.start(agora)
    osc.stop(agora + 0.32)
  } catch {
    // áudio indisponível: silencioso
  }
}
