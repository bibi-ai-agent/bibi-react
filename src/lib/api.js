const API_BASE = "https://bibi-app-rho.vercel.app"
const TURKISH_RULE = "KRİTİK: Her zaman sadece Türkçe kullan."

export async function callAI(systemPrompt, messages, maxTokens = 1000) {
  const finalSystem = systemPrompt ? `${TURKISH_RULE}\n\n${systemPrompt}` : TURKISH_RULE
  const apiMessages = [{ role: "system", content: finalSystem }]
  ;(messages || []).forEach(m => apiMessages.push({ role: m.role || "user", content: m.content }))
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: apiMessages, max_tokens: maxTokens, temperature: 0.7 })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || "API hatası")
  return data.choices?.[0]?.message?.content || ""
}

export function getImageStyle(age) {
  if (age <= 8) return "cartoon style, cute, colorful, simple, children's book illustration"
  if (age <= 12) return "colorful illustration, semi-realistic, educational style, vibrant"
  return "realistic, professional illustration, detailed, high quality"
}

export async function generateImageUrl(prompt, age) {
  const stylePrompt = getImageStyle(age)
  const translateRes = await callAI("You are an image prompt expert.", [{ role: "user", content: `Translate to English, max 15 words: "${prompt}"` }], 60)
  const englishPrompt = (translateRes?.trim() || prompt).replace(/['"*]/g, "").trim()
  const safePrompt = encodeURIComponent(`${englishPrompt}, ${stylePrompt}, high quality`)
  return `${API_BASE}/api/image?prompt=${safePrompt}&t=${Date.now()}`
}

export function detectTopic(text) {
  const t = text.toLowerCase()
  const topics = {
    "Matematik": ["matematik","hesap","sayı","toplama","çıkarma","çarpma","bölme","geometri","denklem"],
    "Fen": ["fen","bilim","fizik","kimya","biyoloji","atom","hücre","enerji","doğa","deney"],
    "Yabancı Dil": ["ingilizce","english","yabancı dil","fransızca","almanca","kelime","gramer"],
    "Tarih": ["tarih","osmanlı","atatürk","cumhuriyet","savaş","padişah","medeniyet"],
    "Sanat": ["sanat","resim","müzik","dans","tiyatro","şiir","yaratıcı"],
  }
  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some(k => t.includes(k))) return topic
  }
  return "Genel"
}

export function detectImageRequest(text) {
  const keywords = ["çiz","resim yap","görsel yap","resim çiz","illüstrasyon","draw","paint","picture","image","göster","çizim","karikatür"]
  return keywords.some(k => text.toLowerCase().includes(k))
}

export function isHomeworkQuestion(text) {
  const keywords = ["ödev","soru","hesapla","çöz","bul","kaç","nedir","nasıl","açıkla","anlat"]
  return keywords.some(k => text.toLowerCase().includes(k))
}