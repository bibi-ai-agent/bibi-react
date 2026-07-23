import { useState } from 'react'
import { useApp } from '../lib/store'

const MAIN_TYPES = [
  { id:"homework",   icon:"📚", name:"Birlikte Ödev Yap",        desc:"İki Bibi birlikte ödev sorularını çözer",        bg:"rgba(37,99,235,.2)",   border:"rgba(37,99,235,.4)" },
  { id:"experiment", icon:"🔬", name:"Birlikte Deney/Proje Yap", desc:"İki Bibi birlikte deney tasarlar ve araştırır",  bg:"rgba(13,155,126,.15)", border:"rgba(13,155,126,.3)" },
  { id:"games",      icon:"🎮", name:"Bilgi Yarışması & Oyunlar", desc:"Yarış, oyna, öğren — birlikte eğlen!",           bg:"rgba(124,58,237,.15)", border:"rgba(124,58,237,.4)" },
]

const GAME_TYPES = [
  { id:"quiz",      icon:"🎯", name:"Bilgi Yarışması",     desc:"5 dersten 5 soru, yaşına göre zorluk" },
  { id:"chess",     icon:"♟️", name:"Satranç",             desc:"Klasik satranç, Bibi sana yol gösterir" },
  { id:"math",      icon:"➕", name:"Matematik Oyunu",     desc:"Hızlı hesap yarışması, kim daha hızlı?" },
  { id:"market",    icon:"🛒", name:"Market Kasiyeri",     desc:"Para hesapla, üstü doğru ver!" },
  { id:"memory",    icon:"🧩", name:"Eşleştirme Oyunu",   desc:"Kartları eşleştir, hafızanı test et" },
  { id:"riddle",    icon:"🧠", name:"Akıl Oyunları",      desc:"Bulmaca, mantık soruları ve bilmeceler" },
]

export default function ProjectSelectScreen() {
  const { currentChild, projectFriend, setProjectType, setScreen, setIsProjectHost } = useApp()
  const [showGames, setShowGames] = useState(false)

  if (!currentChild || !projectFriend) {
    setScreen('friends'); return null
  }

  function select(type) {
    setProjectType(type)
    setIsProjectHost(true)
    setScreen('project')
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:420, animation:'fadeUp .4s ease' }}>

        {!showGames ? (
          <>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🚀</div>
              <div style={{ color:'white', fontSize:20, fontWeight:900 }}>{currentChild.name} & {projectFriend.name}</div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginTop:4 }}>Hangi aktiviteyi yapmak istiyorsun?</div>
              <div style={{ color:'rgba(255,255,255,.35)', fontSize:12, marginTop:6 }}>{projectFriend.name}'e bildirim gidecek ve onaylaması beklenecek</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {MAIN_TYPES.map(t => (
                <button key={t.id} onClick={() => t.id === 'games' ? setShowGames(true) : select(t.id)}
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
            <button onClick={() => setScreen('friends')} style={{ width:'100%', marginTop:16, padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>← Geri</button>
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
                <button key={g.id} onClick={() => select(g.id)}
                  style={{ background:'rgba(124,58,237,.12)', border:'1.5px solid rgba(124,58,237,.3)', borderRadius:14, padding:14, cursor:'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif' }}
                  onMouseOver={e=>e.currentTarget.style.background='rgba(124,58,237,.25)'}
                  onMouseOut={e=>e.currentTarget.style.background='rgba(124,58,237,.12)'}>
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
