import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import { getPersonalityProfile, DIMENSION_NAMES, DIMENSION_ICONS, calculatePersonalityScores } from '../lib/personality'
import { getWeeklyEmotions, EMOTIONS } from '../lib/emotion'

const DARK    = '#1A2E2A'
const GREEN   = '#0D9B7E'
const WHITE   = 'white'

function ps(n) { return n >= 70 ? '#16a34a' : n >= 50 ? '#d97706' : '#dc2626' }

function Card({ children, style }) {
  return <div style={{ background:'rgba(255,255,255,.06)', borderRadius:16, padding:'16px', marginBottom:12, border:'1px solid rgba(255,255,255,.08)', ...style }}>{children}</div>
}

function SectionTitle({ icon, title, color }) {
  return <div style={{ color: color || 'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>{icon} {title}</div>
}

export default function ReportScreen() {
  const { currentChild, setScreen, currentUser, subscription } = useApp()
  const plan = subscription?.plan || 'free'
  const isPro = plan === 'pro'

  // PIN state
  const [pin, setPin] = useState('')
  const [pinOk, setPinOk] = useState(false)
  const [pinError, setPinError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotStep, setForgotStep] = useState(1)
  const [forgotPassword, setForgotPassword] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [parentProfile, setParentProfile] = useState(null)

  // Data state
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [weeklyLetter, setWeeklyLetter] = useState(null)
  const [emotions, setEmotions] = useState([])
  const [sessions, setSessions] = useState([])
  const [memory, setMemory] = useState(null)
  const [personality, setPersonality] = useState(null)
  const [weekStats, setWeekStats] = useState(null)
  const [activeSection, setActiveSection] = useState('ozet')

  async function checkPin(p) {
    const { data: parent } = await sb.from('parents').select('*').eq('id', currentUser.id).single()
    if (String(parent?.pin) === String(p)) {
      setParentProfile(parent)
      setPinOk(true)
      loadAllData()
    } else {
      setPinError('PIN hatalı!')
      setPin('')
    }
  }

  async function loadAllData() {
    if (!currentChild) return
    setLoading(true)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [alertsRes, letterRes, emotionsRes, sessionsRes, memoryRes, personalityRes, msgsRes] = await Promise.all([
      sb.from('emotion_alerts').select('*').eq('child_id', currentChild.id).eq('resolved', false).order('triggered_at', { ascending: false }),
      sb.from('weekly_letters').select('*').eq('child_id', currentChild.id).order('week', { ascending: false }).limit(1),
      getWeeklyEmotions(sb, currentChild.id),
      sb.from('sessions').select('id,title,topic_tags,mood_score,duration_seconds,started_at,message_count').eq('child_id', currentChild.id).order('started_at', { ascending: false }).limit(10),
      sb.from('child_memory').select('*').eq('child_id', currentChild.id).maybeSingle(),
      sb.from('personality_answers').select('dimension,score').eq('child_id', currentChild.id),
      sb.from('messages').select('topic,role,created_at').eq('child_id', currentChild.id).gte('created_at', oneWeekAgo)
    ])

    setAlerts(alertsRes.data || [])
    setWeeklyLetter(letterRes.data?.[0] || null)
    setEmotions(emotionsRes || [])
    setSessions(sessionsRes.data || [])
    setMemory(memoryRes.data || null)

    if (personalityRes.data?.length) {
      const scores = calculatePersonalityScores(personalityRes.data)
      setPersonality(scores)
    }

    // Haftalık istatistikler
    const msgs = msgsRes.data || []
    const topicCounts = {}
    msgs.filter(function(m) { return m.role === 'user' }).forEach(function(m) {
      if (m.topic && m.topic !== 'Genel') topicCounts[m.topic] = (topicCounts[m.topic] || 0) + 1
    })
    const days = new Set(msgs.map(function(m) { return m.created_at.split('T')[0] }))
    setWeekStats({ messageCount: msgs.length, activeDays: days.size, topics: topicCounts })
    setLoading(false)
  }

  async function resolveAlert(id) {
    await sb.from('emotion_alerts').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', id)
    setAlerts(function(prev) { return prev.filter(function(a) { return a.id !== id }) })
  }

  // PIN ekranı
  if (!pinOk) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,'+DARK+',#0f1f1a)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
        {!showForgot ? (
          <div style={{ width:'100%', maxWidth:340, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
            <div style={{ color:WHITE, fontSize:20, fontWeight:900, marginBottom:8 }}>Veli Raporu</div>
            <div style={{ color:'rgba(255,255,255,.45)', fontSize:13, marginBottom:24 }}>PIN kodunuzu girin</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:16 }}>
              {[0,1,2,3].map(function(i) { return <div key={i} style={{ width:14, height:14, borderRadius:'50%', background:pin.length>i?WHITE:'transparent', border:'2px solid rgba(255,255,255,.4)' }}/> })}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, maxWidth:240, margin:'0 auto 16px' }}>
              {[1,2,3,4,5,6,7,8,9,null,0,'⌫'].map(function(d,i) {
                return (
                  <button key={i} onClick={async function() {
                    if (d==='⌫') { setPin(function(p){return p.slice(0,-1)}); setPinError('') }
                    else if (d!==null && pin.length<4) {
                      const np = pin+String(d); setPin(np)
                      if (np.length===4) await checkPin(np)
                    }
                  }} style={{ aspectRatio:'1', borderRadius:'50%', border:'none', background:d===null?'transparent':'rgba(255,255,255,.1)', color:WHITE, fontSize:20, fontWeight:700, cursor:d===null?'default':'pointer', fontFamily:'Nunito,sans-serif' }}>{d}</button>
                )
              })}
            </div>
            {pinError && <div style={{ color:'#fca88a', fontSize:13, marginBottom:8 }}>{pinError}</div>}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
              <button onClick={function(){setShowForgot(true)}} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', fontSize:12, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>PIN'imi Unuttum?</button>
              <button onClick={function(){setScreen('children')}} style={{ background:'none', border:'none', color:'rgba(255,255,255,.35)', fontSize:13, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>← Geri</button>
            </div>
          </div>
        ) : (
          <div style={{ width:'100%', maxWidth:340 }}>
            <div style={{ color:WHITE, fontSize:18, fontWeight:900, marginBottom:16, textAlign:'center' }}>🔑 PIN Sıfırla</div>
            {forgotSuccess ? (
              <div style={{ color:'#4ade80', textAlign:'center', padding:20 }}>✅ PIN güncellendi!</div>
            ) : forgotStep===1 ? (
              <>
                <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginBottom:12 }}>Hesap şifrenizi girin:</div>
                <input type="password" value={forgotPassword} onChange={function(e){setForgotPassword(e.target.value)}} placeholder="Şifre" style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:WHITE, fontSize:14, fontFamily:'Nunito,sans-serif', boxSizing:'border-box', marginBottom:8 }}/>
                {forgotError && <div style={{ color:'#fca88a', fontSize:12, marginBottom:8 }}>{forgotError}</div>}
                <button onClick={async function(){
                  const { data: { user }, error } = await sb.auth.signInWithPassword({ email: parentProfile?.email || currentUser?.email, password: forgotPassword })
                  if (error) { setForgotError('Şifre hatalı!') } else { setForgotStep(2) }
                }} style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:GREEN, color:WHITE, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Devam</button>
                <button onClick={function(){setShowForgot(false);setForgotStep(1);setForgotPassword('');setForgotError('')}} style={{ width:'100%', padding:10, borderRadius:12, border:'none', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.4)', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif', marginTop:8 }}>İptal</button>
              </>
            ) : (
              <>
                <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginBottom:12 }}>Yeni PIN (4 haneli):</div>
                <input type="password" maxLength={4} value={newPin} onChange={function(e){setNewPin(e.target.value.replace(/\D/g,''))}} placeholder="Yeni PIN" style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:WHITE, fontSize:14, fontFamily:'Nunito,sans-serif', boxSizing:'border-box', marginBottom:8 }}/>
                <input type="password" maxLength={4} value={newPinConfirm} onChange={function(e){setNewPinConfirm(e.target.value.replace(/\D/g,''))}} placeholder="PIN Tekrar" style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:WHITE, fontSize:14, fontFamily:'Nunito,sans-serif', boxSizing:'border-box', marginBottom:8 }}/>
                {forgotError && <div style={{ color:'#fca88a', fontSize:12, marginBottom:8 }}>{forgotError}</div>}
                <button onClick={async function(){
                  if (newPin.length!==4) { setForgotError('PIN 4 haneli olmalı'); return }
                  if (newPin!==newPinConfirm) { setForgotError('PIN\'ler eşleşmiyor'); return }
                  await sb.from('parents').update({ pin: newPin }).eq('id', currentUser.id)
                  setForgotSuccess(true)
                  setTimeout(function(){setShowForgot(false);setForgotStep(1);setForgotPassword('');setNewPin('');setNewPinConfirm('');setForgotError('');setForgotSuccess(false)}, 2000)
                }} style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:GREEN, color:WHITE, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>PIN'i Güncelle</button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ANA RAPOR EKRANI
  const theme = { fontFamily:'Nunito,sans-serif' }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,'+DARK+',#0f1f1a)', color:WHITE, ...theme }}>
      {/* Header */}
      <div style={{ background:'rgba(255,255,255,.04)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' }}>Veli Raporu</div>
          <div style={{ color:WHITE, fontSize:18, fontWeight:900 }}>{currentChild?.name}</div>
        </div>
        <button onClick={function(){setScreen('children')}} style={{ background:'rgba(255,255,255,.08)', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:20, padding:'8px 14px', color:WHITE, fontSize:12, fontWeight:700, cursor:'pointer' }}>← Geri</button>
      </div>

      {/* Tab Menü */}
      <div style={{ display:'flex', gap:4, padding:'12px 16px', overflowX:'auto', background:'rgba(0,0,0,.1)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        {[
          { id:'ozet', label:'📊 Özet' },
          { id:'duygu', label:'😊 Duygu' },
          { id:'ogrenme', label:'📚 Öğrenme' },
          { id:'karakter', label:'🧠 Karakter' },
          { id:'kariyer', label:'🎯 Kariyer' },
          { id:'mektup', label:'✉️ Mektup' },
        ].map(function(tab) {
          return (
            <button key={tab.id} onClick={function(){setActiveSection(tab.id)}}
              style={{ flexShrink:0, padding:'7px 14px', borderRadius:20, border:'1.5px solid '+(activeSection===tab.id?GREEN:'rgba(255,255,255,.1)'), background:activeSection===tab.id?'rgba(13,155,126,.2)':'transparent', color:activeSection===tab.id?'#4ade80':'rgba(255,255,255,.5)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
              {tab.label}
            </button>
          )
        })}
      </div>

      <div style={{ padding:'16px', maxWidth:480, margin:'0 auto' }}>
        {loading && <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,.4)' }}>Yükleniyor...</div>}

        {!loading && (
          <>
            {/* ALARMLAR — Her sekmede görünür */}
            {alerts.length > 0 && (
              <div style={{ background:'rgba(220,38,38,.15)', border:'1.5px solid rgba(220,38,38,.3)', borderRadius:16, padding:14, marginBottom:12 }}>
                <div style={{ color:'#fca5a5', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 }}>⚠️ DİKKAT GEREKTİREN DURUMLAR</div>
                {alerts.map(function(a) {
                  return (
                    <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <div style={{ color:'rgba(255,255,255,.8)', fontSize:13, flex:1, lineHeight:1.5 }}>{a.message}</div>
                      <button onClick={function(){resolveAlert(a.id)}} style={{ background:'rgba(255,255,255,.1)', border:'none', borderRadius:8, padding:'4px 8px', color:'rgba(255,255,255,.4)', fontSize:11, cursor:'pointer', flexShrink:0, marginLeft:8 }}>✓</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ÖZET SEKMESİ */}
            {activeSection === 'ozet' && (
              <>
                {/* Genel durum */}
                <Card>
                  <SectionTitle icon="📊" title="BU HAFTA" />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[
                      { label:'Aktif Gün', value:(weekStats?.activeDays||0)+'/7', color:'#4ade80' },
                      { label:'Mesaj', value:weekStats?.messageCount||0, color:'#60a5fa' },
                      { label:'Sohbet', value:sessions.length, color:'#a78bfa' },
                      { label:'Genel Duygu', value:emotions.length>0?'😊':'—', color:'#fbbf24' },
                    ].map(function(s) {
                      return (
                        <div key={s.label} style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:'12px', textAlign:'center' }}>
                          <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
                          <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, marginTop:3 }}>{s.label}</div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* En çok konuşulan konular */}
                {weekStats?.topics && Object.keys(weekStats.topics).length > 0 && (
                  <Card>
                    <SectionTitle icon="💬" title="BU HAFTA KONULAR" />
                    {Object.entries(weekStats.topics).sort(function(a,b){return b[1]-a[1]}).slice(0,5).map(function(e) {
                      const max = Math.max(...Object.values(weekStats.topics))
                      return (
                        <div key={e[0]} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <div style={{ width:80, fontSize:12, color:'rgba(255,255,255,.6)' }}>{e[0]}</div>
                          <div style={{ flex:1, height:6, borderRadius:3, background:'rgba(255,255,255,.08)' }}>
                            <div style={{ width:Math.round(e[1]/max*100)+'%', height:'100%', borderRadius:3, background:GREEN }}/>
                          </div>
                          <div style={{ width:20, textAlign:'right', fontSize:12, color:'rgba(255,255,255,.4)' }}>{e[1]}</div>
                        </div>
                      )
                    })}
                  </Card>
                )}

                {/* Son sohbetler */}
                {sessions.length > 0 && (
                  <Card>
                    <SectionTitle icon="💬" title="SON SOHBETLER" />
                    {sessions.slice(0,5).map(function(s) {
                      return (
                        <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                          <div>
                            <div style={{ color:WHITE, fontSize:13, fontWeight:700 }}>{s.title||'Sohbet'}</div>
                            <div style={{ color:'rgba(255,255,255,.35)', fontSize:11, marginTop:2 }}>
                              {new Date(s.started_at).toLocaleDateString('tr-TR')}
                              {s.message_count ? ' • '+s.message_count+' mesaj' : ''}
                            </div>
                          </div>
                          <div style={{ fontSize:18 }}>{s.mood_score>=7?'😄':s.mood_score>=5?'🙂':'😔'}</div>
                        </div>
                      )
                    })}
                  </Card>
                )}
              </>
            )}

            {/* DUYGU SEKMESİ */}
            {activeSection === 'duygu' && (
              <>
                <Card>
                  <SectionTitle icon="😊" title="HAFTALIK DUYGU DAĞILIMI" />
                  {emotions.length === 0 ? (
                    <div style={{ color:'rgba(255,255,255,.35)', fontSize:13, textAlign:'center', padding:'20px 0' }}>Bu hafta duygu verisi yok</div>
                  ) : (
                    emotions.slice(0,7).map(function(day) {
                      const e = EMOTIONS[day.dominant] || { emoji:'😐', color:'#6b7280' }
                      return (
                        <div key={day.date} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                          <div style={{ width:40, color:'rgba(255,255,255,.4)', fontSize:11 }}>
                            {new Date(day.date).toLocaleDateString('tr-TR',{weekday:'short'})}
                          </div>
                          <div style={{ fontSize:20 }}>{e.emoji||'😐'}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,.08)' }}>
                              <div style={{ width:((day.count||1)/5*100)+'%', maxWidth:'100%', height:'100%', borderRadius:3, background:e.color||'#6b7280' }}/>
                            </div>
                          </div>
                          <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, width:20 }}>{day.count}</div>
                        </div>
                      )
                    })
                  )}
                </Card>

                {memory?.emotional_profile && Object.keys(memory.emotional_profile).length > 0 && (
                  <Card>
                    <SectionTitle icon="📈" title="GENEL DUYGU PROFİLİ" />
                    {Object.entries(memory.emotional_profile).sort(function(a,b){return b[1]-a[1]}).slice(0,5).map(function(e) {
                      const em = EMOTIONS[e[0]] || { emoji:'😐', color:'#6b7280' }
                      const total = Object.values(memory.emotional_profile).reduce(function(s,v){return s+v},0)
                      return (
                        <div key={e[0]} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <span style={{ fontSize:18 }}>{em.emoji||'😐'}</span>
                          <div style={{ width:60, fontSize:11, color:'rgba(255,255,255,.5)' }}>{e[0]}</div>
                          <div style={{ flex:1, height:6, borderRadius:3, background:'rgba(255,255,255,.08)' }}>
                            <div style={{ width:Math.round(e[1]/total*100)+'%', height:'100%', borderRadius:3, background:em.color||GREEN }}/>
                          </div>
                          <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', width:30 }}>{Math.round(e[1]/total*100)}%</div>
                        </div>
                      )
                    })}
                  </Card>
                )}
              </>
            )}

            {/* ÖĞRENME SEKMESİ */}
            {activeSection === 'ogrenme' && (
              <>
                {memory?.strong_topics?.length > 0 && (
                  <Card>
                    <SectionTitle icon="💪" title="GÜÇLÜ KONULAR" color="#4ade80" />
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {memory.strong_topics.map(function(t) {
                        return <span key={t} style={{ padding:'6px 12px', borderRadius:20, background:'rgba(74,222,128,.15)', border:'1px solid rgba(74,222,128,.3)', color:'#4ade80', fontSize:12, fontWeight:700 }}>{t}</span>
                      })}
                    </div>
                  </Card>
                )}

                {memory?.weak_topics?.length > 0 && (
                  <Card>
                    <SectionTitle icon="📌" title="GELİŞTİRİLEBİLİR KONULAR" color="#fbbf24" />
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {memory.weak_topics.map(function(t) {
                        return <span key={t} style={{ padding:'6px 12px', borderRadius:20, background:'rgba(251,191,36,.1)', border:'1px solid rgba(251,191,36,.3)', color:'#fbbf24', fontSize:12, fontWeight:700 }}>{t}</span>
                      })}
                    </div>
                  </Card>
                )}

                {/* Aktivite haritası */}
                {sessions.length > 0 && (
                  <Card>
                    <SectionTitle icon="📅" title="AKTİVİTE GEÇMİŞİ" />
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
                      {Array.from({length:28}).map(function(_,i) {
                        const date = new Date(Date.now() - (27-i) * 24 * 60 * 60 * 1000)
                        const dateStr = date.toISOString().split('T')[0]
                        const session = sessions.find(function(s) { return s.started_at && s.started_at.startsWith(dateStr) })
                        const intensity = session ? (session.message_count > 20 ? '#00ff88' : session.message_count > 10 ? '#f59e0b' : '#3b82f6') : 'rgba(255,255,255,.06)'
                        return <div key={i} title={dateStr} style={{ aspectRatio:'1', borderRadius:4, background:intensity }}/>
                      })}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, color:'rgba(255,255,255,.3)', fontSize:10 }}>
                      <span>28 gün önce</span><span>Bugün</span>
                    </div>
                    <div style={{ display:'flex', gap:12, marginTop:10, flexWrap:'wrap' }}>
                      {[
                        { color:'rgba(255,255,255,.06)', label:'Giriş yok' },
                        { color:'#3b82f6', label:'Az aktif' },
                        { color:'#f59e0b', label:'Aktif' },
                        { color:'#00ff88', label:'Çok aktif' },
                      ].map(function(item) {
                        return (
                          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <div style={{ width:12, height:12, borderRadius:3, background:item.color, border:'1px solid rgba(255,255,255,.1)' }}/>
                            <span style={{ color:'rgba(255,255,255,.4)', fontSize:10 }}>{item.label}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ color:'rgba(255,255,255,.3)', fontSize:10, marginTop:6 }}>Her kare bir günü temsil eder.</div>
                  </Card>
                )}

                {/* En aktif saat */}
                {memory?.interaction_patterns && Object.keys(memory.interaction_patterns).length > 0 && (
                  <Card>
                    <SectionTitle icon="⏰" title="EN AKTİF OLDUĞU ZAMAN" />
                    {Object.entries(memory.interaction_patterns).sort(function(a,b){return b[1]-a[1]}).map(function(e) {
                      const labels = { sabah:'☀️ Sabah', ogle:'🌤️ Öğleden Sonra', aksam:'🌆 Akşam', gece:'🌙 Gece' }
                      const total = Object.values(memory.interaction_patterns).reduce(function(s,v){return s+v},0)
                      return (
                        <div key={e[0]} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <div style={{ width:100, fontSize:12, color:'rgba(255,255,255,.6)' }}>{labels[e[0]]||e[0]}</div>
                          <div style={{ flex:1, height:6, borderRadius:3, background:'rgba(255,255,255,.08)' }}>
                            <div style={{ width:Math.round(e[1]/total*100)+'%', height:'100%', borderRadius:3, background:GREEN }}/>
                          </div>
                          <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', width:30 }}>{Math.round(e[1]/total*100)}%</div>
                        </div>
                      )
                    })}
                  </Card>
                )}
              </>
            )}

            {/* KARAKTER SEKMESİ */}
            {activeSection === 'karakter' && (
              <>
                {!isPro ? (
                  <Card>
                    <div style={{ textAlign:'center', padding:'20px 0' }}>
                      <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
                      <div style={{ color:WHITE, fontSize:15, fontWeight:700, marginBottom:8 }}>Pro Plan Gerekli</div>
                      <div style={{ color:'rgba(255,255,255,.45)', fontSize:13 }}>Karakter analizi için Pro plana geçin.</div>
                    </div>
                  </Card>
                ) : personality ? (
                  <>
                    <Card>
                      <SectionTitle icon="🧠" title="KİŞİLİK PROFİLİ (OCEAN)" />
                      {['openness','conscientiousness','extraversion','agreeableness','neuroticism'].map(function(dim) {
                        const score = Math.round((personality[dim]||0))
                        const names = { openness:'Merak & Açıklık', conscientiousness:'Sorumluluk', extraversion:'Sosyallik', agreeableness:'Uyumluluk', neuroticism:'Duygusal Hassasiyet' }
                        const icons = { openness:'🔭', conscientiousness:'📋', extraversion:'🗣️', agreeableness:'🤝', neuroticism:'💭' }
                        const comments = {
                          openness: score>70?'Yeni şeyler öğrenmek için çok istekli.':score>50?'Öğrenmeye açık.':'Rutini seviyor.',
                          conscientiousness: score>70?'Düzenli ve sorumlu.':score>50?'Orta düzeyde düzenli.':'Esnek ve spontane.',
                          extraversion: score>70?'Sosyal ve enerjik.':score>50?'Dengeli sosyal.':'Sessiz ve içe dönük.',
                          agreeableness: score>70?'Çok yardımsever.':score>50?'İşbirliğine açık.':'Bağımsız.',
                          neuroticism: score>70?'Duygusal açıdan hassas.':score>50?'Normal duygu dalgalanması.':'Duygusal açıdan dengeli.',
                        }
                        return (
                          <div key={dim} style={{ marginBottom:14 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:13, fontWeight:700 }}>{icons[dim]} {names[dim]}</span>
                              <span style={{ fontSize:13, fontWeight:900, color:ps(score) }}>{score}</span>
                            </div>
                            <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,.08)', marginBottom:4 }}>
                              <div style={{ width:score+'%', height:'100%', borderRadius:4, background:ps(score), transition:'width .5s' }}/>
                            </div>
                            <div style={{ color:'rgba(255,255,255,.4)', fontSize:11 }}>{comments[dim]}</div>
                          </div>
                        )
                      })}
                    </Card>
                    <Card>
                      <SectionTitle icon="📊" title="ENVANTER DURUMU" />
                      <div style={{ color:'rgba(255,255,255,.6)', fontSize:13 }}>
                        {currentChild?.personality_progress||0}/50 soru tamamlandı
                      </div>
                      <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,.08)', marginTop:8 }}>
                        <div style={{ width:Math.min((currentChild?.personality_progress||0)/50*100,100)+'%', height:'100%', borderRadius:3, background:GREEN }}/>
                      </div>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <div style={{ textAlign:'center', padding:'20px 0', color:'rgba(255,255,255,.4)', fontSize:13 }}>
                      Henüz yeterli kişilik verisi yok. Bibi ile daha fazla konuşuldukça analiz oluşacak.
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* KARİYER SEKMESİ */}
            {activeSection === 'kariyer' && (
              <>
                {!isPro ? (
                  <Card>
                    <div style={{ textAlign:'center', padding:'20px 0' }}>
                      <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
                      <div style={{ color:WHITE, fontSize:15, fontWeight:700, marginBottom:8 }}>Pro Plan Gerekli</div>
                      <div style={{ color:'rgba(255,255,255,.45)', fontSize:13 }}>Kariyer analizi için Pro plana geçin.</div>
                    </div>
                  </Card>
                ) : memory?.career_analysis && Object.keys(memory.career_analysis).length > 0 ? (
                  <>
                    {memory.career_analysis.career_trends && (
                      <Card>
                        <SectionTitle icon="🎯" title="KARİYER EĞİLİMLERİ" />
                        {memory.career_analysis.career_trends.map(function(t) {
                          return (
                            <div key={t.alan} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                              <div style={{ width:100, fontSize:13, fontWeight:700 }}>{t.alan}</div>
                              <div style={{ flex:1, height:8, borderRadius:4, background:'rgba(255,255,255,.08)' }}>
                                <div style={{ width:(t.yuzde||0)+'%', height:'100%', borderRadius:4, background:GREEN }}/>
                              </div>
                              <div style={{ fontSize:13, fontWeight:900, color:GREEN, width:35 }}>%{t.yuzde}</div>
                            </div>
                          )
                        })}
                      </Card>
                    )}

                    {memory.career_analysis.strong_skills && (
                      <Card>
                        <SectionTitle icon="💪" title="GÜÇLÜ BECERİLER" color="#4ade80" />
                        {memory.career_analysis.strong_skills.map(function(s) {
                          return <div key={s} style={{ padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,.05)', color:'rgba(255,255,255,.8)', fontSize:13 }}>✅ {s}</div>
                        })}
                      </Card>
                    )}

                    {memory.career_analysis.parent_tip && (
                      <Card style={{ background:'rgba(13,155,126,.1)', border:'1px solid rgba(13,155,126,.3)' }}>
                        <SectionTitle icon="💡" title="EBEVEYNLERİN İÇİN ÖNERİ" color="#4ade80" />
                        <div style={{ color:'rgba(255,255,255,.8)', fontSize:13, lineHeight:1.6 }}>{memory.career_analysis.parent_tip}</div>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <div style={{ textAlign:'center', padding:'20px 0', color:'rgba(255,255,255,.4)', fontSize:13 }}>
                      Kariyer analizi henüz hazır değil. İlk haftalık rapor Pazartesi gelecek.
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* MEKTUP SEKMESİ */}
            {activeSection === 'mektup' && (
              <>
                {weeklyLetter ? (
                  <Card>
                    <SectionTitle icon="✉️" title={'HAFTALIK MEKTUP — ' + weeklyLetter.week} />
                    <div style={{ color:'rgba(255,255,255,.8)', fontSize:13, lineHeight:1.8, whiteSpace:'pre-wrap' }}>{weeklyLetter.letter}</div>
                  </Card>
                ) : (
                  <Card>
                    <div style={{ textAlign:'center', padding:'20px 0' }}>
                      <div style={{ fontSize:40, marginBottom:12 }}>✉️</div>
                      <div style={{ color:WHITE, fontSize:15, fontWeight:700, marginBottom:8 }}>Mektup Henüz Yok</div>
                      <div style={{ color:'rgba(255,255,255,.45)', fontSize:13 }}>
                        İlk haftalık mektup Pazartesi sabahı gelecek.{'\n'}Email adresinize de gönderilecek.
                      </div>
                    </div>
                  </Card>
                )}

                {/* Manuel tetikle (test için) */}
                <button onClick={async function(){
                  await fetch('https://bibi-app-rho.vercel.app/api/generate-letter?secret=bibi2026')
                  alert('Mektup üretme başlatıldı! Birkaç dakika içinde gelecek.')
                }} style={{ width:'100%', padding:12, borderRadius:12, border:'1px dashed rgba(255,255,255,.2)', background:'transparent', color:'rgba(255,255,255,.3)', fontSize:12, cursor:'pointer', fontFamily:'Nunito,sans-serif', marginTop:8 }}>
                  🔄 Mektubu Şimdi Üret (Test)
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
