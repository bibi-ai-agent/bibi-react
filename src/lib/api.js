const API_BASE = "https://bibi-app-rho.vercel.app"

// KATMAN 5 — DERİN HAFIZA SİSTEMİ
export async function getChildMemory(sb, childId) {
  if (!sb || !childId) return null
  try {
    const { data } = await sb.from('child_memory').select('*').eq('child_id', childId).maybeSingle()
    return data
  } catch { return null }
}

export async function updateChildMemory(sb, childId, classification, reply, userMessage) {
  if (!sb || !childId) return
  try {
    const { data: existing } = await sb.from('child_memory').select('*').eq('child_id', childId).maybeSingle()
    const konu = classification?.konu || 'gunluk'
    const duygu = classification?.duygu || 'normal'
    const strong = existing?.strong_topics || []
    const weak = existing?.weak_topics || []
    const emotional = existing?.emotional_profile || {}
    const patterns = existing?.interaction_patterns || {}
    if (['matematik','fen','tarih','dil','sanat'].includes(konu)) {
      if (userMessage.length > 30 && !strong.includes(konu)) strong.push(konu)
    }
    emotional[duygu] = (emotional[duygu] || 0) + 1
    const hour = new Date().getHours()
    const slot = hour < 12 ? 'sabah' : hour < 17 ? 'ogle' : hour < 21 ? 'aksam' : 'gece'
    patterns[slot] = (patterns[slot] || 0) + 1
    await sb.from('child_memory').upsert({ child_id: childId, strong_topics: strong, weak_topics: weak, emotional_profile: emotional, interaction_patterns: patterns, updated_at: new Date().toISOString() }, { onConflict: 'child_id' })
  } catch(e) { console.error('Hafiza hatasi:', e) }
}

export function buildMemoryContext(memory) {
  if (!memory) return ''
  const parts = []
  if (memory.strong_topics?.length) parts.push('• Guclu konular: ' + memory.strong_topics.join(', '))
  if (memory.weak_topics?.length) parts.push('• Zorlandi konular: ' + memory.weak_topics.join(', ') + ' — daha sabirl i ol')
  if (memory.emotional_profile) {
    const dom = Object.entries(memory.emotional_profile).sort((a,b) => b[1]-a[1])[0]
    if (dom) parts.push('• Genel duygu: ' + dom[0])
  }
  if (memory.interaction_patterns) {
    const dom = Object.entries(memory.interaction_patterns).sort((a,b) => b[1]-a[1])[0]
    if (dom) parts.push('• En aktif: ' + dom[0])
  }
  if (!parts.length) return ''
  return '\n\nKISISEL HAFIZA:\n' + parts.join('\n') + '\nBu bilgileri dogal yansit.'
}

// KATMAN 1 — GİRDİ ANALİZİ (client-side, API çağrısı yok)
export function classifyMessage(text, childAge) {
  const t = text.toLowerCase()

  // Konu tespiti
  let konu = 'gunluk'
  if (/matematik|hesap|sayi|toplama|cikarma|carpma|bolme|geometri|denklem|kac|oran|kesir/.test(t)) konu = 'matematik'
  else if (/fen|fizik|kimya|biyoloji|atom|hucre|enerji|deney|evrim|gezegen|bilim/.test(t)) konu = 'fen'
  else if (/ingilizce|kelime|gramer|yabanci|fransizca|almanca|cevir/.test(t)) konu = 'dil'
  else if (/tarih|osmanli|ataturk|cumhuriyet|savas|padisah|medeniyet/.test(t)) konu = 'tarih'
  else if (/sanat|resim|muzik|dans|siir|yaratici|ciz/.test(t)) konu = 'sanat'
  else if (/uzgum|uzgun|agladk|mutsuz|kotu|korku|kaygi|stres|yalniz/.test(t)) konu = 'duygu'
  else if (/meslek|kariyer|buyuyunce|olmak istiyorum|hayalim/.test(t)) konu = 'kariyer'
  else if (/hayal|yarat|fikir|mucit|icat/.test(t)) konu = 'yaraticilik'

  // Derinlik tespiti
  let derinlik = 'yuzeysel'
  if (text.length > 100 || /neden|nasil|niye|acikla|anlat|detay|derinlemesine/.test(t)) derinlik = 'orta'
  if (text.length > 200 || /karsilastir|analiz|elestir|felsefi|dusuncesi|mantigi/.test(t)) derinlik = 'derin'

  // Niyet tespiti
  let niyet = 'konusma'
  if (/odev|sinav|test|soru|problem|coz|hesapla/.test(t)) niyet = 'odev'
  else if (/nedir|nasil|neden|anlat|acikla|ogret/.test(t)) niyet = 'anlama'
  else if (/dogru mu|yanlis mi|iyi mi|guzel mi|begendin mi/.test(t)) niyet = 'onay'

  // Duygu tespiti
  let duygu = 'normal'
  if (/mutlu|harika|super|sevindim|heyecanli|wow/.test(t)) duygu = 'mutlu'
  else if (/uzgun|agladk|kotu|mutsuz|yalniz|umutsuz/.test(t)) duygu = 'uzgun'
  else if (/stresli|endiseli|korkuyorum|panikladim|sinirdim/.test(t)) duygu = 'stresli'
  else if (/merak|acaba|sormak istiyorum|nasil olur/.test(t)) duygu = 'merakli'
  else if (/heyecan|wow|inanamıyorum|muhtesem/.test(t)) duygu = 'heyecanli'

  return { konu, derinlik, niyet, duygu, bagiam: 'diger' }
}

// KATMAN 2 — UZMAN SİSTEMİ
function buildExpertPrompt(classification) {
  const konu = classification?.konu || 'gunluk'
  const derinlik = classification?.derinlik || 'yuzeysel'
  const niyet = classification?.niyet || 'konusma'

  const uzmanlar = {
    matematik: '\nUZMAN MOD: MATEMATIK\n• Hatayi tespit et; adim adim goster.\n• Formulu ezberletme, mantigini kavrat.\n• Gunluk hayat ornekleri kullan.\n• Benzer sorular uret, pekistir.\n• Yanlis icin: "Neredeyse! Su adimda farkli dusunelim:" de.',
    fen: '\nUZMAN MOD: FEN\n• Her kavrami gunluk hayatla iliskilendir.\n• Deney veya gozlem oner.\n• "Peki sence neden boyle?" sorusunu sor.\n• Bilimsel dusunce ogret: gozlemle, hipotez kur, test et.',
    dil: '\nUZMAN MOD: DIL\n• Turkceyi guclend ir; yanlis kullanimlari duzelt.\n• Kelime hazinesini genislet.\n• Yaratici yazarligi tesvik et.\n• Dilbilgisi kuralini ornek le kavrat.',
    tarih: '\nUZMAN MOD: TARIH\n• Her konuyu hikaye formatinda anlat.\n• "O donemde sen olsaydin ne yapardın?" sor.\n• Neden-sonuc iliskisi kur.\n• Tarihi olayı gunumuyle iliskilendir.',
    sanat: '\nUZMAN MOD: SANAT\n• "Ya soyle olsaydi?" sorulari sor.\n• Ozgun uretimi odullend ir.\n• Farkli bakis acilar i sun.',
    duygu: '\nUZMAN MOD: DUYGUSAL DESTEK\n• Once dinle, sonra konuş. Cozum sunmadan once anla.\n• Duyguyu yansi t: "Seni cok iyi anliyorum." de.\n• Asla yargilama. Guven ver, umut ver.',
    kariyer: '\nUZMAN MOD: KARIYER\n• Hayallerini kesfet.\n• Guclu yanlarini goster.\n• Gercekci ama ilham verici ol.',
    yaraticilik: '\nUZMAN MOD: YARATICILIK\n• Sinir koy, ozgurlestir.\n• Her fikri degerli bul; once onayla, sonra gelistir.',
    gunluk: '\nUZMAN MOD: GUNLUK SOHBET\n• Arkadasca konuş; samimi, sicak ol.\n• Sohbeti ogrenmey e nazikce yonlendir.',
  }

  const stratejiler = {
    derin: '\nSTRATEJI: Sokratik sorgulama uygula. Cevabi verme, sorularla gotür. Ustbilis gelist ir.',
    orta: '\nSTRATEJI: Analoji kullan. Iskele kur: cok zorsa basamakla. "Simdi bana anlat." de.',
    yuzeysel: '\nSTRATEJI: Kisa ve net acikla. Gunluk hayattan somut ornek ver. Merak uyandır.',
  }

  const niyet_ekstra = {
    odev: '\nODEV: Cevabi verme! Ipucu ver, adimi goster, dusundur.',
    anlama: '\nANLAMA: Kavrami farkli acidan anlat, ornek cogalt.',
    onay: '\nONAY ARAYISI: Once guven ver, sonra ogrenmey e yonlendir.',
  }

  return (uzmanlar[konu] || uzmanlar.gunluk) + (stratejiler[derinlik] || '') + (niyet_ekstra[niyet] || '')
}

// KATMAN 3 — YAŞ MOTORİ
function buildAgePrompt(age, classification) {
  const duygu = classification?.duygu || 'normal'
  const duyguEkstra = {
    uzgun: '\nCOCUK UZGUN: Once duygusunu kabul et. Cozume atlamadan once anla.',
    stresli: '\nCOCUK STRESLI: Sakinlest ir. "Birlikte bakalim, adim adim cozeriz." de.',
    heyecanli: '\nCOCUK HEYECANLI: Heyecanini paylas! Enerjiyi ogrenmey e yonlendir.',
    merakli: '\nCOCUK MERAKLI: Soruyu derinlestir, daha fazla merak uyandır.',
  }
  const extra = duyguEkstra[duygu] || ''

  if (age <= 8) return '\nYAS: 6-8 — En fazla 2 cumle. Cok basit kelimeler. Her mesajda 2-3 emoji. Ovgu ver. Her seyi oyunlastir.' + extra
  if (age <= 11) return '\nYAS: 9-11 — 2-3 cumle. Gercek hayat ornekleri. 1-2 emoji. Arkadasca ama ogretici. Neden sorularini cevapla.' + extra
  return '\nYAS: 12-15 — 3-5 cumle. Derin ve analitik. Emoji cok az. Elestirel dusunceyi tesvik et. Ozerklik ver.' + extra
}

// ANA callAI — TÜM KATMANLAR
export async function callAI(systemPrompt, messages, maxTokens, childAge, classification) {
  let finalSystem

  if (childAge && classification) {
    const expertPrompt = buildExpertPrompt(classification)
    const agePrompt = buildAgePrompt(childAge, classification)
    finalSystem = [
      "SEN BiBi'SIN. 6-15 yas cocuklar icin Turkce AI ogrenme arkadasisin.",
      "KESiN KURAL: Sadece Turkce yaz. again, okay, hi, hello, yes, no kelimeler YASAK.",
      "Ben yapay zekayim asla deme. Emin olmadigin seyi uydurma.",
      expertPrompt,
      agePrompt
    ].join('\n')
    if (systemPrompt) finalSystem += '\n\nEK BAGIAM:\n' + systemPrompt
  } else {
    finalSystem = 'ZORUNLU: Sadece Turkce kullan. Ingilizce kelime yasak.\n\n' + (systemPrompt || '')
  }

  const apiMessages = [{ role: 'system', content: finalSystem }]
  ;(messages || []).forEach(m => apiMessages.push({ role: m.role || 'user', content: m.content || m.text || '' }))

  const res = await fetch(API_BASE + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: apiMessages, max_tokens: maxTokens || 1000, temperature: 0.7 })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'API hatasi')
  return data.choices?.[0]?.message?.content || ''
}

// YARDIMCI FONKSİYONLAR
export function getImageStyle(age) {
  if (age <= 8) return "cartoon style, cute, colorful, simple, children's book illustration"
  if (age <= 12) return "colorful illustration, semi-realistic, educational style, vibrant"
  return "realistic, professional illustration, detailed, high quality"
}

export async function generateImageUrl(prompt, age) {
  const stylePrompt = getImageStyle(age)
  const translateRes = await callAI("You are an image prompt expert.", [{ role: "user", content: 'Translate to English, max 15 words: "' + prompt + '"' }], 60)
  const englishPrompt = (translateRes?.trim() || prompt).replace(/['"*]/g, "").trim()
  const safePrompt = encodeURIComponent(englishPrompt + ', ' + stylePrompt + ', high quality')
  return API_BASE + '/api/image?prompt=' + safePrompt + '&t=' + Date.now()
}

export function detectTopic(text) {
  const t = text.toLowerCase()
  const topics = {
    "Matematik": ["matematik","hesap","sayi","toplama","cikarma","carpma","bolme","geometri","denklem","oran","kesir"],
    "Fen": ["fen","bilim","fizik","kimya","biyoloji","atom","hucre","enerji","doga","deney","evrim","gezegen"],
    "Yabanci Dil": ["ingilizce","english","yabanci dil","fransizca","almanca","kelime","gramer","cevir"],
    "Tarih": ["tarih","osmanli","ataturk","cumhuriyet","savas","padisah","medeniyet","antik","roma"],
    "Sanat": ["sanat","resim","muzik","dans","tiyatro","siir","yaratici","ciz","bestele"],
  }
  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some(k => t.includes(k))) return topic
  }
  return "Genel"
}

export function detectImageRequest(text) {
  const keywords = ["ciz","resim yap","gorsel yap","resim ciz","illustrasyon","draw","paint","picture","image","goster","cizim","karikatur"]
  return keywords.some(k => text.toLowerCase().includes(k))
}

export function isHomeworkQuestion(text) {
  const keywords = ["odev","soru","hesapla","coz","bul","kac","nedir","nasil","acikla","anlat"]
  return keywords.some(k => text.toLowerCase().includes(k))
}

export async function searchWeb(query) {
  try {
    const res = await fetch(API_BASE + '/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    const data = await res.json()
    if (data.answer) return data.answer
    if (data.results?.length) return data.results.map(r => r.content).join(' ')
    return null
  } catch { return null }
}
