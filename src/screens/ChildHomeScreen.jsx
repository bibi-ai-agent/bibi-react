import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import BibiFace from '../components/BibiFace'

const BUBBLES_YOUNG = [
  'Heyyyy! Bugün ne öğreneceğiz? 🌟',
  'Seninle oynamak istiyorum! 🎮',
  'Bir hikaye okuyalım mı? 📖',
  'Matematik çok eğlenceli! Deneyelim mi? 🔢',
  'Bugün nasılsın? 😊',
  'Yeni bir şey keşfedelim! ✨',
]

const BUBBLES_OLD = [
  'Bugün ne konuşacağız? 💬',
  'Yeni bir konu öğrenmek ister misin?',
  'Matematik soruların var mı? 📐',
  'Bir hikaye okuyalım mı? 📖',
  'Bugün nasılsın?',
  'Birlikte keşfedelim! 🔭',
]

export default function ChildHomeScreen() {
  const { currentChild, currentUser, setScreen, setAppMode } = useApp()
  const [show, setShow] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [bubbleIdx, setBubbleIdx] = useState(0)
  const [bubbleVisible, setBubbleVisible] = useState(true)
  const [expr, setExpr] = useState('happy')

  const age = currentChild?.age || 10
  const name = currentChild?.name || ''
  const streak = currentChild?.streak_days || 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'
  const isYoung = age <= 8
  const BUBBLES = isYoung ? BUBBLES_YOUNG : BUBBLES_OLD
  const EXPRS = ['happy', 'excited', 'curious', 'talking', 'happy']

  useEffect(() => {
    setTimeout(() => setShow(true), 80)
    const interval = setInterval(() => {
      setBubbleVisible(false)
      setTimeout(() => {
        setBubbleIdx(i => (i + 1) % BUBBLES.length)
        setExpr(EXPRS[Math.floor(Math.random() * EXPRS.length)])
        setBubbleVisible(true)
      }, 400)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  async function checkPin(p) {
    const parentId = currentChild?.parent_id || currentUser?.id
    if (!parentId) { setPinError('Hata!'); setPin(''); return }
    const { data } = await sb.from('parents').select('pin').eq('id', parentId).single()
    if (data && String(data.pin) === String(p)) {
      setShowPin(false); setPin(''); setPinError('')
      setAppMode('parent')
      setScreen('parentDashboard')
    } else {
      setPinError('PIN hatalı!'); setPin('')
    }
  }

  const BG = isYoung
    ? 'linear-gradient(160deg,#FFF9F0 0%,#FEF3C7 50%,#ECFDF5 100%)'
    : 'linear-gradient(160deg,#EFF6FF 0%,#F5F3FF 50%,#FFF9F0 100%)'

  return (
    <>
      {/* ── PIN MODAL ── */}
      {showPin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', backdropFilter:'blur(12px)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'white', borderRadius:28, padding:'32px 24px', width:300, textAlign:'center', boxShadow:'0 24px 60px rgba(0,0,0,.15)' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🔒</div>
            <div style={{ color:'#111827', fontSize:18, fontWeight:900, marginBottom:4 }}>Veli PIN Kodu</div>
            <div style={{ color:'#9CA3AF', fontSize:12, marginBottom:20 }}>Veli paneline geçmek için PIN gir</div>
            <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:20 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width:14, height:14, borderRadius:'50%', background:pin.length>i?'#F59E0B':'transparent', border:'2.5px solid #F59E0B', transition:'background .15s' }}/>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, maxWidth:220, margin:'0 auto 12px' }}>
              {[1,2,3,4,5,6,7,8,9,null,0,'⌫'].map((d,i) => (
                <button key={i} onClick={async () => {
                  if (d==='⌫') { setPin(p=>p.slice(0,-1)); setPinError('') }
                  else if (d!==null && pin.length<4) { const np=pin+String(d); setPin(np); if(np.length===4) await checkPin(np) }
                }} style={{ aspectRatio:'1', borderRadius:'50%', border:'none', background:d===null?'transparent':'#F9FAFB', color:'#111827', fontSize:20, fontWeight:700, cursor:d===null?'default':'pointer', fontFamily:'Nunito,sans-serif', outline:'none', WebkitTapHighlightColor:'transparent' }}>
                  {d}
                </button>
              ))}
            </div>
            {pinError && <div style={{ color:'#EF4444', fontSize:12, marginBottom:8 }}>{pinError}</div>}
            <button onClick={() => { setShowPin(false); setPin(''); setPinError('') }}
              style={{ background:'none', border:'none', color:'#9CA3AF', fontSize:12, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>İptal</button>
          </div>
        </div>
      )}

      {/* ── ANA EKRAN ── */}
      <div style={{ minHeight:'100vh', background:BG, fontFamily:'Nunito,sans-serif', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,.6)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(255,255,255,.8)' }}>
          <div>
            <div style={{ color:'rgba(0,0,0,.3)', fontSize:11, fontWeight:700 }}>{greeting}!</div>
            <div style={{ color:'#111827', fontSize:20, fontWeight:900 }}>{name} 👋</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {streak > 0 && (
              <div style={{ background:'white', border:'1.5px solid #FDE68A', borderRadius:12, padding:'5px 11px', display:'flex', alignItems:'center', gap:4, boxShadow:'0 2px 8px rgba(245,158,11,.2)' }}>
                <span style={{ fontSize:14 }}>🔥</span>
                <span style={{ color:'#D97706', fontSize:13, fontWeight:900 }}>{streak}</span>
              </div>
            )}
            <button onClick={() => setShowPin(true)}
              style={{ width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,.06)', border:'none', fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', outline:'none', WebkitTapHighlightColor:'transparent' }}>
              🔒
            </button>
          </div>
        </div>

        {/* Papağan + Balon */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 24px 16px', opacity:show?1:0, transform:show?'translateY(0)':'translateY(20px)', transition:'all 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <BibiFace expr={expr} size={isYoung ? 120 : 100}/>

          {/* Konuşma balonu */}
          <div style={{ position:'relative', marginTop:10, width:'100%', maxWidth:280 }}>
            <div style={{ position:'absolute', top:-7, left:'50%', transform:'translateX(-50%)', width:0, height:0, borderLeft:'7px solid transparent', borderRight:'7px solid transparent', borderBottom:'7px solid white' }}/>
            <div style={{
              background:'white',
              borderRadius:'4px 18px 18px 18px',
              padding:'12px 16px',
              textAlign:'center',
              boxShadow:'0 4px 20px rgba(0,0,0,.08)',
              border:'1.5px solid rgba(245,158,11,.25)',
              opacity:bubbleVisible?1:0,
              transform:bubbleVisible?'scale(1) translateY(0)':'scale(0.96) translateY(4px)',
              transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <div style={{ color:'#1a1206', fontSize:isYoung?14:13, fontWeight:700, lineHeight:1.5 }}>
                {BUBBLES[bubbleIdx]}
              </div>
            </div>
          </div>
        </div>

        {/* Ana Buton */}
        <div style={{ padding:'0 20px 14px', opacity:show?1:0, transition:'opacity 0.5s ease 0.1s' }}>
          <button onClick={() => setScreen('chat')}
            style={{ width:'100%', padding:'18px', borderRadius:20, border:'none', background:'linear-gradient(135deg,#F59E0B 0%,#F97316 100%)', color:'white', fontWeight:900, fontSize:17, cursor:'pointer', fontFamily:'Nunito,sans-serif', boxShadow:'0 6px 20px rgba(245,158,11,.4)', outline:'none', WebkitTapHighlightColor:'transparent' }}>
            {isYoung ? '💬 Dai ile Konuş!' : '💬 Dai ile Konuş'}
          </button>
        </div>

        {/* Hızlı Erişim */}
        <div style={{ padding:'0 20px 14px', opacity:show?1:0, transition:'opacity 0.5s ease 0.2s' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[
              { icon:'📖', label:'Hikayeler', screen:'story', bg:'white', border:'#DDD6FE', shadow:'rgba(124,58,237,.12)', text:'#7C3AED', dot:'#7C3AED' },
              { icon:'🧩', label:'Oyunlar', screen:'projectSelect', bg:'white', border:'#BBF7D0', shadow:'rgba(34,197,94,.12)', text:'#16A34A', dot:'#22C55E' },
              { icon:'⭐', label:'Başarılar', screen:'story', bg:'white', border:'#FDE68A', shadow:'rgba(245,158,11,.12)', text:'#D97706', dot:'#F59E0B' },
            ].map(item => (
              <button key={item.label} onClick={() => setScreen(item.screen)}
                style={{ background:item.bg, border:`1.5px solid ${item.border}`, borderRadius:16, padding:'14px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer', fontFamily:'Nunito,sans-serif', outline:'none', WebkitTapHighlightColor:'transparent', boxShadow:`0 4px 14px ${item.shadow}` }}>
                <span style={{ fontSize:26 }}>{item.icon}</span>
                <span style={{ color:item.text, fontSize:10, fontWeight:800 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Günlük hedef */}
        <div style={{ padding:'0 20px', opacity:show?1:0, transition:'opacity 0.5s ease 0.3s' }}>
          <div style={{ background:'white', border:'1.5px solid #FDE68A', borderRadius:18, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 4px 16px rgba(245,158,11,.1)' }}>
            <div style={{ width:42, height:42, borderRadius:14, background:'linear-gradient(135deg,#FEF3C7,#FDE68A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🎯</div>
            <div style={{ flex:1 }}>
              <div style={{ color:'#111827', fontSize:12, fontWeight:800, marginBottom:6 }}>Bugünün Hedefi</div>
              <div style={{ height:6, background:'#FEF3C7', borderRadius:3 }}>
                <div style={{ width:'40%', height:'100%', borderRadius:3, background:'linear-gradient(90deg,#F59E0B,#F97316)', transition:'width .5s ease' }}/>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:'#D97706', fontSize:14, fontWeight:900 }}>2/5</div>
              <div style={{ color:'#9CA3AF', fontSize:9, fontWeight:700 }}>görev</div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
