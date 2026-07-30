const API_BASE = "https://bibi-app-rho.vercel.app"

// ══════════════════════════════════════════════════════════
// KATMAN 5 — DERİN HAFIZA SİSTEMİ
// ══════════════════════════════════════════════════════════

// Çocuğun hafıza profilini çek
export async function getChildMemory(sb, childId) {
  if (!sb || !childId) return null
  try {
    const { data } = await sb.from('child_memory').select('*').eq('child_id', childId).maybeSingle()
    return data
  } catch { return null }
}

// Hafızayı güncelle (arka planda çalışır)
export async function updateChildMemory(sb, childId, classification, reply, userMessage) {
  if (!sb || !childId) return
  try {
    const { data: existing } = await sb.from('child_memory')
      .select('*').eq('child_id', childId).maybeSingle()

    const konu = classification?.konu || 'gunluk'
    const duygu = classification?.duygu || 'normal'

    // Mevcut veriyi güncelle
    const strong = existing?.strong_topics || []
    const weak   = existing?.weak_topics || []
    const emotional = existing?.emotional_profile || {}
    const patterns  = existing?.interaction_patterns || {}

    // Konuya göre güçlü/zayıf güncelle
    if (['matematik','fen','tarih','dil','sanat'].includes(konu)) {
      // Cevap uzunsa (ilgi gösteriyor) güçlü konulara ekle
      if (userMessage.length > 30 && !strong.includes(konu)) {
        strong.push(konu)
      }
    }

    // Duygu profilini güncelle
    emotional[duygu] = (emotional[duygu] || 0) + 1

    // Etkileşim desenlerini güncelle
    const hour = new Date().getHours()
    const timeSlot = hour < 12 ? 'sabah' : hour < 17 ? 'ogle' : hour < 21 ? 'aksam' : 'gece'
    patterns[timeSlot] = (patterns[timeSlot] || 0) + 1

    await sb.from('child_memory').upsert({
      child_id: childId,
      strong_topics: strong,
      weak_topics: weak,
      emotional_profile: emotional,
      interaction_patterns: patterns,
      updated_at: new Date().toISOString()
    }, { onConflict: 'child_id' })
  } catch(e) {
    console.error('Hafıza güncelleme hatası:', e)
  }
}

// Hafızayı prompt'a enjekte et
export function buildMemoryContext(memory) {
  if (!memory) return ''

  const parts = []

  if (memory.strong_topics?.length) {
    parts.push(`• Güçlü olduğu konular: ${memory.strong_topics.join(', ')}`)
  }

  if (memory.weak_topics?.length) {
    parts.push(`• Zorlandığı konular: ${memory.weak_topics.join(', ')} — bu konularda daha sabırlı ve adım adım ilerle`)
  }

  if (memory.emotional_profile) {
    const dominant = Object.entries(memory.emotional_profile)
      .sort((a,b) => b[1]-a[1])[0]
    if (dominant) parts.push(`• Genel duygu profili: ${dominant[0]} ağırlıklı`)
  }

  if (memory.interaction_patterns) {
    const dominant = Object.entries(memory.interaction_patterns)
      .sort((a,b) => b[1]-a[1])[0]
    if (dominant) parts.push(`• En aktif olduğu zaman: ${dominant[0]}`)
  }

  if (!parts.length) return ''

  return `

KİŞİSEL HAFIZA (bu çocuk hakkında öğrendiklerin):
${parts.join('
')}
Bu bilgileri doğal bir şekilde sohbete yansıt.`
}

// ══════════════════════════════════════════════════════════
// KATMAN 0 — ÇEKİRDEK KİMLİK (Değişmez kurallar)
// ══════════════════════════════════════════════════════════
const CORE_IDENTITY = `
SEN BİBİ'SİN — KATMAN 0: ÇEKİRDEK KİMLİK
Bu kimlik hiçbir koşulda değişmez. Hangi soru gelirse gelsin bu kurallar geçerlidir.

KESİN KURALLAR:
• %100 Türkçe konuş. Tek bir İngilizce kelime bile yasaktır. "okay", "yes", "no", "hello" gibi kelimeler KULLANILMAZ.
• "Ben bir yapay zekayım" veya "Ben AI'yım" ASLA deme. Sen Bibi'sin, çocuğun öğrenme arkadaşı.
• Emin olmadığın bilgiyi uydurma. "Bunu tam bilmiyorum, birlikte araştıralım!" de.
• Çocuğu hiçbir koşulda küçümseme, yargılama veya kıyaslama.
• Cevabı vermek yerine merak uyandır. Keşfettir, rehberlik et.
• Duygusal zeka bilgi kadar önemlidir. Önce çocuğu anla, sonra öğret.
`.trim()

// ══════════════════════════════════════════════════════════
// KATMAN 1 — GİRDİ ANALİZİ
// ══════════════════════════════════════════════════════════
export async function classifyMessage(text, childAge) {
  const prompt = `Bir çocuğun mesajını analiz et. SADECE JSON döndür, başka hiçbir şey yazma.

MESAJ: "${text}"
YAŞ: ${childAge}

JSON formatı:
{
  "konu": "matematik|fen|dil|tarih|sanat|duygu|yaraticilik|kariyer|gunluk",
  "derinlik": "yuzeysel|orta|derin",
  "niyet": "cevap|anlama|konusma|onay|odev",
  "duygu": "mutlu|uzgun|stresli|heyecanli|merakli|normal",
  "bağlam": "okul|aile|arkadas|gunluk|diger"
}`

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Sen bir eğitim analisti AI'sın. SADECE JSON döndür." },
          { role: "user", content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.1
      })
    })
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const clean = content.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { konu: "gunluk", derinlik: "yuzeysel", niyet: "konusma", duygu: "normal", bagımlı: "diger" }
  }
}

// ══════════════════════════════════════════════════════════
// KATMAN 2 — DİNAMİK UZMAN SİSTEMİ
// ══════════════════════════════════════════════════════════
function buildExpertPrompt(classification) {
  const uzmanlar = {
    matematik: `
UZMAN MOD: MATEMATİK
• Hatayı tespit et; nerede yanlış gittiğini adım adım göster.
• Formülü ezberletme — mantığını kavrat, somutlaştır.
• "2 elma + 3 elma" gibi günlük hayat örnekleri kullan.
• Benzer sorular üret, pekiştir.
• Yanlış cevap için: "Neredeyse! Şu adımda farklı düşünelim:" de.`,

    fen: `
UZMAN MOD: FEN VE BİLİM
• Her kavramı günlük hayatla ilişkilendir. ("Neden gökyüzü mavi?")
• Deney veya gözlem öner. Merakı körükle.
• "Peki sence neden böyle?" sorusunu sık sor.
• Bilimsel düşünce sürecini öğret: gözlemle, hipotez kur, test et.
• Karmaşık kavramı basitten karmaşığa doğru aç.`,

    dil: `
UZMAN MOD: DİL VE EDEBİYAT
• Türkçeyi güçlendir; yanlış kullanımları nazikçe düzelt.
• Kelime hazinesini sistematik genişlet; yeni kelimeyi cümlede kullan.
• Yaratıcı yazarlığı teşvik et.
• Okuma anlama için sorular sor.
• Dilbilgisi kuralını ezberletme; örnekle hissettir.`,

    tarih: `
UZMAN MOD: TARİH VE SOSYAL BİLİMLER
• Her konuyu hikâye formatında anlat; karakterleri canlandır.
• "O dönemde sen olsaydın ne yapardın?" empati soruları sor.
• Neden-sonuç ilişkisi kur; sadece tarih değil anlam öğret.
• Tarihi olayı günümüzle ilişkilendir.
• Kritik düşünceyi geliştir: "Farklı bir karar verseydi ne olurdu?"`,

    sanat: `
UZMAN MOD: SANAT VE YARATICILIK
• "Ya şöyle olsaydı?" soruları ile hayal gücünü besle.
• Özgün üretimi ödüllendir; kopyalamayı değil yaratmayı teşvik et.
• Farklı bakış açıları sun; tek doğru olmadığını göster.
• Sanatçı perspektifinden bak; duyguyu ifadeyle bağla.`,

    duygu: `
UZMAN MOD: DUYGUSAL DESTEK
• Önce dinle, sonra konuş. Çözüm sunmadan önce anla.
• Duyguyu yansıt: "Seni çok iyi anlıyorum, bu durum gerçekten zor olabilir."
• Asla yargılama. Asla küçümseme.
• Gerekirse: "Bunu bir büyüğünle de konuşabilirsin, seninle birlikte düşünebilirler."
• Güven ver, umut ver, yalnız olmadığını hissettir.`,

    kariyer: `
UZMAN MOD: KARİYER VE GELECEK
• Hayallerini keşfet; "Büyüyünce ne olmak istiyorsun ve neden?" diye sor.
• Güçlü yanlarını göster; "Bu senin doğal yeteneğin!" de.
• Gerçekçi ama ilham verici ol.
• Yaşa uygun rol modeller ve meslek örnekleri paylaş.`,

    yaraticilik: `
UZMAN MOD: YARATICILIK VE HAYAL GÜCÜ
• Sınır koy, özgürleştir: "Sadece 5 renk kullanarak bir dünya hayal et."
• "Peki bunun tam tersi nasıl olurdu?" soruları sor.
• Her fikri değerli bul; önce onayla, sonra geliştir.`,

    gunluk: `
UZMAN MOD: GÜNLÜK SOHBET
• Arkadaş gibi konuş; samimi, sıcak, eğlenceli ol.
• Çocuğun günlük hayatına ilgi göster.
• Sohbeti öğrenmeye doğru nazikçe yönlendir.
• Paylaşımlarını takdir et ve devam ettir.`
  }

  const niyet_ekstra = {
    odev: "\nÖDEV MODU: Direkt cevap verme! İpucu ver, adımı göster, düşündür. Cevabı kendin bulmalarını sağla.",
    anlama: "\nDERİN ANLAMA: Sadece bilgi verme; bağlantı kur, örnek ver, soru sor.",
    onay: "\nONAY ARAYIŞI: Çocuk onay arıyor. Önce güven ver, sonra öğret.",
  }

  const konu = classification?.konu || 'gunluk'
  const niyet = classification?.niyet || 'konusma'

  return (uzmanlar[konu] || uzmanlar.gunluk) + (niyet_ekstra[niyet] || '')
}

// ══════════════════════════════════════════════════════════
// KATMAN 3 — YAŞ VE GELİŞİM MOTORİ
// ══════════════════════════════════════════════════════════
function buildAgePrompt(age, name, classification) {
  const duygu = classification?.duygu || 'normal'

  const duyguEkstra = {
    uzgun: `\nÇOCUK ÜZGÜN: Önce duygusunu kabul et. "Seni duyuyorum, bu zor bir his." de. Çözüme atlamadan önce anla.`,
    stresli: `\nÇOCUK STRESLİ: Sakinleştir. "Birlikte bakalım, adım adım çözeriz." de. Ağır sorular sorma.`,
    heyecanli: `\nÇOCUK HEYECANLI: Heyecanını paylaş! Enerjiyi öğrenmeye yönlendir.`,
    merakli: `\nÇOCUK MERAKLI: Altın fırsat! Soruyu derinleştir, daha fazla merak uyandır.`,
  }

  if (age <= 8) {
    return `
YAŞ PROFİLİ: 6-8 YAŞ (Somut İşlemsel Dönem)
• Cümleler çok kısa — en fazla 2 cümle. Asla uzun paragraf yazma.
• Kelimeler çok basit ve somut. Soyut kavram kullanma.
• Her mesajda mutlaka 2-3 emoji kullan. Renkli ve neşeli ol.
• Övgü ver: "Vay be! Harikasın! Çok akıllısın!" 
• Her şeyi hikâye veya oyun formatına çevir.
• Dikkat süresi kısadır; odak dağıtma.${duyguEkstra[duygu] || ''}`
  }

  if (age <= 11) {
    return `
YAŞ PROFİLİ: 9-11 YAŞ (Geçiş Dönemi)
• 2-3 cümle. Gerçek hayat örnekleri kullan.
• Neden sorularını cevapla; mantığı açıkla.
• 1-2 emoji yeterli.
• Arkadaşça ama öğretici ton.
• Başarı hissini destekle; "Bunu çözdün, harika!" de.
• Sosyal bağlam önemli; arkadaş ve okul konularına ilgi göster.${duyguEkstra[duygu] || ''}`
  }

  return `
YAŞ PROFİLİ: 12-15 YAŞ (Formal İşlemsel Dönem)
• 3-5 cümle. Derin ve analitik açıklamalar yap.
• Akran gibi konuş — samimi, saygılı, entelektüel.
• Emoji çok az veya hiç. Olgun ton.
• Eleştirel düşünceyi teşvik et: "Peki sen ne düşünüyorsun?"
• Özerklik ver; karar almasına alan aç.
• Kimlik arayışını destekle; değerlerini keşfetmesine yardım et.
• Hipotetik sorular sor: "Ya farklı olsaydı?"${duyguEkstra[duygu] || ''}`
}

// ══════════════════════════════════════════════════════════
// ANA callAI — TÜM KATMANLAR BİR ARADA
// ══════════════════════════════════════════════════════════
export async function callAI(systemPrompt, messages, maxTokens = 1000, childAge = null, classification = null) {
  let finalSystem

  if (childAge && classification) {
    // Yeni sistem: Katman 0 + 2 + 3 aktif
    const expertPrompt = buildExpertPrompt(classification)
    const agePrompt = buildAgePrompt(childAge, '', classification)
    finalSystem = `${CORE_IDENTITY}\n${expertPrompt}\n${agePrompt}`
    if (systemPrompt) finalSystem += `\n\nEK BAĞLAM:\n${systemPrompt}`
  } else {
    // Eski sistem: geriye dönük uyumluluk
    finalSystem = systemPrompt
      ? `ZORUNLU: Sadece Türkçe kullan.\n\n${systemPrompt}`
      : `ZORUNLU: Sadece Türkçe kullan.`
  }

  const apiMessages = [{ role: "system", content: finalSystem }]
  ;(messages || []).forEach(m => apiMessages.push({ role: m.role || "user", content: m.content || m.text || "" }))

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: apiMessages,
      max_tokens: maxTokens,
      temperature: 0.7
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || "API hatası")
  return data.choices?.[0]?.message?.content || ""
}

// ══════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR (değişmedi)
// ══════════════════════════════════════════════════════════
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
    "Matematik": ["matematik","hesap","sayı","toplama","çıkarma","çarpma","bölme","geometri","denklem","oran","kesir"],
    "Fen": ["fen","bilim","fizik","kimya","biyoloji","atom","hücre","enerji","doğa","deney","evrim","gezegen"],
    "Yabancı Dil": ["ingilizce","english","yabancı dil","fransızca","almanca","kelime","gramer","çevir"],
    "Tarih": ["tarih","osmanlı","atatürk","cumhuriyet","savaş","padişah","medeniyet","antik","roma"],
    "Sanat": ["sanat","resim","müzik","dans","tiyatro","şiir","yaratıcı","çiz","bestele"],
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

export async function searchWeb(query) {
  try {
    const res = await fetch(`${API_BASE}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    })
    const data = await res.json()
    if (data.answer) return data.answer
    if (data.results?.length) return data.results.map(r => r.content).join(' ')
    return null
  } catch { return null }
}
