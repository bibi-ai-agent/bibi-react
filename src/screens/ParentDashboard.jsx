import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'

export default function ParentDashboard() {
  const { currentUser, setScreen, setCurrentChild } = useApp()
  const [children, setChildren] = useState([])
  const [parent, setParent] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [parentRes, childrenRes, alertsRes] = await Promise.all([
      sb.from('parents').select('*').eq('id', currentUser.id).single(),
      sb.from('children').select('*, child_memory(*)').eq('parent_id', currentUser.id),
      sb.from('emotion_alerts').select('*').eq('resolved', false).limit(5),
    ])
    setParent(parentRes.data)
    setChildren(childrenRes.data || [])
    setAlerts(alertsRes.data || [])
    setLoading(false)
  }

  async function selectChild(child) {
    setCurrentChild(child)
    setScreen('childHome')
  }

  const DARK = '#0f0a05'
  const CARD = '#1a1206'
  const ORANGE = '#F59E0B'
  const ORANGE_DIM = 'rgba(245,158,11,.15)'

  if (loading) return (
    <div style={{ minHeight:'100vh', background:DARK, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:ORANGE, fontSize:32 }}>🦜</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:DARK, fontFamily:'Nunito,sans-serif', paddingBottom:20 }}>

      {/* Header */}
      <div style={{ background:'rgba(245,158,11,.08)', borderBottom:'1px solid rgba(245,158,11,.15)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' }}>Veli Paneli</div>
          <div style={{ color:'white', fontSize:18, fontWeight:900 }}>
            Merhaba, {parent?.full_name?.split(' ')[0] || 'Hoş Geldin'} 👋
          </div>
        </div>
        <button onClick={() => { sb.auth.signOut(); setScreen('auth') }}
          style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'6px 12px', color:'rgba(255,255,255,.4)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
          Çıkış
        </button>
      </div>

      <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Alarmlar */}
        {alerts.length > 0 && (
          <div style={{ background:'rgba(220,38,38,.12)', border:'1.5px solid rgba(220,38,38,.3)', borderRadius:14, padding:12 }}>
            <div style={{ color:'#fca5a5', fontSize:10, fontWeight:700, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>⚠️ Dikkat Gerektiriyor</div>
            {alerts.map(a => (
              <div key={a.id} style={{ color:'rgba(255,255,255,.75)', fontSize:12, marginBottom:4, lineHeight:1.5 }}>• {a.message}</div>
            ))}
          </div>
        )}

        {/* Çocuklar */}
        <div>
          <div style={{ color:'rgba(255,255,255,.35)', fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>Çocuklarım</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {children.map(child => {
              const memory = child.child_memory?.[0]
              const streak = child.streak_days || 0
              const lastActive = child.last_active_date
              const today = new Date().toISOString().split('T')[0]
              const isActiveToday = lastActive === today
              return (
                <button key={child.id} onClick={() => selectChild(child)}
                  style={{ background:CARD, border:'1.5px solid rgba(245,158,11,.2)', borderRadius:16, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer', textAlign:'left', width:'100%', fontFamily:'Nunito,sans-serif' }}>
                  {/* Avatar */}
                  <div style={{ width:48, height:48, borderRadius:'50%', background:ORANGE_DIM, border:'2px solid rgba(245,158,11,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                    {child.gender === 'kız' ? '👧' : '👦'}
                  </div>
                  {/* Bilgi */}
                  <div style={{ flex:1 }}>
                    <div style={{ color:'white', fontSize:15, fontWeight:900 }}>{child.name}</div>
                    <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, marginTop:2 }}>{child.age} yaş • {child.grade || '?'}. sınıf</div>
                    {/* Aktivite çubuğu */}
                    <div style={{ height:3, background:'rgba(255,255,255,.08)', borderRadius:2, marginTop:6 }}>
                      <div style={{ width:Math.min((streak/30)*100, 100)+'%', height:'100%', borderRadius:2, background:ORANGE }}/>
                    </div>
                  </div>
                  {/* Sağ */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
                    {streak > 0 && (
                      <div style={{ background:'rgba(245,158,11,.2)', border:'1px solid rgba(245,158,11,.3)', borderRadius:8, padding:'3px 8px', color:ORANGE, fontSize:10, fontWeight:800 }}>
                        🔥{streak}
                      </div>
                    )}
                    <div style={{ width:8, height:8, borderRadius:'50%', background: isActiveToday ? '#4ade80' : 'rgba(255,255,255,.2)' }}/>
                    <div style={{ color:'rgba(255,255,255,.3)', fontSize:10 }}>›</div>
                  </div>
                </button>
              )
            })}

            {/* Çocuk ekle */}
            <button onClick={() => setScreen('addChild')}
              style={{ border:'1.5px dashed rgba(245,158,11,.25)', borderRadius:16, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', background:'transparent', color:'rgba(245,158,11,.5)', fontFamily:'Nunito,sans-serif', fontSize:13, fontWeight:700 }}>
              + Çocuk Ekle
            </button>
          </div>
        </div>

        {/* Hızlı Erişim */}
        <div>
          <div style={{ color:'rgba(255,255,255,.35)', fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>Hızlı Erişim</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { icon:'📊', label:'Raporlar', screen:'report', color:'rgba(245,158,11,.15)', border:'rgba(245,158,11,.25)' },
              { icon:'⚙️', label:'Ayarlar', screen:'settings', color:'rgba(255,255,255,.05)', border:'rgba(255,255,255,.1)' },
            ].map(item => (
              <button key={item.label} onClick={() => setScreen(item.screen)}
                style={{ background:item.color, border:'1px solid '+item.border, borderRadius:14, padding:'14px 12px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
                <span style={{ fontSize:22 }}>{item.icon}</span>
                <span style={{ color:'rgba(255,255,255,.7)', fontSize:13, fontWeight:700 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
