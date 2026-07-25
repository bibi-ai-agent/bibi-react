import { useState, useRef, useEffect } from 'react'
import { useApp } from '../lib/store'
import { callAI } from '../lib/api'
import { speakElevenLabs, speakBrowser, cleanText, getVoiceForChild } from '../lib/audio'

const GENRES = [
  { id:'fantazi',    icon:'🧙', name:'Fantazi',     desc:'Sihir, ejderhalar ve büyülü dünyalar',   color:'#7C3AED', bg:'rgba(124,58,237,.15)' },
  { id:'korku',      icon:'👻', name:'Korku',        desc:'Gizemli ve tüyler ürpertici hikayeler',  color:'#ef4444', bg:'rgba(239,68,68,.15)'   },
  { id:'romantizm',  icon:'💝', name:'Romantizm',    desc:'Dostluk ve sevgi dolu hikayeler',        color:'#ec4899', bg:'rgba(236,72,153,.15)'  },
  { id:'masal',      icon:'🏰', name:'Masal',        desc:'Prensesler, prensler ve ejderhalar',     color:'#f59e0b', bg:'rgba(245,158,11,.15)'  },
  { id:'bilimkurgu', icon:'🚀', name:'Bilim Kurgu',  desc:'Uzay, robotlar ve gelecek dünyası',      color:'#06b6d4', bg:'rgba(6,182,212,.15)'   },
  { id:'komik',      icon:'🤣', name:'Komik',        desc:'Güldüren ve eğlendiren hikayeler',       color:'#84cc16', bg:'rgba(132,204,22,.15)'  },
  { id:'gizem',      icon:'🔍', name:'Gizem',        desc:'Gizemli olaylar ve dedektif maceraları', color:'#6366f1', bg:'rgba(99,102,241,.15)'  },
  { id:'macera',     icon:'⚔️', name:'Macera',       desc:'Heyecanlı yolculuklar ve kahramanlar',   color:'#0D9B7E', bg:'rgba(13,155,126,.15)'  },
]

const STORY_PROMPTS = {
  fantazi:    'Sihirli bir dünyada geçen, büyücüler ve ejderhalarla dolu',
  korku:      'Gerilim dolu ama çocuklara uygun, gizemli bir atmosferde geçen',
  romantizm:  'Dostluk ve sevgi temalı, sıcak ve güzel duygular içeren',
  masal:      'Klasik masal formatında, iyilik ve kötülük arasındaki mücadeleyi anlatan',
  bilimkurgu: 'Gelecekte uzayda ya da teknoloji dolu bir dünyada geçen',
  komik:      'Çok güldürücü, espritüel ve eğlenceli durumlar içeren',
  gizem:      'Gizemli bir bulmacayı çözen kahraman odaklı',
  macera:     'Heyecan dolu maceralar ve cesur bir kahramanı anlatan',
}

export default function StoryScreen() {
  const { currentChild, setScreen, selectedVoiceId, elevenLabsEnabled } = useApp()
  const age = currentChild?.age || 9

  const [phase, setPhase] = useState('genre')
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [storyMode, setStoryMode] = useState(null)
  const [story, setStory] = useState(null)
  const [currentPara, setCurrentPara] = useState(0)
  const [images, setImages] = useState({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState(null)
  const [userStory, setUserStory] = useState('')
  const [userStoryResult, setUserStoryResult] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const genre = GENRES.find(g => g.id === selectedGenre)

  function stopAudio() {
    if (currentAudio) { currentAudio.pause(); setCurrentAudio(null) }
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
  }

  // Paragraf değişince sesi durdur
  useEffect(() => { stopAudio() }, [currentPara])

  async function generateStory(mode) {
    setPhase('generating')
    setError('')
    const paraCount = age <= 8 ? 4 : age <= 12 ? 6 : 8
    const wordCount = age <= 8 ? '25-35' : age <= 12 ? '50-70' : '80-100'
    const prompt = STORY_PROMPTS[selectedGenre] || ''

    let parsed = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await callAI(
          'Sen yaratıcı bir çocuk hikayesi yazarısın. SADECE geçerli JSON döndür, başka hiçbir şey yazma.',
          [{
            role: 'user',
            content: `${age} yaşında bir çocuk için Türkçe ${selectedGenre} hikayesi yaz.
Hikaye ${prompt} olmalı. ${paraCount} paragraf, her paragraf ${wordCount} kelime.
${age <= 8 ? 'Çok basit kelimeler, kısa cümleler.' : age <= 12 ? 'Anlaşılır dil.' : 'Akıcı, etkileyici dil.'}
SADECE şu JSON formatında döndür:
{"title":"Hikaye başlığı","paragraphs":["1. paragraf metni","2. paragraf metni"],"imagePrompts":["first paragraph scene in English","second paragraph scene in English"],"moral":"Hikayenin mesajı 1 cümlede"}`
          }],
          2500
        )
        const clean = result?.replace(/```json|```/g, '').trim() || ''
        const start = clean.indexOf('{')
        const end = clean.lastIndexOf('}')
        if (start !== -1 && end !== -1) {
          const candidate = JSON.parse(clean.slice(start, end + 1))
          if (candidate?.paragraphs?.length > 0) { parsed = candidate; break }
        }
      } catch {}
    }

    if (!parsed) {
      setError('Hikaye oluşturulamadı, tekrar dene.')
      setPhase('mode')
      return
    }

    setStory(parsed)
    setCurrentPara(0)
    setImages({})
    setPhase('reading')

    // Görselleri arka planda paralel yükle
    if (mode === 'illustrated' && parsed.imagePrompts?.length) {
      const style = age <= 8 ? 'cute cartoon children book illustration, colorful' : age <= 12 ? 'colorful storybook illustration' : 'artistic book illustration'
      parsed.imagePrompts.forEach((prompt, i) => {
        const url = `https://bibi-app-rho.vercel.app/api/image?prompt=${encodeURIComponent(prompt + ', ' + style)}&t=${Date.now()}-${i}`
        setImages(prev => ({ ...prev, [i]: url }))
      })
    }
  }

  async function speakParagraph(text) {
    stopAudio()
    setIsPlaying(true)
    const clean = cleanText(text)
    if (!clean) { setIsPlaying(false); return }
    const vid = selectedVoiceId || getVoiceForChild(currentChild)
    const onEnd = () => {
      setIsPlaying(false)
      setCurrentAudio(null)
    }
    try {
      if (elevenLabsEnabled) {
        const audio = await speakElevenLabs(clean, vid, onEnd)
        setCurrentAudio(audio)
      } else {
        speakBrowser(clean, age, onEnd)
      }
    } catch {
      speakBrowser(clean, age, onEnd)
    }
  }

  async function improveUserStory() {
    setGenerating(true)
    try {
      const result = await callAI(null, [{
        role: 'user',
        content: `${age} yaşında bir çocuğun yazdığı hikayeyi güzelleştir. Orijinal fikri koru, daha akıcı ve etkileyici yap. Türkçe. Sadece hikayeyi yaz:\n"${userStory}"`
      }], 1500)
      setUserStoryResult(result)
    } catch { setUserStoryResult('Hikaye oluşturulamadı, tekrar dene.') }
    setGenerating(false)
  }

  function resetStory() {
    stopAudio()
    setStory(null)
    setImages({})
    setCurrentPara(0)
    setSelectedGenre(null)
    setStoryMode(null)
    setError('')
    setPhase('genre')
  }

  // ── Tür Seçim ──
  if (phase === 'genre') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#0f1f35)', display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ background:'rgba(255,255,255,.05)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' }}>Hikaye Modu</div>
          <div style={{ color:'white', fontSize:18, fontWeight:900 }}>📖 Hangi tür?</div>
        </div>
        <button onClick={() => setScreen('children')} style={{ background:'rgba(255,255,255,.1)', border:'1.5px solid rgba(255,255,255,.2)', borderRadius:20, padding:'7px 14px', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>← Geri</button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px' }}>
        <button onClick={() => setPhase('write')} style={{ width:'100%', padding:'16px 18px', borderRadius:16, border:'2px dashed rgba(255,255,255,.2)', background:'rgba(255,255,255,.04)', color:'white', cursor:'pointer', fontFamily:'Nunito,sans-serif', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:28 }}>✍️</div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:15, fontWeight:800 }}>Kendi Hikayeni Yaz</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:2 }}>Bibi hikayeni güzelleştirsin</div>
          </div>
        </button>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:12 }}>VEYA TÜR SEÇ</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {GENRES.map(g => (
            <button key={g.id} onClick={() => { setSelectedGenre(g.id); setPhase('mode') }}
              style={{ padding:'16px 14px', borderRadius:16, border:`1.5px solid ${g.color}44`, background:g.bg, cursor:'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif', transition:'all .15s' }}
              onMouseOver={e => e.currentTarget.style.transform='scale(1.02)'}
              onMouseOut={e => e.currentTarget.style.transform='scale(1)'}>
              <div style={{ fontSize:30, marginBottom:8 }}>{g.icon}</div>
              <div style={{ color:'white', fontSize:14, fontWeight:800, marginBottom:3 }}>{g.name}</div>
              <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, lineHeight:1.4 }}>{g.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Mod Seçim ──
  if (phase === 'mode') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#0f1f35)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ fontSize:56, marginBottom:12 }}>{genre?.icon}</div>
      <div style={{ color:'white', fontSize:22, fontWeight:900, marginBottom:6 }}>{genre?.name} Hikayesi</div>
      <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginBottom:8 }}>Nasıl okumak istersin?</div>
      {error && <div style={{ color:'#fca88a', fontSize:13, marginBottom:16, textAlign:'center' }}>{error}</div>}
      <div style={{ width:'100%', maxWidth:340, display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
        <button onClick={() => { setStoryMode('illustrated'); generateStory('illustrated') }}
          style={{ padding:'20px', borderRadius:16, border:`1.5px solid ${genre?.color}66`, background:genre?.bg, cursor:'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🖼️</div>
          <div style={{ color:'white', fontSize:15, fontWeight:800 }}>Resimli Hikaye</div>
          <div style={{ color:'rgba(255,255,255,.45)', fontSize:12, marginTop:3 }}>Her bölüm için özel görsel</div>
        </button>
        <button onClick={() => { setStoryMode('normal'); generateStory('normal') }}
          style={{ padding:'20px', borderRadius:16, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.06)', cursor:'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>📝</div>
          <div style={{ color:'white', fontSize:15, fontWeight:800 }}>Normal Hikaye</div>
          <div style={{ color:'rgba(255,255,255,.45)', fontSize:12, marginTop:3 }}>Metin + Bibi sesli okur</div>
        </button>
      </div>
      <button onClick={() => setPhase('genre')} style={{ background:'none', border:'none', color:'rgba(255,255,255,.3)', fontSize:13, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>← Geri</button>
    </div>
  )

  // ── Üretiliyor ──
  if (phase === 'generating') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#0f1f35)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'Nunito,sans-serif', padding:24 }}>
      <div style={{ fontSize:64, marginBottom:16, animation:'float 2s ease-in-out infinite' }}>{genre?.icon}</div>
      <div style={{ color:'white', fontSize:20, fontWeight:900, marginBottom:8 }}>Hikaye yazılıyor...</div>
      <div style={{ color:'rgba(255,255,255,.4)', fontSize:14, marginBottom:32, textAlign:'center' }}>Bibi senin için özel bir hikaye hazırlıyor ✨</div>
      <div style={{ display:'flex', gap:8 }}>
        {[0,1,2].map(i => <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:genre?.color, animation:`dp 1.2s ease ${i*0.2}s infinite` }}/>)}
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}} @keyframes dp{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )

  // ── Okuma Ekranı ──
  if (phase === 'reading' && story) {
    const para = story.paragraphs[currentPara]
    const img = images[currentPara]
    const isLast = currentPara === story.paragraphs.length - 1
    const progress = ((currentPara + 1) / story.paragraphs.length) * 100

    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#0f1f35)', display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>
        {/* Header */}
        <div style={{ background:'rgba(0,0,0,.4)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <div style={{ color:genre?.color, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>{genre?.icon} {genre?.name}</div>
            <div style={{ color:'white', fontSize:14, fontWeight:900, marginTop:1 }}>{story.title}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>{currentPara+1} / {story.paragraphs.length}</div>
            <button onClick={() => { stopAudio(); resetStory() }} style={{ background:'rgba(255,255,255,.1)', border:'none', borderRadius:16, padding:'6px 12px', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>✕</button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:'rgba(255,255,255,.08)', flexShrink:0 }}>
          <div style={{ height:'100%', width:`${progress}%`, background:genre?.color, transition:'width .4s ease' }}/>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
          {/* Görsel */}
          {storyMode === 'illustrated' && (
            <div style={{ borderRadius:16, overflow:'hidden', marginBottom:16, background:'rgba(255,255,255,.04)', minHeight:180, display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${genre?.color}22` }}>
              {img ? (
                <img src={img} style={{ width:'100%', display:'block', borderRadius:16, maxHeight:280, objectFit:'cover' }} alt=""
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
              ) : null}
              <div style={{ display: img ? 'none' : 'flex', alignItems:'center', justifyContent:'center', padding:32, flexDirection:'column', gap:8 }}>
                <div style={{ fontSize:32 }}>{genre?.icon}</div>
                <div style={{ color:'rgba(255,255,255,.3)', fontSize:12 }}>Görsel yükleniyor...</div>
              </div>
            </div>
          )}

          {/* Paragraf */}
          <div style={{ background:'rgba(255,255,255,.07)', borderRadius:16, padding:'20px 18px', marginBottom:16, border:`1px solid rgba(255,255,255,.08)` }}>
            <div style={{ color:'white', fontSize: age<=8 ? 18 : 16, lineHeight: age<=8 ? 2 : 1.8, fontWeight: age<=8 ? 700 : 400 }}>{para}</div>
          </div>

          {/* Son paragraf - moral */}
          {isLast && story.moral && (
            <div style={{ background:`${genre?.color}15`, border:`1.5px solid ${genre?.color}44`, borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ color:genre?.color, fontSize:12, fontWeight:800, marginBottom:4 }}>💡 Hikayenin Mesajı</div>
              <div style={{ color:'rgba(255,255,255,.8)', fontSize:14, lineHeight:1.6 }}>{story.moral}</div>
            </div>
          )}
        </div>

        {/* Kontroller */}
        <div style={{ padding:'12px 16px 28px', background:'rgba(0,0,0,.4)', borderTop:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
          {/* Ses */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
            <button onClick={() => isPlaying ? stopAudio() : speakParagraph(para)}
              style={{ width:52, height:52, borderRadius:'50%', border:`2px solid ${genre?.color}`, background: isPlaying ? genre?.color : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, transition:'all .2s' }}>
              {isPlaying ? '⏸' : '🔊'}
            </button>
          </div>

          {/* Navigasyon */}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { stopAudio(); setCurrentPara(p => Math.max(0, p-1)) }}
              disabled={currentPara === 0}
              style={{ flex:1, padding:13, borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.06)', color: currentPara===0?'rgba(255,255,255,.2)':'white', fontWeight:700, cursor:currentPara===0?'default':'pointer', fontFamily:'Nunito,sans-serif' }}>
              ← Önceki
            </button>
            {isLast ? (
              <button onClick={resetStory}
                style={{ flex:2, padding:13, borderRadius:12, border:'none', background:genre?.color, color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', fontSize:14 }}>
                🎉 Başka Hikaye
              </button>
            ) : (
              <button onClick={() => { stopAudio(); setCurrentPara(p => p+1) }}
                style={{ flex:2, padding:13, borderRadius:12, border:'none', background:genre?.color, color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', fontSize:14 }}>
                Devam Et →
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Kendi Hikayeni Yaz ──
  if (phase === 'write') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#0f1f35)', display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ background:'rgba(255,255,255,.05)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, fontWeight:700 }}>HİKAYE YAZAR</div>
          <div style={{ color:'white', fontSize:18, fontWeight:900 }}>✍️ Hikayeni Yaz</div>
        </div>
        <button onClick={() => { setUserStory(''); setUserStoryResult(null); setPhase('genre') }} style={{ background:'rgba(255,255,255,.1)', border:'none', borderRadius:16, padding:'7px 14px', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>← Geri</button>
      </div>
      <div style={{ flex:1, padding:'20px 16px', display:'flex', flexDirection:'column' }}>
        {!userStoryResult ? (
          <>
            <div style={{ color:'rgba(255,255,255,.6)', fontSize:13, marginBottom:12, lineHeight:1.6 }}>
              Aklındaki hikayeyi yaz — Bibi onu daha güzel hale getirecek! ✨
            </div>
            <textarea value={userStory} onChange={e => setUserStory(e.target.value)}
              placeholder="Bir gün ormanda yürürken..."
              style={{ flex:1, minHeight:220, padding:'14px 16px', borderRadius:14, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.07)', color:'white', fontSize:15, fontFamily:'Nunito,sans-serif', lineHeight:1.7, resize:'none', outline:'none' }}/>
            <button onClick={improveUserStory} disabled={!userStory.trim() || generating}
              style={{ marginTop:12, padding:14, borderRadius:14, border:'none', background: generating ? 'rgba(13,155,126,.5)' : '#0D9B7E', color:'white', fontWeight:800, fontSize:14, cursor: generating ? 'default' : 'pointer', fontFamily:'Nunito,sans-serif', opacity: !userStory.trim() ? 0.5 : 1 }}>
              {generating ? '✨ Bibi yazıyor...' : '✨ Bibi Güzelleştirsin!'}
            </button>
          </>
        ) : (
          <>
            <div style={{ color:'#4ade80', fontSize:13, fontWeight:700, marginBottom:12 }}>✨ Bibi hikayen güzelleştirdi!</div>
            <div style={{ flex:1, background:'rgba(255,255,255,.06)', borderRadius:14, padding:16, overflowY:'auto', marginBottom:12 }}>
              <div style={{ color:'white', fontSize:15, lineHeight:1.8, whiteSpace:'pre-line' }}>{userStoryResult}</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => speakParagraph(userStoryResult)}
                style={{ flex:1, padding:12, borderRadius:12, border:'1.5px solid #0D9B7E', background:'rgba(13,155,126,.15)', color:'#4ade80', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
                {isPlaying ? '⏸ Dur' : '🔊 Dinle'}
              </button>
              <button onClick={() => { stopAudio(); setUserStory(''); setUserStoryResult(null) }}
                style={{ flex:1, padding:12, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
                🔄 Yeni
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return null
}
