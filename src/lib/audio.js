// ElevenLabs sesleri — Free plan ile çalışanlar
export const ELEVENLABS_VOICES = [
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Erkek Ses", label: "Erkek — Türkçe", gender: "male" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Kadın Ses", label: "Kadın — Türkçe", gender: "female" },
]

// Çocuğun cinsiyetine göre otomatik ses seç
export function getVoiceForChild(child) {
  if (child?.gender === 'kız') return "EXAVITQu4vr4xnSDxMaL"
  return "TX3LPaxmHKxFdv7VOQHJ"
}

export function cleanText(text) {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/━+/g, " ")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export async function speakElevenLabs(text, voiceId, onEnd) {
  const res = await fetch("https://bibi-app-rho.vercel.app/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voiceId, text })
  })
  if (!res.ok) throw new Error("TTS hatası: " + res.status)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.onended = () => { URL.revokeObjectURL(url); onEnd?.() }
  audio.oncanplaythrough = () => audio.play().catch(() => {})
  audio.load()
  return audio
}

export function speakBrowser(text, age, onEnd) {
  if (!window.speechSynthesis) return null
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = "tr-TR"
  if (age <= 8) { u.rate = 0.82; u.pitch = 1.45 }
  else if (age <= 12) { u.rate = 0.88; u.pitch = 1.20 }
  else { u.rate = 0.92; u.pitch = 1.05 }
  const voices = window.speechSynthesis.getVoices()
  const trVoice = voices.find(v => v.lang.startsWith("tr"))
  if (trVoice) u.voice = trVoice
  u.onend = onEnd
  window.speechSynthesis.speak(u)
  return u
}
