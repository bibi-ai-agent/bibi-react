import { useState, useEffect } from 'react'
import { useApp } from '../lib/store'
import BibiFace from '../components/BibiFace'

export default function ChildHomeScreen() {
  const { currentChild, setScreen } = useApp()
  const [show, setShow] = useState(false)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    setTimeout(() => setShow(true), 100)
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Günaydın')
    else if (hour < 18) setGreeting('İyi günler')
    else setGreeting('İyi akşamlar')
  }, [])

  const age = currentChild?.age || 10
  const name = currentChild?.name || ''
  const streak = currentChild?.streak_days || 0

  const BG = age <= 8
    ? 'linear-gradient(160deg,#FFF9F0,#FEF3C7)'
    : 'linear-gradient(160deg,#FFF9F0,#ECFDF5)'

  const ACCENT = '#F59E0B'

  return (
    <div style={{ minHeight:'100vh', background:BG, fontFamily:'Nunito,sans-serif', display:'flex', flexDirection:'column' }}>

      {/* Üst bar */}
      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ color:'rgba(0,0,0,.35)', fontSize:11, fontWeight:700 }}>{greeting}!</div>
          <div style={{ color:'#1a1206', fontSize:20, fontWeight:900 }}>{name} 👋</div>
        </div>
        {streak > 0 && (
          <div style={{ background:'#FEF3C7', border:'1.5px solid #FDE68A', borderRadius:12, padding:'6px 12px', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:16 }}>🔥</span>
            <span style={{ color:'#D97706', fontSize:13, fontWeight:900 }}>{streak} gün!</span>
          </div>
        )}
      </div>

      {/* Papağan + Mesaj */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'10px 20px 20px', opacity:show?1:0, transform:show?'translateY(0)':'translateY(20px)', transition:'all 0.5s ease' }}>
        <BibiFace expr="happy" size={age <= 8 ? 130 : 110}/>
        <div style={{ marginTop:10, background:'white', borderRadius:20, padding:'12px 18px', maxWidth:260, textAlign:'center', boxShadow:'0 4px 20px rgba(245,158,11,.15)', border:'1.5px solid #FDE68A' }}>
          <div style={{ color:'#1a1206', fontSize:age <= 8 ? 14 : 13, fontWeight:700, lineHeight:1.5 }}>
            {age <= 8
              ? 'Heyyyy ' + name + '! Bugün ne öğreneceğiz? 🌟'
              : 'Merhaba ' + name + '! Bugün ne konuşacağız?'}
          </div>
        </div>
      </div>

      {/* Ana Buton */}
      <div style={{ padding:'0 20px', opacity:show?1:0, transition:'all 0.5s ease 0.1s' }}>
        <button onClick={() => setScreen('chat')}
          style={{ width:'100%', padding:'18px', borderRadius:20, border:'none', background:ACCENT, color:'white', fontWeight:900, fontSize:17, cursor:'pointer', fontFamily:'Nunito,sans-serif', boxShadow:'0 4px 16px rgba(245,158,11,.35)', letterSpacing:0.3 }}>
          {age <= 8 ? '💬 Dai ile Konuş!' : '💬 Dai ile Konuş'}
        </button>
      </div>

      {/* Hızlı Erişim */}
      <div style={{ padding:'14px 20px', opacity:show?1:0, transition:'all 0.5s ease 0.2s' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[
            { icon:'📖', label:'Hikayeler', screen:'story', color:'#EDE9FE', border:'#DDD6FE', text:'#7C3AED' },
            { icon:'🧩', label:'Oyunlar', screen:'projectSelect', color:'#ECFDF5', border:'#BBF7D0', text:'#16a34a' },
            { icon:'⭐', label:'Başarılar', screen:'achievements', color:'#FEF3C7', border:'#FDE68A', text:'#D97706' },
          ].map(item => (
            <button key={item.label} onClick={() => setScreen(item.screen)}
              style={{ background:item.color, border:'1.5px solid '+item.border, borderRadius:14, padding:'12px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
              <span style={{ fontSize:22 }}>{item.icon}</span>
              <span style={{ color:item.text, fontSize:10, fontWeight:700 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Günlük hedef */}
      <div style={{ padding:'0 20px', opacity:show?1:0, transition:'all 0.5s ease 0.3s' }}>
        <div style={{ background:'white', border:'1.5px solid #FDE68A', borderRadius:16, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:24 }}>🎯</span>
          <div style={{ flex:1 }}>
            <div style={{ color:'#1a1206', fontSize:12, fontWeight:700 }}>Bugünün hedefi</div>
            <div style={{ height:5, background:'#FEF3C7', borderRadius:3, marginTop:5 }}>
              <div style={{ width:'40%', height:'100%', borderRadius:3, background:ACCENT }}/>
            </div>
          </div>
          <div style={{ color:'#D97706', fontSize:11, fontWeight:700 }}>2/5</div>
        </div>
      </div>

    </div>
  )
}
