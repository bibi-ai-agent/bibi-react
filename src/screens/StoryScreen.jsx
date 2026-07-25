import { useState, useRef, useEffect } from 'react'
import { useApp } from '../lib/store'
import { sb } from '../lib/supabase'
import { callAI } from '../lib/api'
import { speakElevenLabs, speakBrowser, cleanText, getVoiceForChild } from '../lib/audio'

const GENRES = [
  { id:'masal',      icon:'🏰', name:'Masal',        desc:'Prensesler, devler ve sihirli dünyalar', color:'#f59e0b', bg:'linear-gradient(135deg,#92400e,#78350f)' },
  { id:'korku',      icon:'👻', name:'Korku',         desc:'Gizemli ve tüyler ürpertici hikayeler',  color:'#a78bfa', bg:'linear-gradient(135deg,#4c1d95,#3b0764)' },
  { id:'bilimkurgu', icon:'🚀', name:'Uzay & Bilim',  desc:'Uzay, robotlar ve geleceğin dünyası',    color:'#06b6d4', bg:'linear-gradient(135deg,#164e63,#0c4a6e)' },
  { id:'komik',      icon:'😂', name:'Komedi',        desc:'Güldüren ve neşe veren hikayeler',       color:'#84cc16', bg:'linear-gradient(135deg,#365314,#1a2e05)' },
  { id:'gizem',      icon:'🔎', name:'Gizem',         desc:'Bulmacalar ve dedektif maceraları',      color:'#6366f1', bg:'linear-gradient(135deg,#312e81,#1e1b4b)' },
  { id:'macera',     icon:'⚔️', name:'Macera',        desc:'Heyecanlı yolculuklar ve kahramanlar',   color:'#0D9B7E', bg:'linear-gradient(135deg,#064e3b,#022c22)' },
]

const STORY_PROMPTS = {
  masal:      'Klasik masal formatında, iyilik ve kötülük arasındaki mücadeleyi anlatan, sihirli unsurlar içeren',
  korku:      'Gerilim dolu ama çocuklara uygun, gizemli bir atmosferde geçen, sonunda mutlu biten',
  bilimkurgu: 'Gelecekte uzayda ya da teknoloji dolu bir dünyada geçen, bilim merakı uyandıran',
  komik:      'Çok güldürücü, espritüel ve neşeli durumlar içeren, çocukları güldüren',
  gizem:      'Gizemli bir bulmacayı çözen meraklı bir kahraman odaklı, ipuçları içeren',
  macera:     'Heyecan dolu maceralar ve cesur bir kahramanı anlatan, dostluk temalı',
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
  const [stories, setStories] = useState([])
  const [selectedStory, setSelectedStory] = useState(null)
  const [loadingStories, setLoadingStories] = useState(false)

  const genre = GENRES.find(g => g.id === selectedGenre)

  function stopAudio() {
    if (currentAudio) { currentAudio.pause(); setCurrentAudio(null) }
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
  }

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
            content: `${age} yaşında bir çocuk için Türkçe ${selectedGenre} hikayesi yaz. Hikaye ${prompt} olmalı. ${paraCount} paragraf, her paragraf ${wordCount} kelime. ${age <= 8 ? 'Çok basit kelimeler.' : age <= 12 ? 'Anlaşılır dil.' : 'Akıcı dil.'} SADECE şu JSON formatında döndür:\n{"title":"Başlık","paragraphs":["paragraf1","paragraf2"],"imagePrompts":["english scene 1","english scene 2"],"moral":"Mesaj"}`
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

    if (!parsed) { setError('Hikaye oluşturulamadı, tekrar dene.'); setPhase('mode'); return }

    setStory(parsed)
    setCurrentPara(0)
    setImages({})
    setPhase('reading')

    if (mode === 'illustrated' && parsed.imagePrompts?.length) {
      const style = age <= 8 ? 'cute cartoon children book illustration, colorful, vibrant' : age <= 12 ? 'colorful storybook illustration, detailed' : 'artistic book illustration, cinematic'
      // Görselleri sırayla yükle - önce ilk ikisini, sonra diğerlerini
      const loadImage = (i) => {
        if (i >= parsed.imagePrompts.length) return
        const url = `https://bibi-app-rho.vercel.app/api/image?prompt=${encodeURIComponent(parsed.imagePrompts[i] + ', ' + style)}&t=${Date.now()}-${i}`
        const img = new Image()
        img.onload = () => {
          setImages(prev => ({ ...prev, [i]: url }))
          // Sonraki görseli yükle
          setTimeout(() => loadImage(i + 1), 500)
        }
        img.onerror = () => {
          setTimeout(() => loadImage(i + 1), 500)
        }
        img.src = url
        // URL'i hemen set et ama yüklenmesini bekle
        setImages(prev => ({ ...prev, [i]: null }))
      }
      // İlk iki görseli paralel başlat
      loadImage(0)
      setTimeout(() => loadImage(1), 200)
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
      // Ses bitince 1sn sonra otomatik sonraki sayfaya geç
      setTimeout(() => {
        setCurrentPara(p => {
          if (story && p < story.paragraphs.length - 1) return p + 1
          return p
        })
      }, 1000)
    }
    try {
      if (elevenLabsEnabled) { const audio = await speakElevenLabs(clean, vid, onEnd); setCurrentAudio(audio) }
      else speakBrowser(clean, age, onEnd)
    } catch { speakBrowser(clean, age, onEnd) }
  }

  async function improveUserStory() {
    setGenerating(true)
    try {
      const result = await callAI(null, [{ role:'user', content:`${age} yaşında bir çocuğun yazdığı hikayeyi güzelleştir. Orijinal fikri koru, daha akıcı ve etkileyici yap. Türkçe. Sadece hikayeyi yaz:\n"${userStory}"` }], 1500)
      setUserStoryResult(result)
    } catch { setUserStoryResult('Hikaye oluşturulamadı.') }
    setGenerating(false)
  }

  async function loadStoriesForGenre(genreId) {
    setLoadingStories(true)
    const ageGroup = age <= 8 ? 'young' : age <= 12 ? 'middle' : 'teen'
    const { data } = await sb.from('stories')
      .select('*').eq('genre', genreId).eq('age_group', ageGroup)
      .order('created_at', { ascending: true })
    setStories(data || [])
    setLoadingStories(false)
    // Hikaye listesi açılınca tüm görselleri arka planda preload et
    if (data?.length) {
      data.forEach(s => {
        (s.image_urls || []).forEach(url => {
          const img = new Image()
          img.src = url
        })
      })
    }
  }

  async function startStory(s, mode) {
    setStoryMode(mode)
    setStory({ title: s.title, paragraphs: s.paragraphs, imagePrompts: s.image_prompts, imageUrls: s.image_urls, moral: s.moral })
    setCurrentPara(0)
    setImages({})
    setPhase('reading')
    if (mode === 'illustrated' && s.image_urls?.length) {
      // Tüm görselleri paralel preload et
      s.image_urls.forEach((url, i) => {
        const img = new Image()
        img.onload = () => setImages(prev => ({ ...prev, [i]: url }))
        img.onerror = () => setImages(prev => ({ ...prev, [i]: url }))
        img.src = url
      })
    }
  }

  function resetStory() {
    stopAudio(); setStory(null); setImages({}); setCurrentPara(0)
    setSelectedGenre(null); setStoryMode(null); setError(''); setPhase('genre')
  }

  // ── Tür Seçim ──
  if (phase === 'genre') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0a0f1e,#0d1f2d,#0a1a12)', fontFamily:'Nunito,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={() => setScreen('children')} style={{ width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', cursor:'pointer', color:'white', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ color:'white', fontSize:20, fontWeight:900 }}>📖 Hikaye Zamanı</div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginTop:2 }}>Hangi hikayeyi dinlemek istersin?</div>
        </div>
        <div style={{ width:38 }}/>
      </div>

      <div style={{ padding:'24px 16px 40px' }}>
        {/* Kendi yaz butonu */}
        <div onClick={() => setPhase('write')}
          style={{ background:'linear-gradient(135deg,rgba(124,58,237,.3),rgba(13,155,126,.3))', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:20, padding:'18px 20px', marginBottom:20, cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#7C3AED,#0D9B7E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>✍️</div>
          <div>
            <div style={{ color:'white', fontSize:16, fontWeight:900 }}>Kendi Hikayeni Yaz</div>
            <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginTop:3 }}>Bibi hikayeni güzelleştirsin ✨</div>
          </div>
          <div style={{ marginLeft:'auto', color:'rgba(255,255,255,.3)', fontSize:22 }}>›</div>
        </div>

        <div style={{ color:'rgba(255,255,255,.3)', fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:14 }}>VEYA TÜR SEÇ</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {GENRES.map(g => (
            <div key={g.id} onClick={() => { setSelectedGenre(g.id); setPhase('mode'); loadStoriesForGenre(g.id) }}
              style={{ background:g.bg, borderRadius:20, padding:'18px 16px', cursor:'pointer', border:'1px solid rgba(255,255,255,.08)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-20, right:-20, fontSize:80, opacity:.08 }}>{g.icon}</div>
              <div style={{ fontSize:36, marginBottom:10 }}>{g.icon}</div>
              <div style={{ color:'white', fontSize:15, fontWeight:900, marginBottom:4 }}>{g.name}</div>
              <div style={{ color:'rgba(255,255,255,.55)', fontSize:11, lineHeight:1.5 }}>{g.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Hikaye Listesi ──
  if (phase === 'mode') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0a0f1e,#0d1f2d)', display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => setPhase('genre')} style={{ width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', cursor:'pointer', color:'white', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
        <div>
          <div style={{ color:'white', fontSize:17, fontWeight:900 }}>{genre?.icon} {genre?.name}</div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>Bir hikaye seç</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {loadingStories ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <div style={{ display:'flex', gap:8 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:'white', animation:`dp 1.2s ease ${i*0.2}s infinite` }}/>)}
            </div>
          </div>
        ) : stories.length === 0 ? (
          <div style={{ textAlign:'center', color:'rgba(255,255,255,.3)', padding:40 }}>Hikaye bulunamadı</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {stories.map(s => (
              <div key={s.id} style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, overflow:'hidden' }}>
                <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ color:'white', fontSize:15, fontWeight:800, marginBottom:4 }}>{s.title}</div>
                  <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, lineHeight:1.5 }}>{s.paragraphs?.[0]?.slice(0, 80)}...</div>
                  {s.moral && <div style={{ color:genre?.color, fontSize:11, marginTop:6, fontWeight:700 }}>💡 {s.moral}</div>}
                </div>
                <div style={{ display:'flex', gap:0 }}>
                  <button onClick={() => startStory(s, 'illustrated')}
                    style={{ flex:1, padding:'12px 8px', border:'none', borderRight:'1px solid rgba(255,255,255,.06)', background:'transparent', color:'rgba(255,255,255,.7)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
                    🖼️ Resimli
                  </button>
                  <button onClick={() => startStory(s, 'normal')}
                    style={{ flex:1, padding:'12px 8px', border:'none', background:'transparent', color:'rgba(255,255,255,.7)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
                    🔊 Sesli
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes dp{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )

  // ── Okuma Ekranı ──
  if (phase === 'reading' && story) {
    const para = story.paragraphs[currentPara]
    const img = images[currentPara]
    const isLast = currentPara === story.paragraphs.length - 1
    const progress = ((currentPara + 1) / story.paragraphs.length) * 100

    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0a0f1e,#0d1f2d,#0a1a12)', display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>
        {/* Header */}
        <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:12, background:'rgba(0,0,0,.3)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <button onClick={resetStory} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', cursor:'pointer', color:'white', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'rgba(255,255,255,.4)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5 }}>{genre?.icon} {genre?.name}</div>
            <div style={{ color:'white', fontSize:14, fontWeight:900, marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{story.title}</div>
          </div>
          <div style={{ background:'rgba(255,255,255,.08)', borderRadius:20, padding:'4px 12px', flexShrink:0 }}>
            <span style={{ color:'white', fontSize:12, fontWeight:700 }}>{currentPara+1}</span>
            <span style={{ color:'rgba(255,255,255,.3)', fontSize:12 }}> / {story.paragraphs.length}</span>
          </div>
        </div>

        {/* Progress */}
        <div style={{ height:2, background:'rgba(255,255,255,.06)' }}>
          <div style={{ height:'100%', width:`${progress}%`, background:`linear-gradient(90deg,${genre?.color},white)`, transition:'width .5s ease', borderRadius:2 }}/>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 16px' }}>
          {/* Görsel */}
          {storyMode === 'illustrated' && (
            <div style={{ borderRadius:20, overflow:'hidden', marginBottom:20, background:'rgba(255,255,255,.04)', aspectRatio:'16/9', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,.08)', position:'relative' }}>
              {img ? (
                <img src={img} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} alt=""
                  onError={e => { e.target.style.display='none' }}/>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:20 }}>
                  <div style={{ fontSize:36, animation:'float 2s ease-in-out infinite' }}>{genre?.icon}</div>
                  <div style={{ color:'rgba(255,255,255,.3)', fontSize:12 }}>Görsel hazırlanıyor...</div>
                  <div style={{ display:'flex', gap:4 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,.3)', animation:`dp 1.2s ease ${i*0.2}s infinite` }}/>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paragraf */}
          <div style={{ background:'rgba(255,255,255,.05)', borderRadius:20, padding:'22px 20px', marginBottom:16, border:'1px solid rgba(255,255,255,.07)', position:'relative' }}>
            <div style={{ position:'absolute', top:16, left:16, fontSize:40, opacity:.06, lineHeight:1 }}>"</div>
            <div style={{ color:'white', fontSize: age<=8 ? 19 : 16, lineHeight: age<=8 ? 2.1 : 1.9, fontWeight: age<=8 ? 600 : 400, position:'relative' }}>{para}</div>
          </div>

          {/* Moral */}
          {isLast && story.moral && (
            <div style={{ background:`linear-gradient(135deg,${genre?.color}22,rgba(255,255,255,.04))`, border:`1px solid ${genre?.color}44`, borderRadius:16, padding:'16px 18px', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ fontSize:18 }}>💡</div>
                <div style={{ color:genre?.color, fontSize:12, fontWeight:800, textTransform:'uppercase', letterSpacing:1 }}>Hikayenin Mesajı</div>
              </div>
              <div style={{ color:'rgba(255,255,255,.8)', fontSize:14, lineHeight:1.7 }}>{story.moral}</div>
            </div>
          )}
        </div>

        {/* Kontroller */}
        <div style={{ padding:'16px 20px 32px', background:'rgba(0,0,0,.4)', borderTop:'1px solid rgba(255,255,255,.06)', backdropFilter:'blur(12px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <button onClick={() => { stopAudio(); setCurrentPara(p => Math.max(0, p-1)) }}
              disabled={currentPara === 0}
              style={{ width:44, height:44, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.06)', color: currentPara===0 ? 'rgba(255,255,255,.2)' : 'white', cursor: currentPara===0 ? 'default' : 'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>←</button>

            <button onClick={() => isPlaying ? stopAudio() : speakParagraph(para)}
              style={{ flex:1, height:48, borderRadius:24, border:`1.5px solid ${genre?.color}`, background: isPlaying ? genre?.color : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:'white', fontWeight:700, fontSize:14, transition:'all .2s' }}>
              {isPlaying ? (<><span>⏸</span><span>Duraklat</span></>) : (<><span>🔊</span><span>Sesli Dinle</span></>)}
            </button>

            {!isLast ? (
              <button onClick={() => { stopAudio(); setCurrentPara(p => p+1) }}
                style={{ width:44, height:44, borderRadius:'50%', border:`1.5px solid ${genre?.color}`, background:genre?.color, color:'white', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>→</button>
            ) : (
              <button onClick={resetStory}
                style={{ width:44, height:44, borderRadius:'50%', border:'1.5px solid #fbbf24', background:'#fbbf24', color:'#000', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>🎉</button>
            )}
          </div>

          {isLast && (
            <button onClick={resetStory}
              style={{ width:'100%', padding:14, borderRadius:16, border:'none', background:`linear-gradient(135deg,${genre?.color},#7C3AED)`, color:'white', fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
              🎉 Başka Hikaye Seç
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Kendi Yaz ──
  if (phase === 'write') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0a0f1e,#0d1f2d)', display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ padding:'20px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <button onClick={() => { setUserStory(''); setUserStoryResult(null); setPhase('genre') }} style={{ width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', cursor:'pointer', color:'white', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
        <div>
          <div style={{ color:'white', fontSize:17, fontWeight:900 }}>✍️ Kendi Hikayeni Yaz</div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginTop:1 }}>Bibi güzelleştirsin</div>
        </div>
      </div>

      <div style={{ flex:1, padding:'20px 16px', display:'flex', flexDirection:'column' }}>
        {!userStoryResult ? (
          <>
            <textarea value={userStory} onChange={e => setUserStory(e.target.value)}
              placeholder="Bir gün ormanda yürürken garip bir ses duydum..."
              style={{ flex:1, minHeight:220, padding:'16px', borderRadius:16, border:'1.5px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.05)', color:'white', fontSize:15, fontFamily:'Nunito,sans-serif', lineHeight:1.8, resize:'none', outline:'none' }}/>
            <button onClick={improveUserStory} disabled={!userStory.trim() || generating}
              style={{ marginTop:14, padding:15, borderRadius:16, border:'none', background: generating ? 'rgba(124,58,237,.4)' : 'linear-gradient(135deg,#7C3AED,#0D9B7E)', color:'white', fontWeight:800, fontSize:15, cursor: generating ? 'default' : 'pointer', fontFamily:'Nunito,sans-serif', opacity: !userStory.trim() ? 0.4 : 1 }}>
              {generating ? '✨ Bibi yazıyor...' : '✨ Bibi Güzelleştirsin!'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ fontSize:20 }}>✨</div>
              <div style={{ color:'#4ade80', fontSize:14, fontWeight:700 }}>Bibi hikayen güzelleştirdi!</div>
            </div>
            <div style={{ flex:1, background:'rgba(255,255,255,.05)', borderRadius:16, padding:18, overflowY:'auto', marginBottom:14, border:'1px solid rgba(255,255,255,.08)' }}>
              <div style={{ color:'white', fontSize:15, lineHeight:1.9, whiteSpace:'pre-line' }}>{userStoryResult}</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => isPlaying ? stopAudio() : speakParagraph(userStoryResult)}
                style={{ flex:1, padding:13, borderRadius:14, border:'1.5px solid #0D9B7E', background:'rgba(13,155,126,.12)', color:'#4ade80', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif', fontSize:14 }}>
                {isPlaying ? '⏸ Duraklat' : '🔊 Dinle'}
              </button>
              <button onClick={() => { stopAudio(); setUserStory(''); setUserStoryResult(null) }}
                style={{ flex:1, padding:13, borderRadius:14, border:'none', background:'linear-gradient(135deg,#7C3AED,#0D9B7E)', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', fontSize:14 }}>
                🔄 Yeni Yaz
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return null
}
