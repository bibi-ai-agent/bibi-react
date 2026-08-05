import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'

export default function ParentDashboard() {
  const { currentUser, setScreen, setCurrentChild, setAppMode } = useApp()
  const [children, setChildren] = useState([])
  const [parent, setParent] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [weeklyStats, setWeeklyStats] = useState({ messages: 0, activeDays: 0 })
  const [loading, setLoading] = useState(true)
  const [bubbleIdx, setBubbleIdx] = useState(0)
  const [bubbleVisible, setBubbleVisible] = useState(true)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setBubbleVisible(false)
      setTimeout(() => {
        setBubbleIdx(i => i + 1)
        setBubbleVisible(true)
      }, 400)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    if (!currentUser?.id) return
    setLoading(true)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [parentRes, childrenRes, alertsRes, sessionsRes] = await Promise.all([
      sb.from('parents').select('*').eq('id', currentUser.id).single(),
      sb.from('children').select('*').eq('parent_id', currentUser.id),
      sb.from('emotion_alerts').select('*').eq('resolved', false).limit(3),
      sb.from('sessions').select('message_count,created_at').gte('created_at', weekAgo),
    ])
    setParent(parentRes.data)
    setChildren(childrenRes.data || [])
    setAlerts(alertsRes.data || [])
    const sessions = sessionsRes.data || []
    const totalMsgs = sessions.reduce((s, r) => s + (r.message_count || 0), 0)
    const days = new Set(sessions.map(r => r.created_at?.split('T')[0])).size
    setWeeklyStats({ messages: totalMsgs, activeDays: days })
    setLoading(false)
  }

  function enterChildMode(child) {
    setCurrentChild(child)
    setAppMode('child')
    setScreen('childHome')
  }

  const today = new Date().toISOString().split('T')[0]
  const firstName = parent?.full_name?.split(' ')[0] || 'Hoş Geldin'

  const CHILD_COLORS = [
    { bg:'#FFF5E6', border:'#FED7AA', accent:'#F59E0B', text:'#92400E' },
    { bg:'#F0FDF4', border:'#BBF7D0', accent:'#22C55E', text:'#14532D' },
    { bg:'#EFF6FF', border:'#BFDBFE', accent:'#3B82F6', text:'#1E3A5F' },
    { bg:'#FDF4FF', border:'#E9D5FF', accent:'#A855F7', text:'#581C87' },
  ]

  const getBubbles = (kids) => {
    if (!kids || kids.length === 0) return ['Çocuk eklemek için aşağıya dokun 👇']
    const msgs = []
    kids.forEach(k => {
      const today = new Date().toISOString().split('T')[0]
      const isActive = k.last_active_date === today
      if (!isActive) msgs.push(k.name + ' bugün henüz giriş yapmadı 💭')
      else msgs.push(k.name + ' bugün aktif! Dai ile konuştu 🎉')
      msgs.push(k.name + ' ile bugün oynadın mı? 🎮')
      msgs.push(k.name + "'e nasılsın diye sordun mu? 💛")
      if ((k.streak_days || 0) > 2) msgs.push(k.name + ' ' + k.streak_days + ' gündür aktif, harika! 🔥')
    })
    return msgs
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#FFE4EC 0%,#EDE9FE 30%,#FEF3C7 65%,#DBEAFE 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:8 }}>🦜</div>
        <div style={{ color:'#9CA3AF', fontSize:13, fontWeight:600 }}>Yükleniyor...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#FFE4EC 0%,#EDE9FE 30%,#FEF3C7 65%,#DBEAFE 100%)', fontFamily:'Nunito,sans-serif', paddingBottom:40 }}>

      {/* ── HEADER ── */}
      <div style={{ background:'rgba(255,255,255,.85)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(243,244,246,.8)', padding:'20px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ color:'#9CA3AF', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:4 }}>Veli Paneli</div>
            <div style={{ color:'#111827', fontSize:22, fontWeight:900 }}>Merhaba, {firstName} 👋</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#F59E0B,#EF4444)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🦜</div>
            <button onClick={() => sb.auth.signOut()}
              style={{ background:'#F3F4F6', border:'none', borderRadius:10, padding:'8px 14px', color:'#6B7280', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
              Çıkış
            </button>
          </div>
        </div>

        {/* Haftalık özet kartları */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[
            { value:children.length, label:'Çocuk', icon:'👨‍👩‍👧', bg:'#FFF5E6', color:'#F59E0B' },
            { value:weeklyStats.activeDays, label:'Aktif Gün', icon:'📅', bg:'#F0FDF4', color:'#22C55E' },
            { value:weeklyStats.messages, label:'Mesaj', icon:'💬', bg:'#EFF6FF', color:'#3B82F6' },
          ].map(s => (
            <div key={s.label} style={{ background:s.bg, borderRadius:14, padding:'12px 10px', textAlign:'center' }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
              <div style={{ color:s.color, fontSize:20, fontWeight:900, lineHeight:1 }}>{s.value}</div>
              <div style={{ color:'#9CA3AF', fontSize:10, fontWeight:700, marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ANİMASYONLU BALON ── */}
      {!loading && (
        <div style={{ padding:'12px 20px', background:'rgba(255,255,255,.7)', backdropFilter:'blur(8px)', borderBottom:'1px solid rgba(243,244,246,.6)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#F59E0B,#F97316)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🦜</div>
            <div style={{
              background:'#FFF9F0',
              border:'1.5px solid #FDE68A',
              borderRadius:'4px 16px 16px 16px',
              padding:'10px 14px',
              flex:1,
              opacity:bubbleVisible?1:0,
              transform:bubbleVisible?'translateY(0)':'translateY(6px)',
              transition:'all 0.35s ease',
            }}>
              <div style={{ color:'#92400E', fontSize:13, fontWeight:700, lineHeight:1.5 }}>
                {getBubbles(children)[bubbleIdx % Math.max(getBubbles(children).length, 1)]}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── ALARMLAR ── */}
        {alerts.length > 0 && (
          <div style={{ background:'#FEF2F2', border:'1.5px solid #FECACA', borderRadius:16, padding:'14px 16px' }}>
            <div style={{ color:'#DC2626', fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 }}>⚠️ Dikkat</div>
            {alerts.map(a => (
              <div key={a.id} style={{ color:'#7F1D1D', fontSize:12, lineHeight:1.7 }}>• {a.message}</div>
            ))}
          </div>
        )}

        {/* ── ÇOCUKLAR ── */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ color:'#374151', fontSize:15, fontWeight:900 }}>Çocuklarım</div>
            <button onClick={() => setScreen('children')}
              style={{ background:'none', border:'none', color:'#F59E0B', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
              Tümünü Yönet →
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {children.length === 0 ? (
              <button onClick={() => setScreen('children')}
                style={{ background:'white', border:'2px dashed #E5E7EB', borderRadius:20, padding:'28px', textAlign:'center', cursor:'pointer', width:'100%', fontFamily:'Nunito,sans-serif', outline:'none' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>👶</div>
                <div style={{ color:'#9CA3AF', fontSize:13, fontWeight:700 }}>Çocuk eklemek için dokun</div>
              </button>
            ) : children.map((child, idx) => {
              const col = CHILD_COLORS[idx % CHILD_COLORS.length]
              const streak = child.streak_days || 0
              const isActive = child.last_active_date === today
              const streakPct = Math.min((streak / 30) * 100, 100)
              return (
                <button key={child.id} onClick={() => enterChildMode(child)}
                  style={{ background:'white', border:`2px solid ${col.border}`, borderRadius:20, padding:'16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', textAlign:'left', width:'100%', fontFamily:'Nunito,sans-serif', outline:'none', WebkitTapHighlightColor:'transparent', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>

                  {/* Avatar */}
                  <div style={{ width:54, height:54, borderRadius:'50%', background:col.bg, border:`2.5px solid ${col.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0, position:'relative' }}>
                    {child.gender === 'kız' ? '👧' : '👦'}
                    {isActive && (
                      <div style={{ position:'absolute', bottom:1, right:1, width:12, height:12, borderRadius:'50%', background:'#22C55E', border:'2px solid white' }}/>
                    )}
                  </div>

                  {/* Bilgi */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
                      <div style={{ color:'#111827', fontSize:16, fontWeight:900 }}>{child.name}</div>
                      {isActive && (
                        <div style={{ background:'#DCFCE7', borderRadius:6, padding:'1px 8px', color:'#16A34A', fontSize:9, fontWeight:700 }}>AKTİF</div>
                      )}
                    </div>
                    <div style={{ color:'#9CA3AF', fontSize:11, marginBottom:8 }}>{child.age} yaş</div>
                    {/* Progress */}
                    <div style={{ height:5, background:'#F3F4F6', borderRadius:3 }}>
                      <div style={{ width:streakPct+'%', height:'100%', borderRadius:3, background:col.accent, transition:'width .4s ease' }}/>
                    </div>
                  </div>

                  {/* Sağ */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                    {streak > 0 && (
                      <div style={{ background:col.bg, border:`1px solid ${col.border}`, borderRadius:10, padding:'4px 9px', color:col.accent, fontSize:11, fontWeight:800 }}>
                        🔥{streak}
                      </div>
                    )}
                    <div style={{ color:'#D1D5DB', fontSize:20 }}>›</div>
                  </div>
                </button>
              )
            })}

            <button onClick={() => setScreen('children')}
              style={{ border:'2px dashed #E5E7EB', borderRadius:20, padding:'14px', textAlign:'center', cursor:'pointer', background:'transparent', color:'#9CA3AF', fontFamily:'Nunito,sans-serif', fontSize:13, fontWeight:700, outline:'none', WebkitTapHighlightColor:'transparent' }}>
              + Çocuk Ekle
            </button>
          </div>
        </div>

        {/* ── HIZLI ERİŞİM ── */}
        <div>
          <div style={{ color:'#374151', fontSize:15, fontWeight:900, marginBottom:12 }}>Hızlı Erişim</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { icon:'📊', label:'Raporlar', sub:'Haftalık analiz', screen:'report', bg:'#FFF5E6', border:'#FED7AA', color:'#F59E0B' },
              { icon:'⭐', label:'Abonelik', sub:'Plan & özellikler', screen:'subscription', bg:'#FDF4FF', border:'#E9D5FF', color:'#A855F7' },
            ].map(item => (
              <button key={item.label} onClick={() => setScreen(item.screen)}
                style={{ background:item.bg, border:`1.5px solid ${item.border}`, borderRadius:18, padding:'16px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontFamily:'Nunito,sans-serif', outline:'none', WebkitTapHighlightColor:'transparent' }}>
                <div style={{ width:40, height:40, borderRadius:12, background:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>{item.icon}</div>
                <div>
                  <div style={{ color:'#111827', fontSize:13, fontWeight:800 }}>{item.label}</div>
                  <div style={{ color:'#9CA3AF', fontSize:10, marginTop:2 }}>{item.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
