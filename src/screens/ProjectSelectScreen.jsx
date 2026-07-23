import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'

const MAIN_TYPES = [
  { id:"homework",   icon:"📚", name:"Birlikte Ödev Yap",        desc:"İki Bibi birlikte ödev sorularını çözer",        bg:"rgba(37,99,235,.2)",   border:"rgba(37,99,235,.4)" },
  { id:"experiment", icon:"🔬", name:"Birlikte Deney/Proje Yap", desc:"İki Bibi birlikte deney tasarlar ve araştırır",  bg:"rgba(13,155,126,.15)", border:"rgba(13,155,126,.3)" },
  { id:"games",      icon:"🎮", name:"Bilgi Yarışması & Oyunlar", desc:"Yarış, oyna, öğren — birlikte eğlen!",           bg:"rgba(124,58,237,.15)", border:"rgba(124,58,237,.4)" },
]

const GAME_TYPES = [
  { id:"quiz",    icon:"🎯", name:"Bilgi Yarışması",   desc:"5 dersten 5 soru, yaşına göre zorluk", multi:true },
  { id:"math",    icon:"➕", name:"Matematik Oyunu",   desc:"Hızlı hesap yarışması",                multi:true },
  { id:"memory",  icon:"🧩", name:"Eşleştirme Oyunu", desc:"Kartları eşleştir, hafızanı test et",  multi:false },
  { id:"market",  icon:"🛒", name:"Market Kasiyeri",   desc:"Para hesapla, üstü doğru ver!",        multi:false },
  { id:"chess",   icon:"♟️", name:"Satranç",           desc:"Klasik satranç oyunu",                 multi:true },
  { id:"riddle",  icon:"🧠", name:"Akıl Oyunları",    desc:"Bulmaca ve mantık soruları",            multi:false },
]

export default function ProjectSelectScreen() {
  const { currentChild, projectFriend, setProjectType, setIsProjectHost, setScreen } = useApp()
  const [showGames, setShowGames] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)

  if (!currentChild) { setScreen('children'); return null }

  async function startSolo(type) {
    setProjectType(type)
    setIsProjectHost(true)
    setScreen('project')
  }

  async function startWithFriend(type) {
    if (!projectFriend) { setScreen('friends'); return }
    // Arkadaşa davet gönder
    await sb.from('project_invites').insert({
      from_child_id: currentChild.id,
      to_child_id: projectFriend.id,
      project_type: type,
      status: 'pending',
      expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    })
    setProjectType(type)
    setIsProjectHost(true)
    setScreen('project')
  }

  function selectMain(id) {
    if (id === 'games') { setShowGames(true); return }
    // Ödev ve deney sadece arkadaşla
    if (!projectFriend) { setScreen('friends'); return }
    startWithFriend(id)
  }

  // Mod seçim ekranı
  if (selectedGame) {
    const game = GAME_TYPES.find(g => g.id === selectedGame)
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
        <div style={{ width:'100%', maxWidth:380, animation:'fadeUp .4s ease' }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontSize:48, marginBottom:8 }}>{game.icon}</div>
            <div style={{ color:'white', fontSize:20, fontWeight:900 }}>{game.name}</div>
            <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginTop:4 }}>Nasıl oynamak istiyorsun?</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <button onClick={() => startSolo(selectedGame)}
              style={{ background:'rgba(13,155,126,.15)', border:'1.5px solid rgba(13,155,126,.3)', borderRadius:16, padding:20, cursor:'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🧒</div>
              <div style={{ color:'white', fontSize:15, fontWeight:800 }}>Tek Başıma Oyna</div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, marginTop:3 }}>Kendi skorunu kır, kendin ile yarış</div>
            </button>

            {game.multi && projectFriend ? (
              <button onClick={() => startWithFriend(selectedGame)}
                style={{ background:'rgba(124,58,237,.15)', border:'1.5px solid rgba(124,58,237,.4)', borderRadius:16, padding:20, cursor:'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>👥</div>
                <div style={{ color:'white', fontSize:15, fontWeight:800 }}>Arkadaşınla Oyna</div>
                <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, marginTop:3 }}>{projectFriend.name}'e davet gönderilecek</div>
              </button>
            ) : game.multi && !projectFriend ? (
              <div style={{ background:'rgba(255,255,255,.04)', border:'1.5px dashed rgba(255,255,255,.15)', borderRadius:16, padding:20, textAlign:'left' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>👥</div>
                <div style={{ color:'rgba(255,255,255,.4)', fontSize:15, fontWeight:800 }}>Arkadaşınla Oyna</div>
                <div style={{ color:'rgba(255,255,255,.3)', fontSize:12, marginTop:3 }}>Önce arkadaşlar ekranından arkadaş seç</div>
              </div>
            ) : null}
          </div>
          <button onClick={() => setSelectedGame(null)} style={{ width:'100%', marginTop:14, padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>← Geri</button>
        </div>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:420, animation:'fadeUp .4s ease' }}>

        {!showGames ? (
          <>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🚀</div>
              <div style={{ color:'white', fontSize:20, fontWeight:900 }}>{currentChild.name}</div>
              {projectFriend && <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginTop:2 }}>& {projectFriend.name}</div>}
              <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginTop:8 }}>Ne yapmak istiyorsun?</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {MAIN_TYPES.map(t => (
                <button key={t.id} onClick={() => selectMain(t.id)}
                  style={{ background:t.bg, border:`1.5px solid ${t.border}`, borderRadius:16, padding:18, cursor:'pointer', textAlign:'left', width:'100%', fontFamily:'Nunito,sans-serif' }}
                  onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'}
                  onMouseOut={e=>e.currentTarget.style.transform=''}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:24 }}>{t.icon}</div>
                      <div style={{ color:'white', fontSize:15, fontWeight:800, marginTop:8 }}>{t.name}</div>
                      <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, marginTop:3 }}>{t.desc}</div>
                    </div>
                    {t.id === 'games' && <div style={{ color:'rgba(255,255,255,.3)', fontSize:20 }}>›</div>}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setScreen(projectFriend ? 'friends' : 'children')} style={{ width:'100%', marginTop:16, padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>← Geri</button>
          </>
        ) : (
          <>
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🎮</div>
              <div style={{ color:'white', fontSize:20, fontWeight:900 }}>Bilgi Yarışması & Oyunlar</div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginTop:4 }}>Hangi oyunu oynamak istiyorsun?</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {GAME_TYPES.map(g => (
                <button key={g.id} onClick={() => setSelectedGame(g.id)}
                  style={{ background:'rgba(124,58,237,.12)', border:'1.5px solid rgba(124,58,237,.3)', borderRadius:14, padding:14, cursor:'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif', position:'relative' }}
                  onMouseOver={e=>e.currentTarget.style.background='rgba(124,58,237,.25)'}
                  onMouseOut={e=>e.currentTarget.style.background='rgba(124,58,237,.12)'}>
                  {g.multi && <div style={{ position:'absolute', top:8, right:8, fontSize:9, color:'#4ade80', fontWeight:700, background:'rgba(74,222,128,.15)', borderRadius:6, padding:'2px 5px' }}>👥</div>}
                  <div style={{ fontSize:28, marginBottom:8 }}>{g.icon}</div>
                  <div style={{ color:'white', fontSize:13, fontWeight:800, marginBottom:4 }}>{g.name}</div>
                  <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, lineHeight:1.4 }}>{g.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowGames(false)} style={{ width:'100%', marginTop:14, padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>← Geri</button>
          </>
        )}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
