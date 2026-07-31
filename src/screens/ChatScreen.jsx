import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import { callAI, classifyMessage, getChildMemory, updateChildMemory, buildMemoryContext, detectTopic, detectImageRequest, searchWeb } from '../lib/api'
import { speakElevenLabs, speakBrowser, cleanText, getVoiceForChild, ELEVENLABS_VOICES } from '../lib/audio'
import BibiFace from '../components/BibiFace'
import ActionMenu from '../components/ActionMenu'
import ContentCreator from '../components/ContentCreator'
import HistoryPanel from '../components/HistoryPanel'
import { getNextQuestion, shouldAskPersonality, getQuestionForAge, calculatePersonalityScores, PERSONALITY_QUESTIONS } from '../lib/personality'
import { detectEmotionFromMessage, saveEmotionLog, shouldAskDailyEmotion, EMOTIONS } from '../lib/emotion'

const SPECIALTY_PROFILES = {
  Matematik: "Matematikte üstünsün. Sayılar, geometri, problem çözme senin tutkun.",
  Fen: "Fen bilimlerinde uzman. Deney, keşif, bilimsel merak senin dünyan.",
  "Yabancı Dil": "Yabancı dillerde yeteneklisin. Dil öğretimi senin alanın.",
  Tarih: "Tarihte güçlüsün. Osmanlı, Cumhuriyet, dünya tarihi senin tutkun.",
  Sanat: "Sanatta yaratıcısın. Resim, müzik, yaratıcı yazarlık senin dünyan.",
}

const PLAN_LIMITS = {
  free: { messages: 30, images: 3, slides: 1, friends: false, report: false },
  go:   { messages: 150, images: 10, slides: 5, friends: true, report: false },
  pro:  { messages: Infinity, images: 50, slides: 15, friends: true, report: true },
}

function buildPrompt(child, memory = null) {
  const age = child.age || 9
  const name = child.name || 'sevgili'
  const gender = child.gender === 'kız' ? 'kız' : 'erkek'
  const specialty = child.bibi_specialty
  const specialtyText = specialty && SPECIALTY_PROFILES[specialty]
    ? `\nUZMANLIK: ${name} seninle en çok ${specialty} konusunda konuştu. ${SPECIALTY_PROFILES[specialty]}`
    : `\nHenüz uzmanlık alanın belli değil. Her konuya eşit merakla yaklaş.`

  const profileText = child.profile_completed ? `
KİŞİSEL PROFİL:
${child.sport_team ? `• Tuttuğu takım: ${child.sport_team}` : ''}
${child.music_interest ? `• Müzik ilgisi: ${child.music_interest}` : ''}
${child.hobbies ? `• Hobileri: ${child.hobbies}` : ''}
${child.dream ? `• Hayali: ${child.dream}` : ''}
${child.best_friend ? `• En iyi arkadaşı: ${child.best_friend}` : ''}
Bu bilgileri sohbete ARA SIRA doğal dahil et. Her sohbette sormak zorunda değilsin — sadece konu gelince yansıt.` : `
İLK TANITMA — SADECE BİR KERE:
Bu ${name} ile ilk konuşman. Kısa karşılama yap, sonra şu bilgileri sırayla sor (birer birer, doğal şekilde):
1. Hangi sporla ilgileniyorsun veya hangi takımı tutuyorsun?
2. Müzikle ilgin var mı?
3. Boş zamanında ne yaparsın?
4. Büyüyünce ne olmak istiyorsun?
5. En iyi arkadaşının adı ne?
Tüm cevapları alınca artık BU SORULARI TEKRAR SORMA. Normal arkadaş gibi sohbet et.`

  // KATMAN 9 — KİŞİSEL ÖĞRETMEN PROFİLİ
  let memoryProfile = ''
  if (memory) {
    const parts = []
    if (memory.strong_topics?.length)
      parts.push(`• Güçlü konular: ${memory.strong_topics.join(', ')} — bu konularda daha ileri götür, zorla.`)
    if (memory.weak_topics?.length)
      parts.push(`• Zorlandığı konular: ${memory.weak_topics.join(', ')} — çok sabırlı ol, adım adım ilerle.`)
    if (memory.emotional_profile) {
      const dom = Object.entries(memory.emotional_profile).sort((a,b)=>b[1]-a[1])[0]
      if (dom) parts.push(`• Duygusal profil: genellikle ${dom[0]} hissediyor — buna göre tonu ayarla.`)
    }
    if (memory.interaction_patterns) {
      const dom = Object.entries(memory.interaction_patterns).sort((a,b)=>b[1]-a[1])[0]
      if (dom) parts.push(`• En aktif: ${dom[0]} saatlerinde — bu saatte daha enerjik ve derin sorular sorabilirsin.`)
    }
    if (parts.length) {
      memoryProfile = '\n\nKATMAN 9 — KİŞİSEL OGRETMEN PROFİLİ:\n' + parts.join('\n') + '\nBu profilini her sohbette sessizce uygula; acikca bahsetme.'
    }
  }

  let ageProfile
  if (age <= 8) {
    ageProfile = `DİL TARZI (6-8 YAŞ):\n• Cümleler çok kısa — en fazla 2 cümle\n• Kelimeler basit, somut\n• Her mesajda 1-2 emoji\n• Övgü ver: "Vay be! Harikasın!"\n• Asla karmaşık kelime kullanma`
  } else if (age <= 12) {
    ageProfile = `DİL TARZI (9-12 YAŞ):\n• Cümleler 2-3 cümle\n• Gerçek hayat örnekleri\n• 1 emoji yeterli\n• Arkadaşça ama öğretici ton`
  } else {
    ageProfile = `DİL TARZI (13-15 YAŞ):\n• Akran gibi konuş — samimi\n• Emoji çok az\n• Derin ve analitik açıklamalar\n• Eleştirel düşünmeyi teşvik et`
  }

  return `Sen Bibi'sin — ${age} yaşında ${gender} çocuk olan ${name} için özel AI öğrenme arkadaşı ve yol arkadaşısın.
Sınıfı: ${child.grade || '?'}
${specialtyText}
${profileText}
KİMLİĞİN:
• ${name}'in hem arkadaşı hem öğreticisisin. Samimi, sıcak, destekleyici.
• "Ben bir yapay zekayım" veya "Ben bir AI'yım" ASLA deme — sen Bibi'sin!
• Her zaman meraklı, enerjik ve pozitif kal.
${ageProfile}
ÖĞRETME TARZI — ÇOK ÖNEMLİ:
• Her soruya DOĞRU ve AKILLI cevap ver — uydurma, tahmin etme!
• Bilmediğin bir şeyi söyle: "Bunu tam bilmiyorum ama birlikte öğrenebiliriz!"
• Ödev sorularında direkt cevap verme — ipucu ver, yönlendir
• Yanlışlarda "Yanlış!" deme — "Yaklaştın!", "Neredeyse!" de
• Cevapları kısa tut — çocuk sıkılmasın
• Konuyu derinleştirmek için soru sor
AKILLI CEVAP KURALLARI:
• Matematik sorularında kesinlikle doğru hesapla
• Tarih/bilim sorularında gerçek bilgi ver
• Emin olmadığında "Hep birlikte araştıralım!" de
• Saçma veya alakasız cevap verme — eğer konu dışıysa nazikçe yönlendir
DUYGU TAKİBİ:
• Üzgün görünürse "Seninle buradayım, anlatmak ister misin?" de
• Profil tamamsa takım/hobi konularını doğal konuşmaya dahil et
DİL KURALI — MUTLAK ZORUNLU:
• %100 Türkçe konuş — İngilizce dahil HİÇBİR yabancı kelime YASAK
• "okay", "yes", "no", "hello" gibi İngilizce kelimeler KULLANMA
• ${name} başka dilde yazsa bile sen Türkçe cevap ver
• Teknik terimler bile Türkçe karşılığıyla söyle${memoryProfile}`
}

function getImageStyle(age) {
  if(age<=8) return "cartoon style, cute, colorful, children's book illustration"
  if(age<=12) return "colorful illustration, semi-realistic, educational"
  return "realistic, professional illustration, detailed"
}

const TYPE_NAMES = { homework:'Birlikte Ödev', experiment:'Deney/Proje', quiz:'Bilgi Yarışması' }
const TYPE_ICONS = { homework:'📚', experiment:'🔬', quiz:'🎯' }

function BubbleContent({ m, theme }) {
  const text = m.text || ''
  let bg = m.role==='user' ? theme.bubble : 'rgba(255,255,255,.92)'
  let border = 'none'
  let color = m.role==='user' ? 'white' : '#1A2E2A'
  if (m.role === 'bibi') {
    if (/harika|bravo|aferin|tebrik/i.test(text)) { bg='rgba(220,252,231,.95)'; border='1.5px solid rgba(74,222,128,.4)' }
    else if (/uzgun|yalniz|kotu|endise|korku/i.test(text)) { bg='rgba(253,242,248,.95)'; border='1.5px solid rgba(236,72,153,.3)' }
    else if (/odev|problem|hesapla|coz/i.test(text)) { bg='rgba(254,252,232,.95)'; border='1.5px solid rgba(234,179,8,.3)' }
    else if (/deney|fen|bilim|kesfet/i.test(text)) { bg='rgba(239,246,255,.95)'; border='1.5px solid rgba(59,130,246,.3)' }
  }
  const ts = m.ts ? (m.ts.getDate().toString().padStart(2,'0')+'.'+(m.ts.getMonth()+1).toString().padStart(2,'0')+' '+m.ts.getHours().toString().padStart(2,'0')+':'+m.ts.getMinutes().toString().padStart(2,'0')) : null
  return (
    <div style={{ padding:'10px 14px 6px', borderRadius:m.role==='user'?'18px 18px 4px 18px':'4px 18px 18px 18px', background:bg, border, color, fontSize:15, lineHeight:1.5 }}>
      {m.text}
      {ts && <div style={{fontSize:9,marginTop:4,textAlign:'right',opacity:.45,color:m.role==='user'?'rgba(255,255,255,.8)':color,letterSpacing:0.2}}>{ts}</div>}
    </div>
  )
}

export default function ChatScreen() {
  const { currentChild, currentUser, setScreen, setProjectFriend, setProjectType, voiceOn, setVoiceOn, selectedVoiceId, setSelectedVoiceId, elevenLabsEnabled, subscription } = useApp()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [expr, setExpr] = useState('idle')
  const [status, setStatus] = useState('Seninle burada!')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [currentAudio, setCurrentAudio] = useState(null)
  const audioRef = useRef(null)
  const [speechPaused, setSpeechPaused] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showVoiceMenu, setShowVoiceMenu] = useState(false)
  const [contentCreator, setContentCreator] = useState(null)
  const [homeworkMode, setHomeworkMode] = useState(false)
  const [homeworkStep, setHomeworkStep] = useState('idle')
  const [homeworkQuestion, setHomeworkQuestion] = useState(null)
  const [homeworkCount, setHomeworkCount] = useState(0)
  const [showExitPin, setShowExitPin] = useState(false)
  const [personalityQ, setPersonalityQ] = useState(null) // aktif kişilik sorusu
  const [showEmotionPicker, setShowEmotionPicker] = useState(false)
  const [todayEmotion, setTodayEmotion] = useState(null)
  const [msgCount, setMsgCount] = useState(0)
  const [exitPin, setExitPin] = useState('')
  const [exitPinError, setExitPinError] = useState('')
  const [showForgotPin, setShowForgotPin] = useState(false)
  const [forgotStep, setForgotStep] = useState(1)
  const [forgotPassword, setForgotPassword] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [projectInvite, setProjectInvite] = useState(null)
  const [usage, setUsage] = useState({ message_count:0, image_count:0, slide_count:0 })
  const [showLimitModal, setShowLimitModal] = useState(null)
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false)
  const [streak, setStreak] = useState(0)
  const [showStreakCelebration, setShowStreakCelebration] = useState(false)
  const [quickReplies, setQuickReplies] = useState([])
  const [sessionTitle, setSessionTitle] = useState(null)
  const [showDailyGreeting, setShowDailyGreeting] = useState(false)
  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  let msgCounter = useRef(0)
  const plan = subscription?.plan || 'free'
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

  useEffect(() => {
    if (!currentChild) return
    loadUsage()
    updateStreak()

    // Cleanup: bu effect temizlenince (çocuk değişince) oturumu kapat
    return () => {
      const prevSession = sessionStorage.getItem('bibi_last_session_' + currentChild.id)
      if (prevSession) {
        fetch('https://bibi-app-rho.vercel.app/api/session-close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: prevSession, started_at: sessionStorage.getItem('bibi_session_start') })
        }).catch(function() {})
      }
    }
    const autoVoice = getVoiceForChild(currentChild)
    setSelectedVoiceId(autoVoice)
    const isYoung = currentChild.age <= 8
    setVoiceOn(isYoung)

    // Yenilenince son sohbeti yükle
    ;(async () => {
    const sessionKey = 'bibi_last_session_' + currentChild.id
    const lastSid = sessionStorage.getItem(sessionKey)
    if (lastSid) {
      const { data: msgs } = await sb.from('messages').select('role,content').eq('session_id', lastSid).order('created_at', { ascending: true })
      if (msgs?.length > 0) {
        setSessionId(lastSid)
        msgs.forEach(m => addMsg(m.role === 'user' ? 'user' : 'bibi', m.content))
      } else {
        sessionStorage.removeItem(sessionKey)
        await showOpening()
      }
      return
    }
    await showOpening()
    })()

    async function showOpening() {
      // Kişiselleştirilmiş açılış mesajı dene
      if (currentChild.profile_completed) {
        try {
          const ctxRes = await fetch('https://bibi-app-rho.vercel.app/api/session-context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ child_id: currentChild.id, child: { name: currentChild.name, age: currentChild.age } })
          })
          const ctx = await ctxRes.json()
          if (ctx.opening_message) {
            addMsg('bibi', ctx.opening_message)
            if (isYoung) setTimeout(() => speakMsg(ctx.opening_message, autoVoice), 500)
            return
          }
        } catch(e) {}
      }
      // Fallback
      const opening = currentChild.profile_completed
        ? (isYoung
            ? 'Heyyyy ' + currentChild.name + '! 🎉 Tekrar görüştük! Bugün ne keşfediyoruz?'
            : currentChild.age<=12
            ? 'Merhaba ' + currentChild.name + '! Bugün ne konuşacağız?'
            : 'Selam ' + currentChild.name + '. Bugün ne var?')
        : (isYoung
            ? 'Heyyyy! Ben Bibi! 🎉 Seninle tanışmak çok güzel! Adın ne?'
            : currentChild.age<=12
            ? 'Merhaba! Ben Bibi, senin öğrenme arkadaşın! Seni tanımak istiyorum, biraz kendinden bahseder misin?'
            : 'Selam! Ben Bibi. Seninle tanışmak istiyorum — kendinden biraz bahseder misin?')
      addMsg('bibi', opening)
      if (isYoung) setTimeout(() => speakMsg(opening, autoVoice), 500)
    } // showOpening end
    const channel = sb.channel(`project-invites-${currentChild.id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'project_invites' }, async payload => {
        const invite = payload.new
        if (invite.status !== 'pending') return
        if (invite.to_child_id !== currentChild.id) return
        const { data: sender } = await sb.from('children_invite_lookup')
          .select('id,name,age,avatar_emoji,avatar_photo,bibi_specialty')
          .eq('id', invite.from_child_id).maybeSingle()
        setProjectInvite({ ...invite, sender })
      })
      .subscribe()
    return () => sb.removeChannel(channel)
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages, isTyping])

  // Global: herhangi bir yere tıklanınca ses dur
  useEffect(() => {
    function handleGlobalClick(e) {
      // Ses butonlarına tıklanınca zaten toggle yapıyor, onları atla
      if (e.target.closest && e.target.closest('[data-audio-btn]')) return
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
        setCurrentAudio(null)
        setSpeechPaused(false)
        setExpr('idle')
        setStatus('Seninle burada!')
      }
      window.speechSynthesis?.cancel()
    }
    document.addEventListener('click', handleGlobalClick)
    return () => document.removeEventListener('click', handleGlobalClick)
  }, [])

  async function updateStreak() {
    if (!currentChild?.id) return
    const today = new Date().toISOString().split('T')[0]
    const lastActive = currentChild.last_active_date
    if (lastActive === today) { setStreak(currentChild.streak_days || 0); return }
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = lastActive === yesterday ? (currentChild.streak_days || 0) + 1 : 1
    setStreak(newStreak)
    await sb.from('children').update({ streak_days: newStreak, last_active_date: today, streak_updated_at: new Date().toISOString() }).eq('id', currentChild.id)
    currentChild.streak_days = newStreak
    currentChild.last_active_date = today
    if (newStreak % 5 === 0) setShowStreakCelebration(true)
    // Bugün ilk giriş mü? Günlük karşılama göster
    if (lastActive !== today) setShowDailyGreeting(true)
  }

  async function loadUsage() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await sb.from('daily_usage')
      .select('message_count,image_count,slide_count,homework_count')
      .eq('child_id', currentChild.id).eq('date', today).maybeSingle()
    if (data) { setUsage(data); setHomeworkCount(data.homework_count||0) }
  }

  async function incrementUsage(field) {
    const today = new Date().toISOString().split('T')[0]
    const newVal = (usage[field] || 0) + 1
    setUsage(prev => ({ ...prev, [field]: newVal }))
    await sb.from('daily_usage').upsert({
      child_id: currentChild.id, date: today, [field]: newVal
    }, { onConflict: 'child_id,date', ignoreDuplicates: false })
  }

  function checkLimit(type) {
    const fieldMap = { messages:'message_count', images:'image_count', slides:'slide_count' }
    const limitMap = { messages:'messages', images:'images', slides:'slides' }
    const current = usage[fieldMap[type]] || 0
    const limit = limits[limitMap[type]]
    if (current >= limit) { setShowLimitModal(type); return false }
    return true
  }

  function addMsg(role, text, extra={}) {
    msgCounter.current++
    setMessages(prev => [...prev, { role, text, id: `${Date.now()}-${msgCounter.current}`, ts: new Date(), ...extra }])
  }

  async function speakMsg(text, voiceId) {
    if (!voiceOn && !voiceId) return
    const clean = cleanText(text)
    if (!clean) return
    // Mevcut sesi durdur (ref ile güvenli)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setCurrentAudio(null) }
    window.speechSynthesis?.cancel()
    setSpeechPaused(false)
    setExpr('talking'); setStatus('Konuşuyor...')
    const vid = voiceId || selectedVoiceId || getVoiceForChild(currentChild)
    try {
      if (elevenLabsEnabled) {
        const audio = await speakElevenLabs(clean, vid, () => {
          audioRef.current = null
          setCurrentAudio(null); setExpr('idle'); setStatus('Seninle burada!'); setSpeechPaused(false)
        })
        audioRef.current = audio
        setCurrentAudio(audio)
      } else {
        speakBrowser(clean, currentChild?.age, () => { setExpr('idle'); setStatus('Seninle burada!') })
      }
    } catch {
      speakBrowser(clean, currentChild?.age, () => { setExpr('idle'); setStatus('Seninle burada!') })
    }
  }

  function stopAudio() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    window.speechSynthesis?.cancel()
    setCurrentAudio(null); setSpeechPaused(false)
    setExpr('idle'); setStatus('Seninle burada!')
  }

  function toggleSpeech() {
    if (audioRef.current) {
      if (speechPaused) {
        audioRef.current.play(); setSpeechPaused(false); setExpr('talking'); setStatus('Konuşuyor...')
      } else {
        audioRef.current.pause(); setSpeechPaused(true); setExpr('idle'); setStatus('Duraklatıldı ⏸')
      }
    } else { setVoiceOn(!voiceOn) }
  }

  async function ensureSession() {
    if (sessionId) return sessionId
    const { data } = await sb.from('sessions').insert({child_id:currentChild.id, started_at:new Date().toISOString()}).select().maybeSingle()
    setSessionId(data?.id)
    if (data?.id) { sessionStorage.setItem('bibi_last_session_' + currentChild.id, data.id); sessionStorage.setItem('bibi_session_start', new Date().toISOString()) }
    return data?.id
  }

  async function extractAndSaveProfile(userText) {
    const fields = {
      sport_team: ['takım', 'futbol', 'basketbol', 'spor', 'tutuyorum', 'taraftar', 'voleybol', 'tenis', 'galatasaray', 'fenerbahçe', 'beşiktaş', 'trabzonspor'],
      music_interest: ['müzik', 'enstrüman', 'çalıyorum', 'şarkı', 'gitar', 'piyano', 'davul', 'keman', 'flüt', 'bağlama'],
      hobbies: ['boş zaman', 'severim', 'hobim', 'oyun oynamak', 'kitap', 'resim', 'satranç', 'dans', 'yüzme', 'bisiklet'],
      dream: ['olmak istiyorum', 'hayalim', 'büyüyünce', 'doktor', 'mühendis', 'öğretmen', 'pilot', 'sporcu', 'sanatçı', 'yazılımcı'],
      best_friend: ['arkadaşım', 'en iyi arkadaş', 'bff', 'okul arkadaşım'],
    }
    const updates = {}
    for (const [field, keywords] of Object.entries(fields)) {
      if (!currentChild[field] && keywords.some(k => userText.toLowerCase().includes(k))) {
        try {
          const extracted = await callAI(null, [{
            role: 'user',
            content: `Kullanıcı şunu dedi: "${userText}". Sadece "${field}" bilgisini çıkar ve yaz. Başka hiçbir şey yazma. Örnek cevap: "Galatasaray" veya "Gitar" veya "Kitap okumak". Bulamazsan tamamen boş bırak.`
          }], 30)
          if (extracted?.trim() && extracted.trim().length < 60) updates[field] = extracted.trim()
        } catch {}
      }
    }
    const allFields = ['sport_team', 'music_interest', 'hobbies', 'dream', 'best_friend']
    const merged = { ...currentChild, ...updates }
    if (allFields.every(f => merged[f])) updates.profile_completed = true
    if (Object.keys(updates).length > 0) {
      await sb.from('children').update(updates).eq('id', currentChild.id)
      Object.assign(currentChild, updates)
    }
  }

  async function savePersonalityAnswer(score) {
    if (!personalityQ) return
    const progress = (currentChild.personality_progress || 0) + 1
    await sb.from('personality_answers').insert({
      child_id: currentChild.id,
      question_id: personalityQ.id,
      dimension: personalityQ.dimension,
      score,
    })
    // Tüm cevapları çek ve skoru güncelle
    const { data: answers } = await sb.from('personality_answers')
      .select('dimension,score').eq('child_id', currentChild.id)
    const scores = calculatePersonalityScores(answers || [])
    await sb.from('children').update({
      personality_progress: progress,
      personality_scores: scores,
    }).eq('id', currentChild.id)
    Object.assign(currentChild, { personality_progress: progress, personality_scores: scores })
    setPersonalityQ(null)
    addMsg('bibi', progress >= 50 ? 'Teşekkürler! Seni artık çok daha iyi tanıyorum! 🌟' : 'Teşekkürler! 😊')
  }

  async function sendMessage(text, fromVoice=false) {
    const t = text.trim(); if(!t) return
    if (!checkLimit('messages')) return
    setInput('')
    setQuickReplies([])
    addMsg('user', t)
    setExpr('thinking'); setStatus('Düşünüyor...'); setIsTyping(true)
    if (currentChild?.age<=8) { if(fromVoice) setVoiceOn(true); else setVoiceOn(false) }
    if (detectImageRequest(t)) {
      handleImageRequest(t)
      setIsTyping(false); setExpr('idle'); setStatus('Seninle burada!')
      return
    }
    const sid = await ensureSession()
    if (sid) await sb.from('messages').insert({session_id:sid, child_id:currentChild.id, role:'user', content:t, topic:detectTopic(t), language:'tr'})
    try {
      const chatHistory = messages.slice(-20).map(m=>({role:m.role==='bibi'?'assistant':'user', content:m.text}))
      chatHistory.push({role:'user', content:t})

      // Web search gerekiyor mu? Güncel bilgi sorularında ara
      const needsSearch = ['bugün','dün','bu hafta','maç','son dakika','haber','kaç kaç','puan durumu','transfer','güncel','şu an','şimdi'].some(k => t.toLowerCase().includes(k))
      let searchContext = ''
      if (needsSearch) {
        const today = new Date().toLocaleDateString('tr-TR')
        const searchQuery = `${t} ${today}`
        const searchResult = await searchWeb(searchQuery)
        if (searchResult) searchContext = `

[GÜNCEL BİLGİ - Bugün ${today} tarihli web araması]: ${searchResult.slice(0, 600)}
Bu bilgiyi kullan ama "web'den buldum" deme, doğal anlat.`
      }

      // KATMAN 1 — Girdi Analizi (anlık, API çağrısı yok)
      const classification = classifyMessage(t, currentChild?.age || 9)

      // KATMAN 5 — Hafıza çek
      const memory = await getChildMemory(sb, currentChild?.id)

      // KATMAN 5 + 9 — Hafıza prompt'a enjekte edilir
      const memoryContext = buildMemoryContext(memory)
      const prompt = buildPrompt(currentChild, memory)
      const fullPrompt = prompt + (memoryContext || '') + (searchContext || '')

      // KATMAN 2 + 3 — Uzman + Yaş motoru callAI içinde aktif
      const reply = await callAI(fullPrompt, chatHistory, 1000, currentChild?.age, classification)

      // KATMAN 5 — Hafızayı arka planda güncelle
      updateChildMemory(sb, currentChild?.id, classification, reply, t)
      setIsTyping(false); setExpr('happy'); setStatus('Seninle burada!')
      addMsg('bibi', reply)
      await incrementUsage('message_count')

      // Hızlı cevap önerileri üret
      const age = currentChild?.age || 9
      if (age <= 8) {
        setQuickReplies(['👍 Anladım!', '🤔 Tekrar anlat', '➕ Devam et'])
      } else if (age <= 12) {
        setQuickReplies(['✅ Anladım', '🤔 Daha detaylı?', '🔄 Başka örnek ver'])
      } else {
        setQuickReplies(['Anladım', 'Daha derine in', 'Farklı açıdan anlat'])
      }
      if ((currentChild?.age<=8 && fromVoice) || (voiceOn && currentChild?.age>8)) speakMsg(reply)
      if (sid) {
        await sb.from('messages').insert({session_id:sid, child_id:currentChild.id, role:'assistant', content:reply, language:'tr'})
        await sb.from('sessions').update({ message_count: messages.length + 2, updated_at: new Date().toISOString() }).eq('id', sid)
      }
      if (!currentChild.profile_completed) extractAndSaveProfile(t)

      // Duygu tespiti — arka planda
      detectEmotionFromMessage(t).then(emotion => {
        if (emotion) saveEmotionLog(currentChild.id, emotion, t.slice(0, 100))
      })

      // Günlük duygu sorusu
      const newMsgCount = msgCount + 1
      setMsgCount(newMsgCount)
      if (!todayEmotion && shouldAskDailyEmotion(messages)) {
        setTimeout(() => setShowEmotionPicker(true), 1500)
      }

      // Kişilik envanteri sorusu
      const progress = currentChild.personality_progress || 0
      const lastAsked = currentChild.last_personality_asked
      if (shouldAskPersonality(newMsgCount, progress, lastAsked) && currentChild.profile_completed) {
        const nextQ = getNextQuestion(progress)
        if (nextQ) {
          const qText = getQuestionForAge(nextQ, currentChild.age || 9)
          setTimeout(() => {
            setPersonalityQ({ ...nextQ, text: qText })
            addMsg('bibi', `💭 Sana bir şey sormak istiyorum: ${qText}`)
          }, 2000)
        }
      }

      setTimeout(() => { setExpr('idle') }, 3000)
    } catch {
      setIsTyping(false); addMsg('bibi','Bağlantı sorunu 🙈'); setExpr('idle')
    }
  }

  async function handleImageRequest(prompt) {
    if (!checkLimit('images')) return
    const desc = await callAI("Sen Bibi'sin, kısa Türkçe yanıt ver.", [{role:'user',content:`"${prompt.slice(0,30)}" için 1 cümle heyecanlı yanıt ver.`}], 80)
    if(desc) addMsg('bibi', desc)
    try {
      const style = getImageStyle(currentChild?.age||9)
      const tr = await callAI("Translate Turkish to English for image prompt, max 15 words.", [{role:'user',content:prompt}], 50)
      const eng = (tr?.trim()||prompt).replace(/['"*]/g,'').trim()
      const url = `https://bibi-app-rho.vercel.app/api/image?prompt=${encodeURIComponent(eng+', '+style+', high quality')}&t=${Date.now()}`
      addMsg('image', '', {url, title:prompt.slice(0,40)})
      await incrementUsage('image_count')
      const sid = await ensureSession()
      if(sid) await sb.from('chat_assets').insert({session_id:sid, child_id:currentChild.id, type:'image', title:prompt.slice(0,40), url})
    } catch { addMsg('bibi','Görsel üretemedi 🙈') }
  }

  const hwLimit = plan === 'pro' ? 10 : plan === 'go' ? 3 : 0

  async function startHomework(base64) {
    if (plan === 'free') { addMsg('bibi', '🔒 Ödev modu Go ve Pro planlarında kullanılabilir. Planını yükselt! ⭐'); return }
    if (homeworkCount >= hwLimit) { setShowLimitModal('homework'); return }
    addMsg('bibi', '📸 Ödev fotoğrafın yüklendi, soruları analiz ediyorum...')
    setHomeworkMode(true); setHomeworkStep('analyzing')
    const res = await fetch('https://bibi-app-rho.vercel.app/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'meta-llama/llama-4-scout-17b-16e-instruct', messages:[{role:'user',content:[
        {type:'image_url',image_url:{url:`data:image/jpeg;base64,${base64}`}},
        {type:'text',text:`${currentChild?.age||9} yaşında çocuğun ödevi. 1) Ödevdeki TÜM soruları listele 2) En uygun 1 soruyu seç 3) Sokratik yöntemle ipucu ver - cevap verme 4) "Şimdi sen dene ve çözümünü fotoğraf çekip gönder! 📸" de. Türkçe.`}
      ]}], max_tokens:1200 })
    })
    const d = await res.json()
    const reply = d.choices?.[0]?.message?.content || 'Fotoğrafı okuyamadım 🙈'
    addMsg('bibi', reply); setHomeworkQuestion(reply); setHomeworkStep('waiting_solution')
    const today = new Date().toISOString().split('T')[0]
    const newCount = homeworkCount + 1; setHomeworkCount(newCount)
    await sb.from('daily_usage').upsert({ child_id: currentChild.id, date: today, homework_count: newCount }, { onConflict: 'child_id,date', ignoreDuplicates: false })
  }

  async function checkHomeworkSolution(base64) {
    addMsg('user', '📸 Çözümümü gönderdim!'); addMsg('bibi', '🔍 Çözümünü inceliyorum...'); setHomeworkStep('checking')
    const res = await fetch('https://bibi-app-rho.vercel.app/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'meta-llama/llama-4-scout-17b-16e-instruct', messages:[{role:'user',content:[
        {type:'image_url',image_url:{url:`data:image/jpeg;base64,${base64}`}},
        {type:'text',text:`Çocuk şu soruya cevap verdi: "${(homeworkQuestion||'').slice(0,200)}" Çözümü kontrol et: Doğruysa tebrik et ve benzer pratik sorusu sor. Yanlışsa nazikçe göster ve tekrar iste. ${currentChild?.age||9} yaş, Türkçe.`}
      ]}], max_tokens:1000 })
    })
    const d = await res.json()
    const reply = d.choices?.[0]?.message?.content || 'Kontrol edemedim 🙈'
    addMsg('bibi', reply)
    if (reply.includes('Tebrik') || reply.includes('doğru') || reply.includes('Harika') || reply.includes('bravo')) setHomeworkStep('practice')
    else setHomeworkStep('waiting_solution')
  }

  async function generatePDF({topic, contentType}) {
    const age = currentChild?.age||9
    const agePrompt = age<=8?"Çok basit, kısa paragraflar.":age<=12?"Açıklayıcı paragraflar.":"Akademik dil, detaylı."
    addMsg('bibi', `📄 "${topic}" için ${contentType} hazırlanıyor...`)
    const content = await callAI(null,[{role:'user',content:`"${topic}" konusunda Türkçe ${contentType} yaz. Yaş: ${age} — ${agePrompt} Format: Başlık, giriş, 3-5 bölüm (## ile), sonuç. 400-600 kelime.`}],1500)
    if(!content){addMsg('bibi','İçerik üretilemedi 🙈');return}
    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a1a;line-height:1.7}h1{color:#0D9B7E;border-bottom:2px solid #0D9B7E;padding-bottom:8px}h2{color:#1A2E2A;margin-top:28px}.meta{color:#6B7280;font-size:13px;margin-bottom:24px}.footer{margin-top:40px;padding-top:12px;border-top:1px solid #e0e0e0;color:#9CA3AF;font-size:12px;text-align:center}</style></head><body><h1>${topic}</h1><div class="meta">${contentType} • ${currentChild?.name||''} • ${new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}</div>${content.split('\n').map(line=>{const t=line.trim();if(!t)return '<br/>';if(t.startsWith('## '))return `<h2>${t.replace('## ','')}</h2>`;if(t.startsWith('# '))return `<h1>${t.replace('# ','')}</h1>`;return `<p>${t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</p>`}).join('')}<div class="footer">Bibi ile öğrenmek eğlenceli!</div></body></html>`
    const blob=new Blob([html],{type:'text/html;charset=utf-8'})
    const url=URL.createObjectURL(blob)
    const w=window.open(url,'_blank')
    setTimeout(()=>w?.print(),800)
    addMsg('bibi',`✅ "${topic}" hazırlandı! Açılan sayfada Ctrl+P → "PDF olarak kaydet" seç.`)
  }

  async function generatePresentation({topic, slideCount}) {
    if (!checkLimit('slides')) return
    const age = currentChild?.age||9
    addMsg('bibi',`📊 "${topic}" sunusu hazırlanıyor...`)
    const result = await callAI(null,[{role:'user',content:`"${topic}" hakkında ${slideCount} slaytlık detaylı Türkçe sunu. ${age<=8?'Basit, emoji kullan.':age<=12?'Açıklayıcı.':'Akademik.'}\nJSON (başka hiçbir şey yazma): {"title":"...","slides":[{"title":"...","points":["...","...","..."],"fun_fact":"..."}],"ending":"..."}`}],2000)
    let parsed={title:topic,slides:[],ending:''}
    try{parsed=JSON.parse(result.replace(/```json|```/g,'').trim())}catch(e){addMsg('bibi','Sunu oluşturulamadı 🙈');return}
    const colors=age<=8?['#c0392b','#e67e22','#27ae60','#2980b9','#8e44ad']:age<=12?['#1a3a5c','#1a4a2a','#3d1a5c','#1a3a4a','#4a2a1a']:['#0f1f35','#0f2818','#1f0f35','#0f2535','#2a1208']
    const slideHTML=parsed.slides.map((s,i)=>`<div class="slide" style="background:${colors[i%colors.length]}"><div class="slide-num">${parsed.title} — ${i+1}/${parsed.slides.length}</div><h2>${s.title||''}</h2><ul>${(s.points||[]).map(p=>`<li>${p}</li>`).join('')}</ul>${s.fun_fact?`<div class="fun-fact">💡 ${s.fun_fact}</div>`:''}</div>`).join('')
    const sc='<'+'/script>'
    const html=`<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/><title>${parsed.title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#000;color:#fff;height:100vh;overflow:hidden}.slide{display:none;height:100vh;padding:50px 60px;flex-direction:column;justify-content:center}.slide.active{display:flex}.slide-num{font-size:10px;opacity:.4;margin-bottom:12px;letter-spacing:2px;text-transform:uppercase}h2{font-size:${age<=8?'28px':'22px'};font-weight:900;margin-bottom:18px;border-bottom:2px solid rgba(255,255,255,.2);padding-bottom:12px}ul{list-style:none;display:flex;flex-direction:column;gap:12px}li{font-size:${age<=8?'19px':'16px'};line-height:1.5;display:flex;gap:8px}li::before{content:"▸";opacity:.6;flex-shrink:0}.fun-fact{margin-top:16px;padding:10px 14px;background:rgba(255,255,255,.1);border-radius:10px;font-size:13px}.nav{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.5);padding:8px 14px;border-radius:20px}button{padding:7px 18px;border:1px solid rgba(255,255,255,.25);border-radius:14px;background:rgba(255,255,255,.12);color:#fff;font-size:13px;font-weight:700;cursor:pointer}.counter{color:rgba(255,255,255,.5);font-size:12px;min-width:70px;text-align:center}</style></head><body><div class="slide active" style="background:${colors[0]};text-align:center;align-items:center;justify-content:center"><h2 style="border:none;font-size:36px">${parsed.title}</h2><p style="opacity:.5;margin-top:12px">${currentChild?.name||''} • Bibi ile hazırlandı</p></div>${slideHTML}<div class="slide" style="background:${colors[0]};text-align:center;align-items:center;justify-content:center"><h2 style="border:none">✅ Sunum Tamamlandı</h2><p style="opacity:.5;margin-top:8px">${parsed.ending||''}</p></div><div class="nav"><button onclick="p()">← Önceki</button><span class="counter" id="c">1 / ${parsed.slides.length+2}</span><button onclick="n()">Sonraki →</button></div><script>var i=0,sl=document.querySelectorAll('.slide');function show(x){sl.forEach(function(e){e.classList.remove('active')});sl[x].classList.add('active');document.getElementById('c').textContent=(x+1)+' / '+sl.length;}function n(){if(i<sl.length-1){i++;show(i);}}function p(){if(i>0){i--;show(i);}}document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' ')n();if(e.key==='ArrowLeft')p();});${sc}</body></html>`
    const blob=new Blob([html],{type:'text/html;charset=utf-8'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download=`${topic.slice(0,20)}-sunu.html`;a.click()
    URL.revokeObjectURL(url)
    await incrementUsage('slide_count')
    addMsg('bibi',`✅ "${topic}" sunusu indirildi!`)
  }

  function toggleMic() {
    if(isListening){recognitionRef.current?.stop();return}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!SR) return
    if(currentAudio){currentAudio.pause();setCurrentAudio(null)}
    window.speechSynthesis?.cancel()
    const rec=new SR();rec.lang='tr-TR';rec.continuous=false;rec.interimResults=true
    recognitionRef.current=rec
    let final=false
    rec.onstart=()=>setIsListening(true)
    rec.onresult=e=>{
      let interim='',finalText=''
      for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=e.results[i][0].transcript;else interim+=e.results[i][0].transcript}
      setInput(finalText||interim)
      if(finalText&&!final){final=true;rec.stop();setTimeout(()=>sendMessage(finalText,true),100)}
    }
    rec.onend=()=>setIsListening(false)
    rec.onerror=()=>setIsListening(false)
    try{rec.start()}catch{}
  }

  async function acceptProjectInvite() {
    if (!projectInvite) return
    await sb.from('project_invites').update({status:'accepted'}).eq('id', projectInvite.id)
    setProjectFriend(projectInvite.sender)
    setProjectType(projectInvite.project_type)
    setProjectInvite(null)
    setScreen('project')
  }

  async function rejectProjectInvite() {
    if (!projectInvite) return
    await sb.from('project_invites').update({status:'rejected'}).eq('id', projectInvite.id)
    setProjectInvite(null)
  }

  const theme = currentChild?.gender==='kız'&&currentChild?.age<=8
    ?{bg:'linear-gradient(135deg,#2d1b3d,#1a1040)',header:'linear-gradient(135deg,#b5449a,#7c2d8e)',bubble:'#b5449a'}
    :currentChild?.age<=8
    ?{bg:'linear-gradient(135deg,#0c2340,#1a3a5c)',header:'linear-gradient(135deg,#2563eb,#1d4ed8)',bubble:'#2563eb'}
    :{bg:'linear-gradient(135deg,#1a2e2a,#0f2535)',header:'linear-gradient(135deg,#0D9B7E,#0369a1)',bubble:'#0D9B7E'}

  const isSpeaking = !!currentAudio && !speechPaused
  const limitLabels = {
    messages: { icon:'💬', label:'Günlük mesaj', limit:limits.messages },
    images: { icon:'🎨', label:'Günlük görsel', limit:limits.images },
    slides: { icon:'📊', label:'Günlük slayt', limit:limits.slides },
    homework: { icon:'📚', label:'Günlük ödev fotoğrafı', limit:hwLimit },
  }

  return (
    <div style={{ minHeight:'100vh', background:theme.bg, display:'flex', flexDirection:'column', position:'relative' }}>
      {plan === 'free' && (
        <div style={{ background:'rgba(0,0,0,.2)', padding:'6px 16px', display:'flex', gap:12, alignItems:'center', flexShrink:0 }}>
          {[
            { icon:'💬', used:usage.message_count||0, limit:limits.messages },
            { icon:'🎨', used:usage.image_count||0, limit:limits.images },
            { icon:'📊', used:usage.slide_count||0, limit:limits.slides },
          ].map((item,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'rgba(255,255,255,.5)' }}>
              <span>{item.icon}</span>
              <span style={{ color: item.used >= item.limit ? '#fca88a' : 'rgba(255,255,255,.5)' }}>{item.used}/{item.limit}</span>
            </div>
          ))}
          <button onClick={()=>setScreen('subscription')} style={{ marginLeft:'auto', padding:'3px 10px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#7C3AED,#0D9B7E)', color:'white', fontSize:10, fontWeight:800, cursor:'pointer' }}>⭐ Yükselt</button>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:theme.header, padding:'10px 14px', position:'sticky', top:0, zIndex:10, flexShrink:0, borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        {/* Üst satır */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <button onClick={()=>{stopAudio();setShowExitPin(true)}} style={{ width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,.1)',border:'none',cursor:'pointer',color:'white',fontSize:16 }}>←</button>

          {/* Bibi kimliği */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ position:'relative' }}>
              <BibiFace expr={expr} size={40}/>
              <div style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%', background:'#4ade80', border:'2px solid rgba(0,0,0,.3)' }}/>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ color:'white', fontSize:14, fontWeight:900 }}>bibi</div>
                {streak > 0 && (
                  <div style={{ background:'rgba(251,191,36,.2)', border:'1px solid rgba(251,191,36,.4)', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:800, color:'#fbbf24', display:'flex', alignItems:'center', gap:3 }}>
                    🔥{streak}
                  </div>
                )}
              </div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:10 }}>● {status}</div>
            </div>
          </div>

          {/* Sağ butonlar */}
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            <button onClick={()=>setShowNewChatConfirm(true)} style={{ width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.15)',cursor:'pointer',color:'white',fontSize:13 }}>✏️</button>
            <button onClick={()=>setShowHistory(!showHistory)} style={{ width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.15)',cursor:'pointer',color:'white',fontSize:13 }}>🕐</button>
            <div style={{ position:'relative' }}>
            <button onClick={()=>setShowVoiceMenu(!showVoiceMenu)} style={{ borderRadius:20,background:voiceOn?'rgba(255,255,255,.15)':'rgba(0,0,0,.25)',border:'1.5px solid rgba(255,255,255,.2)',cursor:'pointer',padding:'6px 10px',color:voiceOn?'white':'rgba(255,255,255,.5)',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:4 }}>
              {isSpeaking ? '⏸' : voiceOn ? '🔊' : '🔇'}
            </button>
            {showVoiceMenu && (
              <>
                <div style={{position:'fixed',inset:0,zIndex:98}} onClick={()=>setShowVoiceMenu(false)}/>
                <div style={{ position:'absolute',top:44,right:0,zIndex:99,background:'rgba(20,30,28,.97)',backdropFilter:'blur(20px)',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:16,padding:12,minWidth:220,boxShadow:'0 8px 32px rgba(0,0,0,.4)' }}>
                  <div style={{ color:'rgba(255,255,255,.4)',fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:10 }}>SES AYARLARI</div>
                  <button onClick={()=>{setVoiceOn(!voiceOn);setShowVoiceMenu(false)}} style={{ width:'100%',padding:'9px 12px',border:'none',background:voiceOn?'rgba(13,155,126,.2)':'rgba(255,255,255,.05)',color:'white',fontSize:13,fontWeight:700,cursor:'pointer',borderRadius:10,textAlign:'left',marginBottom:8,fontFamily:'Nunito,sans-serif' }}>
                    {voiceOn?'🔊 Ses Açık — Kapat':'🔇 Ses Kapalı — Aç'}
                  </button>
                  <div style={{ color:'rgba(255,255,255,.4)',fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:8 }}>SES SEÇ</div>
                  {ELEVENLABS_VOICES.map(v=>(
                    <button key={v.id} onClick={()=>{setSelectedVoiceId(v.id);setShowVoiceMenu(false)}} style={{ width:'100%',padding:'9px 12px',border:`1.5px solid ${selectedVoiceId===v.id?'rgba(13,155,126,.5)':'rgba(255,255,255,.1)'}`,background:selectedVoiceId===v.id?'rgba(13,155,126,.2)':'transparent',color:selectedVoiceId===v.id?'#4ade80':'rgba(255,255,255,.7)',fontSize:13,fontWeight:700,cursor:'pointer',borderRadius:10,textAlign:'left',marginBottom:6,fontFamily:'Nunito,sans-serif',display:'flex',alignItems:'center',gap:8 }}>
                      <span>{v.gender==='female'?'👩':'👨'}</span>
                      <div><div>{v.name}</div><div style={{fontSize:10,opacity:.5}}>{v.label}</div></div>
                      {selectedVoiceId===v.id&&<span style={{marginLeft:'auto',color:'#4ade80'}}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
            </div>
        </div>
      </div>

      {showHistory && (
        <HistoryPanel child={currentChild} onClose={() => setShowHistory(false)}
          onLoadSession={async (sid) => {
            const { data: msgs } = await sb.from('messages').select('role,content,created_at').eq('session_id', sid).order('created_at', { ascending: true })
            if (!msgs?.length) { setShowHistory(false); return }
            stopAudio()
            setShowHistory(false)
            setHomeworkMode(false)
            setHomeworkStep(null)
            setInput('')
            setQuickReplies([])
            setMessages([])
            setSessionId(sid)
            sessionStorage.setItem('bibi_last_session_' + currentChild.id, sid)
            msgs.forEach(m => addMsg(m.role === 'user' ? 'user' : 'bibi', m.content, { ts: m.created_at ? new Date(m.created_at) : new Date() }))
          }}
        />
      )}

      {homeworkMode && (
        <div style={{ padding:'8px 14px',background:'rgba(13,155,126,.15)',borderBottom:'1px solid rgba(13,155,126,.3)',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
          <div style={{ flex:1,color:'rgba(255,255,255,.7)',fontSize:12,fontWeight:600 }}>
            📚 {homeworkStep==='analyzing'?'Analiz ediliyor...':homeworkStep==='waiting_solution'?'Çözümünü gönder':homeworkStep==='checking'?'Kontrol ediliyor...':homeworkStep==='practice'?'Pratik soru':'Ödev modu'}
          </div>
          {(homeworkStep==='waiting_solution'||homeworkStep==='practice') && (
            <button onClick={()=>{
              const inp=document.createElement('input');inp.type='file';inp.accept='image/*'
              inp.onchange=async e=>{
                const file=e.target.files[0];if(!file)return
                const reader=new FileReader()
                reader.onload=async ev=>{await checkHomeworkSolution(ev.target.result.split(',')[1])}
                reader.readAsDataURL(file)
              }
              inp.click()
            }} style={{ padding:'6px 12px',borderRadius:8,border:'none',background:'#0D9B7E',color:'white',fontSize:12,fontWeight:700,cursor:'pointer' }}>
              📸 {homeworkStep==='practice'?'Pratik Cevabı Gönder':'Çözümü Gönder'}
            </button>
          )}
          <button onClick={()=>{setHomeworkMode(false);setHomeworkStep('idle');setHomeworkQuestion(null)}} style={{ width:24,height:24,borderRadius:'50%',background:'rgba(255,255,255,.1)',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',fontSize:12 }}>✕</button>
        </div>
      )}

      <div style={{ flex:1,overflowY:'auto',padding:'16px 16px 8px' }}>
        {messages.map(m=>(
          <div key={m.id} style={{ display:'flex',marginBottom:14,justifyContent:m.role==='user'?'flex-end':'flex-start',gap:8,alignItems:'flex-end' }}>
            {m.role==='bibi'&&<div style={{flexShrink:0}}><BibiFace expr="idle" size={36}/></div>}
            {m.role==='image'?(
              <div style={{maxWidth:'85%'}}>
                <img src={m.url} style={{borderRadius:12,maxWidth:'100%',display:'block',marginBottom:6}} alt={m.title} onError={e=>e.target.style.display='none'}/>
                <a href={m.url} download="bibi-gorsel.jpg" target="_blank" style={{display:'inline-block',padding:'5px 12px',borderRadius:8,background:'rgba(255,255,255,.9)',color:'#0D9B7E',fontSize:12,fontWeight:700,textDecoration:'none'}}>⬇️ JPG İndir</a>
              </div>
            ):(
              <div style={{ display:'flex', alignItems:'flex-end', gap:6, maxWidth:'82%', flexDirection:m.role==='user'?'row-reverse':'row' }}>
                <BubbleContent m={m} theme={theme} />
                {m.role==='bibi' && (
                  <button onClick={()=>{
                    if(audioRef.current){stopAudio()}
                    else{speakMsg(m.text)}
                  }} style={{ width:28,height:28,borderRadius:'50%',background:currentAudio?'rgba(239,68,68,.3)':'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',cursor:'pointer',color:'rgba(255,255,255,.6)',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s' }}>{audioRef.current?'⏹':'▶️'}</button>
                )}
              </div>
            )}
          </div>
        ))}
        {isTyping&&(
          <div style={{display:'flex',gap:8,alignItems:'flex-end',marginBottom:14}}>
            <BibiFace expr="thinking" size={36}/>
            <div style={{padding:'12px 16px',borderRadius:'4px 18px 18px 18px',background:'rgba(255,255,255,.92)'}}>
              <div style={{display:'flex',gap:4}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#0D9B7E',animation:`dotPulse 1.2s ease ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Günlük Karşılama */}
      {showDailyGreeting && messages.length <= 2 && (
        <div style={{ padding:"0 14px 8px", flexShrink:0 }}>
          <div style={{ background:"rgba(13,155,126,.1)", border:"1px solid rgba(13,155,126,.2)", borderRadius:14, padding:"12px 14px" }}>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:10, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", marginBottom:8 }}>BUGÜN NE ÇALIŞALIM?</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[
                {icon:"📐",label:"Matematik",msg:"Bugün matematik çalışmak istiyorum!"},
                {icon:"🔬",label:"Fen",msg:"Fen bilimleri hakkında konuşalım!"},
                {icon:"📚",label:"Ödev",msg:"Ödevime yardım eder misin?"},
                {icon:"💬",label:"Sohbet",msg:"Bugün sadece sohbet etmek istiyorum."},
              ].map(function(item){return(
                <button key={item.label} onClick={function(){setShowDailyGreeting(false);sendMessage(item.msg)}}
                  style={{padding:"6px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.08)",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif",display:"flex",alignItems:"center",gap:5}}>
                  <span>{item.icon}</span>{item.label}
                </button>
              )})}
            </div>
            <button onClick={function(){setShowDailyGreeting(false)}} style={{background:"none",border:"none",color:"rgba(255,255,255,.25)",fontSize:10,cursor:"pointer",marginTop:8,fontFamily:"Nunito,sans-serif"}}>Kapat</button>
          </div>
        </div>
      )}

      {/* Hızlı Cevaplar */}
      {quickReplies.length > 0 && !isTyping && (
        <div style={{padding:"0 14px 8px",display:"flex",gap:6,flexWrap:"wrap",flexShrink:0}}>
          {quickReplies.map(function(qr){return(
            <button key={qr} onClick={function(){setQuickReplies([]);sendMessage(qr)}}
              style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.8)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {qr}
            </button>
          )})}
        </div>
      )}

      {currentAudio && (
        <div style={{ padding:'6px 14px',background:'rgba(124,58,237,.2)',borderTop:'1px solid rgba(124,58,237,.3)',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
          <div style={{ flex:1,color:'rgba(255,255,255,.7)',fontSize:12,fontWeight:600 }}>{speechPaused ? '⏸ Duraklatıldı' : '🔊 Konuşuyor...'}</div>
          <button onClick={toggleSpeech} style={{ padding:'5px 14px',borderRadius:10,border:'none',background:'rgba(124,58,237,.4)',color:'white',fontSize:12,fontWeight:700,cursor:'pointer' }}>
            {speechPaused ? '▶️ Devam Et' : '⏸ Duraklat'}
          </button>
          <button onClick={stopAudio} style={{ padding:'5px 10px',borderRadius:10,border:'none',background:'rgba(239,68,68,.3)',color:'white',fontSize:12,fontWeight:700,cursor:'pointer' }}>⏹ Durdur</button>
        </div>
      )}

      {/* Alt Navigasyon Çubuğu */}
      <div style={{ display:'flex',borderTop:'1px solid rgba(255,255,255,.06)',background:'rgba(0,0,0,.3)',backdropFilter:'blur(16px)',flexShrink:0 }}>
        {[
          { icon:'💬', label:'Sohbet', active:true },
          { icon:'🧩', label:'Oyna & Öğren', action:()=>{ stopAudio(); setScreen('projectSelect') } },
          { icon:'📖', label:'Hikayeler', action:()=>{ stopAudio(); setScreen('story') } },
        ].map((item,i)=>(
          <button key={i} onClick={item.action||null} style={{ flex:1,padding:'8px 4px 10px',background:'transparent',border:'none',cursor:item.action?'pointer':'default',display:'flex',flexDirection:'column',alignItems:'center',gap:2,opacity:item.active?1:0.55,fontFamily:'Nunito,sans-serif' }}>
            <span style={{ fontSize:20 }}>{item.icon}</span>
            <span style={{ fontSize:9,fontWeight:item.active?800:600,color:item.active?theme.bubble:'rgba(255,255,255,.6)',letterSpacing:0.2 }}>{item.label}</span>
            {item.active && <div style={{ width:20,height:2,borderRadius:2,background:theme.bubble,marginTop:1 }}/>}
          </button>
        ))}
      </div>

      <div style={{ padding:'10px 14px 14px',background:'rgba(0,0,0,.25)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,.08)',flexShrink:0 }}>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          <button onClick={toggleMic} style={{ width:46,height:46,borderRadius:'50%',flexShrink:0,cursor:'pointer',background:isListening?'rgba(239,68,68,.4)':currentChild?.age<=8?'rgba(74,222,128,.3)':'rgba(255,255,255,.12)',border:`1.5px solid ${isListening?'rgba(239,68,68,.6)':'rgba(255,255,255,.2)'}`,boxShadow:isListening?'0 0 16px rgba(239,68,68,.5)':'none',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🎤</button>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage(input)} placeholder="Bibi'ye yaz veya konuş..." style={{ flex:1,padding:'13px 18px',borderRadius:28,border:'1.5px solid rgba(255,255,255,.18)',background:'rgba(255,255,255,.1)',fontSize:15,color:'white',fontFamily:'Nunito,sans-serif' }}/>
          <ActionMenu
            onImage={()=>setInput('Bana bir görsel çiz: ')}
            onHomework={()=>{
              if (plan === 'free') { addMsg('bibi', '🔒 Ödev modu Go ve Pro planlarında kullanılabilir. Planını yükselt! ⭐'); return }
              if (homeworkCount >= hwLimit) { setShowLimitModal('homework'); return }
              const inp=document.createElement('input');inp.type='file';inp.accept='image/*'
              inp.onchange=async e=>{
                const file=e.target.files[0];if(!file)return
                const reader=new FileReader()
                reader.onload=async ev=>{await startHomework(ev.target.result.split(',')[1])}
                reader.readAsDataURL(file)
              }
              inp.click()
            }}
            onPDF={()=>setContentCreator('pdf')}
            onPresentation={()=>setContentCreator('presentation')}
          />
          <button onClick={()=>sendMessage(input)} style={{ width:46,height:46,borderRadius:'50%',background:input.trim()?theme.bubble:'rgba(255,255,255,.22)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18,transition:'background .2s' }}>➤</button>
        </div>
      </div>

      {showLimitModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'linear-gradient(135deg,#1A2E2A,#243d38)',borderRadius:24,padding:'28px 24px',maxWidth:320,width:'100%',textAlign:'center' }}>
            <div style={{ fontSize:48,marginBottom:12 }}>🔒</div>
            <div style={{ color:'white',fontSize:18,fontWeight:900,marginBottom:8 }}>Günlük Limit Doldu!</div>
            <div style={{ color:'rgba(255,255,255,.5)',fontSize:14,marginBottom:24 }}>
              {limitLabels[showLimitModal]?.icon} {limitLabels[showLimitModal]?.label} hakkın ({limitLabels[showLimitModal]?.limit}) doldu.
            </div>
            <button onClick={()=>{setShowLimitModal(null);setScreen('subscription')}} style={{ width:'100%',padding:13,borderRadius:14,border:'none',background:'linear-gradient(135deg,#7C3AED,#0D9B7E)',color:'white',fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:'Nunito,sans-serif',marginBottom:10 }}>⭐ Planımı Yükselt</button>
            <button onClick={()=>setShowLimitModal(null)} style={{ background:'none',border:'none',color:'rgba(255,255,255,.35)',fontSize:13,cursor:'pointer' }}>Kapat</button>
          </div>
        </div>
      )}

      {projectInvite && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'linear-gradient(135deg,#1A2E2A,#243d38)',borderRadius:24,padding:'28px 24px',maxWidth:320,width:'100%',textAlign:'center' }}>
            <div style={{ fontSize:48,marginBottom:12 }}>{TYPE_ICONS[projectInvite.project_type]||'🚀'}</div>
            <div style={{ color:'white',fontSize:18,fontWeight:900,marginBottom:8 }}>{projectInvite.sender?.name} seni davet etti!</div>
            <div style={{ color:'rgba(255,255,255,.5)',fontSize:14,marginBottom:24 }}>{TYPE_NAMES[projectInvite.project_type]||'Proje'} yapmak istiyor</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={rejectProjectInvite} style={{ flex:1,padding:12,borderRadius:12,border:'1.5px solid rgba(255,255,255,.15)',background:'transparent',color:'rgba(255,255,255,.5)',fontWeight:700,cursor:'pointer',fontFamily:'Nunito,sans-serif' }}>Reddet</button>
              <button onClick={acceptProjectInvite} style={{ flex:2,padding:12,borderRadius:12,border:'none',background:'#0D9B7E',color:'white',fontWeight:800,cursor:'pointer',fontFamily:'Nunito,sans-serif' }}>✓ Kabul Et</button>
            </div>
          </div>
        </div>
      )}

      {showForgotPin && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.85)',backdropFilter:'blur(8px)',zIndex:201,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'linear-gradient(135deg,#1A2E2A,#243d38)',borderRadius:24,padding:'32px 28px',width:300,textAlign:'center' }}>
            {forgotSuccess ? (
              <><div style={{fontSize:48,marginBottom:12}}>✅</div><div style={{color:'#4ade80',fontSize:16,fontWeight:900}}>PIN güncellendi!</div></>
            ) : forgotStep===1 ? (
              <>
                <div style={{fontSize:40,marginBottom:12}}>🔑</div>
                <div style={{color:'white',fontSize:16,fontWeight:900,marginBottom:16}}>PIN Sıfırla</div>
                <input type="password" placeholder="Uygulama şifreniz" value={forgotPassword} onChange={e=>setForgotPassword(e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.08)',color:'white',fontSize:13,fontFamily:'Nunito,sans-serif',boxSizing:'border-box',marginBottom:8}}/>
                {forgotError&&<div style={{color:'#fca88a',fontSize:11,marginBottom:8}}>{forgotError}</div>}
                <button onClick={async()=>{
                  if(!forgotPassword){setForgotError('Şifre girin');return}
                  const {error}=await sb.auth.signInWithPassword({email:currentUser.email,password:forgotPassword})
                  if(error){setForgotError('Şifre hatalı!');return}
                  setForgotError('');setForgotStep(2)
                }} style={{width:'100%',padding:11,borderRadius:10,border:'none',background:'#0D9B7E',color:'white',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:'Nunito,sans-serif',marginBottom:8}}>Devam →</button>
                <button onClick={()=>{setShowForgotPin(false);setForgotStep(1);setForgotPassword('');setForgotError('')}} style={{background:'none',border:'none',color:'rgba(255,255,255,.3)',fontSize:12,cursor:'pointer'}}>İptal</button>
              </>
            ) : (
              <>
                <div style={{fontSize:40,marginBottom:12}}>🔒</div>
                <div style={{color:'white',fontSize:16,fontWeight:900,marginBottom:16}}>Yeni PIN</div>
                <input type="number" placeholder="Yeni PIN" value={newPin} onChange={e=>setNewPin(e.target.value.slice(0,4))} style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.08)',color:'white',fontSize:13,fontFamily:'Nunito,sans-serif',boxSizing:'border-box',marginBottom:8}}/>
                <input type="number" placeholder="PIN tekrar" value={newPinConfirm} onChange={e=>setNewPinConfirm(e.target.value.slice(0,4))} style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.08)',color:'white',fontSize:13,fontFamily:'Nunito,sans-serif',boxSizing:'border-box',marginBottom:8}}/>
                {forgotError&&<div style={{color:'#fca88a',fontSize:11,marginBottom:8}}>{forgotError}</div>}
                <button onClick={async()=>{
                  if(newPin.length!==4){setForgotError('4 haneli PIN girin');return}
                  if(newPin!==newPinConfirm){setForgotError("PIN'ler eşleşmiyor");return}
                  await sb.from('parents').update({pin:newPin}).eq('id',currentUser.id)
                  setForgotSuccess(true)
                  setTimeout(()=>{setShowForgotPin(false);setForgotStep(1);setForgotPassword('');setNewPin('');setNewPinConfirm('');setForgotError('');setForgotSuccess(false)},2000)
                }} style={{width:'100%',padding:11,borderRadius:10,border:'none',background:'#0D9B7E',color:'white',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:'Nunito,sans-serif',marginBottom:8}}>Kaydet ✓</button>
                <button onClick={()=>setForgotStep(1)} style={{background:'none',border:'none',color:'rgba(255,255,255,.3)',fontSize:12,cursor:'pointer'}}>← Geri</button>
              </>
            )}
          </div>
        </div>
      )}

      {showExitPin && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Nunito,sans-serif' }}>
          <div style={{ width:'100%',maxWidth:340,textAlign:'center' }}>
            <div style={{fontSize:48,marginBottom:16}}>🔒</div>
            <div style={{color:'white',fontSize:20,fontWeight:900,marginBottom:8}}>Veli Dogrulama</div>
            <div style={{color:'rgba(255,255,255,.45)',fontSize:13,marginBottom:24}}>PIN kodunuzu girin</div>
            <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:16}}>
              {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:'50%',background:exitPin.length>i?'white':'transparent',border:'2px solid rgba(255,255,255,.4)'}}/>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,maxWidth:240,margin:'0 auto 16px'}}>
              {[1,2,3,4,5,6,7,8,9,null,0,'⌫'].map((d,i)=>(
                <button key={i} onClick={async()=>{
                  if(d==='⌫'){setExitPin(p=>p.slice(0,-1));setExitPinError('')}
                  else if(d!==null&&exitPin.length<4){
                    const np=exitPin+String(d);setExitPin(np)
                    if(np.length===4){
                      const {data:parent}=await sb.from('parents').select('pin').eq('id',currentUser.id).maybeSingle()
                      if(String(parent?.pin)===String(np)){setShowExitPin(false);setExitPin('');setScreen('children')}
                      else{setExitPinError('PIN hatalı!');setExitPin('')}
                    }
                  }
                }} style={{aspectRatio:'1',borderRadius:'50%',border:'none',background:d===null?'transparent':'rgba(255,255,255,.1)',color:'white',fontSize:20,fontWeight:700,cursor:d===null?'default':'pointer',fontFamily:'Nunito,sans-serif'}}>{d}</button>
              ))}
            </div>
            {exitPinError&&<div style={{color:'#fca88a',fontSize:13,marginBottom:8}}>{exitPinError}</div>}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
              <button onClick={()=>setShowForgotPin(true)} style={{background:'none',border:'none',color:'rgba(255,255,255,.4)',fontSize:12,cursor:'pointer',fontFamily:'Nunito,sans-serif'}}>PIN'imi Unuttum?</button>
              <button onClick={()=>{setShowExitPin(false);setExitPin('');setExitPinError('')}} style={{background:'none',border:'none',color:'rgba(255,255,255,.35)',fontSize:13,cursor:'pointer',fontFamily:'Nunito,sans-serif'}}>← Geri</button>
            </div>
          </div>
        </div>
      )}

      {/* Kişilik Sorusu Rating */}
      {personalityQ && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center', fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'linear-gradient(135deg,#1A2E2A,#243d38)', borderRadius:'24px 24px 0 0', padding:'24px 20px 36px', width:'100%', maxWidth:480 }}>
            <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 }}>
              💭 Seni Tanıyorum — {(currentChild?.personality_progress||0)+1}/50
            </div>
            <div style={{ color:'white', fontSize:16, fontWeight:800, marginBottom:20, lineHeight:1.5 }}>{personalityQ.text}</div>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {[
                { score:1, label:'Hiç', emoji:'😶' },
                { score:2, label:'Bazen', emoji:'🤔' },
                { score:3, label:'Orta', emoji:'😊' },
                { score:4, label:'Çoğu zaman', emoji:'😄' },
                { score:5, label:'Her zaman', emoji:'🤩' },
              ].map(opt => (
                <button key={opt.score} onClick={() => savePersonalityAnswer(opt.score)}
                  style={{ flex:1, padding:'12px 4px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.06)', color:'white', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif', textAlign:'center' }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{opt.emoji}</div>
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={() => setPersonalityQ(null)} style={{ width:'100%', padding:10, borderRadius:12, border:'none', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.4)', fontSize:13, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Şimdi değil</button>
          </div>
        </div>
      )}

      {/* Günlük Duygu Picker */}
      {showEmotionPicker && !todayEmotion && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center', fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'linear-gradient(135deg,#1A2E2A,#243d38)', borderRadius:'24px 24px 0 0', padding:'24px 20px 36px', width:'100%', maxWidth:480 }}>
            <div style={{ color:'white', fontSize:18, fontWeight:900, marginBottom:6, textAlign:'center' }}>Bugün nasıl hissediyorsun? 💙</div>
            <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:24, textAlign:'center' }}>Hislerini benimle paylaş</div>
            <div style={{ display:'flex', justifyContent:'space-around', marginBottom:16 }}>
              {EMOTIONS.map(e => (
                <button key={e.id} onClick={async () => {
                  setTodayEmotion(e.id)
                  setShowEmotionPicker(false)
                  await saveEmotionLog(currentChild.id, e.id, '')
                  addMsg('bibi', `${e.emoji} ${e.label} hissediyorsun, anlıyorum. ${e.id === 'üzgün' || e.id === 'sinirli' ? 'Anlatmak istediğin bir şey var mı?' : 'Bu harika! Bugün seninle olmak güzel.'}`)
                }}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px', borderRadius:14, border:`1.5px solid ${e.color}44`, background:`${e.color}18`, cursor:'pointer', minWidth:56 }}>
                  <div style={{ fontSize:32 }}>{e.emoji}</div>
                  <div style={{ color:e.color, fontSize:11, fontWeight:700 }}>{e.label}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowEmotionPicker(false)} style={{ width:'100%', padding:10, borderRadius:12, border:'none', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.4)', fontSize:13, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Şimdi değil</button>
          </div>
        </div>
      )}

      {showStreakCelebration && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'linear-gradient(135deg,#1A2E2A,#243d38)', borderRadius:24, padding:'32px 28px', width:300, textAlign:'center' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🔥</div>
            <div style={{ color:'#fbbf24', fontSize:28, fontWeight:900, marginBottom:8 }}>{streak} Gün!</div>
            <div style={{ color:'white', fontSize:16, fontWeight:700, marginBottom:8 }}>Muhteşem bir seri!</div>
            <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginBottom:20 }}>Her gün Bibi ile buluşmaya devam ediyorsun. Bu kararlılık seni çok özel kılıyor!</div>
            <button onClick={function(){setShowStreakCelebration(false)}} style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:'#fbbf24', color:'#1A2E2A', fontWeight:900, cursor:'pointer', fontFamily:'Nunito,sans-serif', fontSize:15 }}>Teşekkürler! 🚀</button>
          </div>
        </div>
      )}

      {showNewChatConfirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'linear-gradient(135deg,#1A2E2A,#243d38)',borderRadius:24,padding:'28px 24px',maxWidth:300,width:'100%',textAlign:'center' }}>
            <div style={{ fontSize:40,marginBottom:12 }}>✏️</div>
            <div style={{ color:'white',fontSize:16,fontWeight:900,marginBottom:8 }}>Yeni Sohbet</div>
            <div style={{ color:'rgba(255,255,255,.5)',fontSize:13,marginBottom:20 }}>Mevcut sohbet kapanacak. Devam etmek istiyor musun?</div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setShowNewChatConfirm(false)} style={{ flex:1,padding:12,borderRadius:12,border:'1.5px solid rgba(255,255,255,.15)',background:'transparent',color:'rgba(255,255,255,.5)',fontWeight:700,cursor:'pointer',fontFamily:'Nunito,sans-serif' }}>İptal</button>
              <button onClick={async()=>{
                setShowNewChatConfirm(false)
                stopAudio()

                // Mevcut oturumu kapat ve başlıklandır
                if (sessionId) {
                  try {
                    await fetch('https://bibi-app-rho.vercel.app/api/session-close', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ session_id: sessionId, started_at: sessionStorage.getItem('bibi_session_start') })
                    })
                  } catch(e) { console.log('Session close hata:', e) }
                }

                setMessages([])
                setSessionId(null)
                setInput('')
                setHomeworkMode(false)
                setHomeworkStep(null)
                setQuickReplies([])
                setShowDailyGreeting(false)
                sessionStorage.removeItem('bibi_last_session_' + currentChild.id)
                sessionStorage.removeItem('bibi_session_start')

                // Kişiselleştirilmiş açılış mesajı al
                try {
                  const ctxRes = await fetch('https://bibi-app-rho.vercel.app/api/session-context', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ child_id: currentChild.id, child: { name: currentChild.name, age: currentChild.age } })
                  })
                  const ctx = await ctxRes.json()
                  if (ctx.opening_message) {
                    setTimeout(() => addMsg('bibi', ctx.opening_message), 50)
                    return
                  }
                } catch(e) { console.log('Session context hata:', e) }

                // Fallback açılış
                const opening = currentChild.age<=8 ? 'Heyyyy ' + currentChild.name + '! 🎉 Yeni sohbet başlıyor!' : 'Merhaba ' + currentChild.name + '! Yeni bir sohbet başlatalım.'
                setTimeout(() => addMsg('bibi', opening), 50)
              }} style={{ flex:1,padding:12,borderRadius:12,border:'none',background:'#0D9B7E',color:'white',fontWeight:800,cursor:'pointer',fontFamily:'Nunito,sans-serif' }}>✓ Evet</button>
            </div>
          </div>
        </div>
      )}

      {contentCreator && (
        <ContentCreator type={contentCreator} age={currentChild?.age||9} onClose={()=>setContentCreator(null)}
          onDone={async(params)=>{ if(params.type==='pdf') await generatePDF(params); else await generatePresentation(params) }}/>
      )}

      <style>{`
        @keyframes dotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  )
}
