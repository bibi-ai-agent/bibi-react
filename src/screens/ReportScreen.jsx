import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import { callAI } from '../lib/api'
import BibiFace from '../components/BibiFace'

const eEmoji = {happy:"😊",excited:"🤩",curious:"🔍",calm:"😌",sad:"😢",frustrated:"😤",bored:"😴",anxious:"😰"}
const eLabel = {happy:"Mutlu",excited:"Heyecanlı",curious:"Meraklı",calm:"Sakin",sad:"Üzgün",frustrated:"Sinirli",bored:"Sıkılmış",anxious:"Endişeli"}
const eColor = {happy:"#16A34A",excited:"#D97706",curious:"#2563EB",calm:"#7C3AED",sad:"#64748b",frustrated:"#DC2626",bored:"#6B7280",anxious:"#EA580C"}
const eBg   = {happy:"#dcfce7",excited:"#fef3c7",curious:"#dbeafe",calm:"#ede9fe",sad:"#f1f5f9",frustrated:"#fee2e2",bored:"#f3f4f6",anxious:"#ffedd5"}
const iIcon = {sanat:"🎨",spor:"⚽",bilim:"🔬","müzik":"🎵",oyun:"🎮","doğa":"🌿",sosyal:"👥",teknoloji:"💻",edebiyat:"📚",matematik:"📐",genel:"🌍"}
const tColor = {Matematik:"#2563EB",Fen:"#16A34A","Yabancı Dil":"#9333EA",Tarih:"#EA580C",Genel:"#6B7280"}
const tIcon  = {Matematik:"📐",Fen:"🔬","Yabancı Dil":"🌐",Tarih:"🏛️",Genel:"🌍"}

export default function ReportScreen() {
  const { currentChild, setScreen, currentUser, subscription } = useApp()
  const plan = subscription?.plan || 'free'
  const isPro = plan === 'pro'

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
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileForm, setProfileForm] = useState({ full_name:'', role:'', age_range:'', education:'', job:'' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [accordionOpen, setAccordionOpen] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function checkPin(currentPin) {
    const { data: parent } = await sb.from('parents').select('*').eq('id', currentUser.id).single()
    if (String(parent?.pin) === String(currentPin)) {
      setParentProfile(parent)
      setPinOk(true)
      if (!parent?.full_name || !parent?.role) {
        setProfileForm({ full_name: parent?.full_name||'', role: parent?.role||'', age_range: parent?.age_range||'', education: parent?.education||'', job: parent?.job||'' })
        setShowProfileForm(true)
      } else {
        setShowWelcome(true)
        setTimeout(() => { setShowWelcome(false); loadData() }, 2500)
      }
    } else { setPinError('PIN hatalı!'); setPin('') }
  }

  async function saveProfile() {
    if (!profileForm.full_name || !profileForm.role) return
    setProfileSaving(true)
    await sb.from('parents').update(profileForm).eq('id', currentUser.id)
    setParentProfile({ ...parentProfile, ...profileForm })
    setProfileSaving(false)
    setShowProfileForm(false)
    setShowWelcome(true)
    setTimeout(() => { setShowWelcome(false); loadData() }, 2500)
  }

  async function loadData() {
    setLoading(true)
    const [m, s, e, r] = await Promise.all([
      sb.from('mastery').select('topic,score,message_count').eq('child_id',currentChild.id).order('score',{ascending:false}).limit(8),
      sb.from('sessions').select('started_at,duration_mins,message_count').eq('child_id',currentChild.id).order('started_at',{ascending:false}).limit(5),
      sb.from('emotion_logs').select('emotion,interest_area,character_hint').eq('child_id',currentChild.id).order('created_at',{ascending:false}).limit(30),
      sb.from('weekly_reports').select('summary,created_at').eq('child_id',currentChild.id).order('created_at',{ascending:false}).limit(1),
    ])
    setData({ mastery:m.data||[], sessions:s.data||[], emotions:e.data||[], lastReport:r.data?.[0]||null })
    setLoading(false)
  }

  async function generateReport() {
    setGenerating(true)
    const ec={}
    data.emotions.forEach(e=>{ ec[e.emotion]=(ec[e.emotion]||0)+1 })
    const dominant = Object.entries(ec).sort((a,b)=>b[1]-a[1])[0]?.[0]
    const hints = data.emotions.map(e=>e.character_hint).filter(Boolean).slice(0,5).join(', ')
    const parentName = parentProfile?.full_name || 'Sayın Veli'
    const summary = await callAI(null,[{role:'user',content:`${currentChild.age} yaşındaki ${currentChild.name} için aylık gelişim raporu yaz. Velinin adı: ${parentName}. Baskın duygu: ${dominant}. Duygu: ${JSON.stringify(ec)}. Karakter: ${hints}. Başlıklar: 1.💙 Duygusal Durum 2.⭐ İlgi Alanları 3.🌱 Karakter 4.📚 Öğrenme Profili 5.⚠️ Dikkat 6.💡 Öneriler`}],1800)
    await sb.from('weekly_reports').upsert({ child_id:currentChild.id, week_start:new Date().toISOString().split('T')[0], summary, dominant_emotion:dominant })
    setData(d=>({...d,lastReport:{summary,created_at:new Date().toISOString()}}))
    setGenerating(false)
    setAccordionOpen(true)
  }

  async function verifyPasswordForReset() {
    if (!forgotPassword) { setForgotError('Şifrenizi girin'); return }
    const { error } = await sb.auth.signInWithPassword({ email: currentUser.email, password: forgotPassword })
    if (error) { setForgotError('Şifre hatalı!'); return }
    setForgotError(''); setForgotStep(2)
  }

  async function saveNewPin() {
    if (newPin.length !== 4) { setForgotError('4 haneli PIN girin'); return }
    if (newPin !== newPinConfirm) { setForgotError("PIN'ler eşleşmiyor"); return }
    await sb.from('parents').update({ pin: newPin }).eq('id', currentUser.id)
    setForgotSuccess(true)
    setTimeout(() => { setShowForgot(false); setForgotStep(1); setForgotPassword(''); setNewPin(''); setNewPinConfirm(''); setForgotError(''); setForgotSuccess(false) }, 2000)
  }

  const inp = { width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.08)', color:'white', fontSize:14, fontFamily:'Nunito,sans-serif', boxSizing:'border-box', marginBottom:10 }

  // ── Şifremi Unuttum ──
  if (showForgot) return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1A2E2A,#243d38)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Nunito,sans-serif'}}>
      <div style={{width:'100%',maxWidth:340,textAlign:'center'}}>
        {forgotSuccess ? (
          <div><div style={{fontSize:48,marginBottom:16}}>✅</div><div style={{color:'#4ade80',fontSize:18,fontWeight:900}}>PIN güncellendi!</div></div>
        ) : forgotStep === 1 ? (
          <div>
            <div style={{fontSize:48,marginBottom:16}}>🔑</div>
            <div style={{color:'white',fontSize:18,fontWeight:900,marginBottom:8}}>PIN Sıfırla</div>
            <div style={{color:'rgba(255,255,255,.45)',fontSize:13,marginBottom:24}}>Giriş şifrenizi girin</div>
            <input type="password" placeholder="Giriş şifreniz" value={forgotPassword} onChange={e=>setForgotPassword(e.target.value)} style={inp}/>
            {forgotError && <div style={{color:'#fca88a',fontSize:12,marginBottom:10}}>{forgotError}</div>}
            <button onClick={verifyPasswordForReset} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:'#0D9B7E',color:'white',fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:'Nunito,sans-serif',marginBottom:10}}>Devam →</button>
            <button onClick={()=>setShowForgot(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,.35)',fontSize:13,cursor:'pointer'}}>← İptal</button>
          </div>
        ) : (
          <div>
            <div style={{fontSize:48,marginBottom:16}}>🔒</div>
            <div style={{color:'white',fontSize:18,fontWeight:900,marginBottom:8}}>Yeni PIN Belirle</div>
            <input type="number" placeholder="Yeni PIN (4 hane)" value={newPin} onChange={e=>setNewPin(e.target.value.slice(0,4))} style={inp}/>
            <input type="number" placeholder="PIN tekrar" value={newPinConfirm} onChange={e=>setNewPinConfirm(e.target.value.slice(0,4))} style={inp}/>
            {forgotError && <div style={{color:'#fca88a',fontSize:12,marginBottom:10}}>{forgotError}</div>}
            <button onClick={saveNewPin} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:'#0D9B7E',color:'white',fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:'Nunito,sans-serif',marginBottom:10}}>Kaydet ✓</button>
            <button onClick={()=>setForgotStep(1)} style={{background:'none',border:'none',color:'rgba(255,255,255,.35)',fontSize:13,cursor:'pointer'}}>← Geri</button>
          </div>
        )}
      </div>
    </div>
  )

  // ── PIN Ekranı ──
  if (!pinOk) return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1A2E2A,#243d38)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Nunito,sans-serif'}}>
      <div style={{width:'100%',maxWidth:340,textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <div style={{color:'white',fontSize:20,fontWeight:900,marginBottom:8}}>Veli Doğrulama</div>
        <div style={{color:'rgba(255,255,255,.45)',fontSize:13,marginBottom:24}}>PIN kodunuzu girin</div>
        <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:16}}>
          {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:'50%',background:pin.length>i?'white':'transparent',border:'2px solid rgba(255,255,255,.4)'}}/>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,maxWidth:240,margin:'0 auto 16px'}}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i)=>(
            <button key={i} onClick={()=>{
              if(d==='⌫') setPin(p=>p.slice(0,-1))
              else if(d!==''&&pin.length<4){const np=pin+d;setPin(np);if(np.length===4)setTimeout(()=>checkPin(np),200)}
            }} style={{aspectRatio:'1',borderRadius:'50%',border:'none',background:d===''?'transparent':'rgba(255,255,255,.1)',color:'white',fontSize:20,fontWeight:700,cursor:d===''?'default':'pointer',fontFamily:'Nunito,sans-serif'}}>{d}</button>
          ))}
        </div>
        {pinError&&<div style={{color:'#fca88a',fontSize:13,marginBottom:8}}>{pinError}</div>}
        <button onClick={()=>setShowForgot(true)} style={{background:'none',border:'none',color:'rgba(255,255,255,.4)',fontSize:12,cursor:'pointer',display:'block',margin:'0 auto 8px',fontFamily:'Nunito,sans-serif'}}>PIN'imi Unuttum?</button>
        <button onClick={()=>setScreen('children')} style={{background:'transparent',border:'none',color:'rgba(255,255,255,.35)',fontSize:13,cursor:'pointer'}}>← Geri</button>
      </div>
    </div>
  )

  // ── Veli Profil Formu ──
  if (showProfileForm) return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1A2E2A,#243d38)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Nunito,sans-serif'}}>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:12}}>👋</div>
          <div style={{color:'white',fontSize:20,fontWeight:900,marginBottom:6}}>Hoş Geldiniz!</div>
          <div style={{color:'rgba(255,255,255,.5)',fontSize:13}}>Sizi tanımak için birkaç bilgi alabilir miyiz?</div>
        </div>
        <div style={{background:'rgba(255,255,255,.07)',borderRadius:20,padding:24}}>
          <input placeholder="Ad Soyad *" value={profileForm.full_name} onChange={e=>setProfileForm(f=>({...f,full_name:e.target.value}))} style={inp}/>
          <select value={profileForm.role} onChange={e=>setProfileForm(f=>({...f,role:e.target.value}))} style={{...inp,cursor:'pointer',background:'#1A2E2A',color:'white'}}>
            <option value="">Çocukla ilişkiniz *</option>
            {['anne','baba','abi','abla','anneanne','babaanne','dede','diger'].map(r=>(
              <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>
            ))}
          </select>
          <select value={profileForm.age_range} onChange={e=>setProfileForm(f=>({...f,age_range:e.target.value}))} style={{...inp,cursor:'pointer',background:'#1A2E2A',color:'white'}}>
            <option value="">Yaş aralığınız</option>
            {['18-25','26-35','36-45','46-55','55+'].map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          <select value={profileForm.education} onChange={e=>setProfileForm(f=>({...f,education:e.target.value}))} style={{...inp,cursor:'pointer',background:'#1A2E2A',color:'white'}}>
            <option value="">Öğrenim durumunuz</option>
            {[['ilkokul','İlkokul'],['ortaokul','Ortaokul'],['lise','Lise'],['onlisans','Ön Lisans'],['lisans','Lisans'],['yukseklisans','Yüksek Lisans / Doktora']].map(([v,l])=>(
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input placeholder="Mesleğiniz (isteğe bağlı)" value={profileForm.job} onChange={e=>setProfileForm(f=>({...f,job:e.target.value}))} style={inp}/>
          <button onClick={saveProfile} disabled={profileSaving||!profileForm.full_name||!profileForm.role}
            style={{width:'100%',padding:14,borderRadius:14,border:'none',background:'#0D9B7E',color:'white',fontWeight:800,fontSize:15,cursor:'pointer',fontFamily:'Nunito,sans-serif',opacity:!profileForm.full_name||!profileForm.role?0.5:1}}>
            {profileSaving ? 'Kaydediliyor...' : 'Devam Et →'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Hoş Geldin ──
  if (showWelcome) {
    const name = parentProfile?.full_name || ''
    const role = parentProfile?.role || ''
    const isFemale = ['anne','abla','anneanne','babaanne'].includes(role)
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1A2E2A,#243d38)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Nunito,sans-serif'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:64,marginBottom:16}}>👋</div>
          <div style={{color:'rgba(255,255,255,.5)',fontSize:14,marginBottom:8}}>Sayın {isFemale?'Bayan':'Bay'}</div>
          <div style={{color:'white',fontSize:28,fontWeight:900,marginBottom:8}}>{name}</div>
          <div style={{color:'rgba(255,255,255,.5)',fontSize:15}}>hoş geldiniz.</div>
          <div style={{color:'#4ade80',fontSize:14,marginTop:16}}>{currentChild.name}'in gelişim raporu yükleniyor... ✨</div>
        </div>
      </div>
    )
  }

  // ── Loading ──
  if (loading||!data) return (
    <div style={{minHeight:'100vh',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{animation:'bounce 1.5s ease-in-out infinite'}}><BibiFace expr="thinking" size={70}/></div>
      <div style={{color:'#6B7280',fontSize:14}}>Rapor yükleniyor...</div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
    </div>
  )

  const {mastery,sessions,emotions,lastReport}=data
  const totalMinutes=sessions.reduce((s,x)=>s+(x.duration_mins||0),0)
  const totalMessages=sessions.reduce((s,x)=>s+(x.message_count||0),0)
  const emotionCounts={},interestCounts={},charHints=[]
  emotions.forEach(e=>{emotionCounts[e.emotion]=(emotionCounts[e.emotion]||0)+1;interestCounts[e.interest_area]=(interestCounts[e.interest_area]||0)+1;if(e.character_hint)charHints.push(e.character_hint)})
  const topInterests=Object.entries(interestCounts).sort((a,b)=>b[1]-a[1]).slice(0,4)
  const totalEmotions=emotions.length
  const posCount=Object.entries(emotionCounts).filter(([e])=>['happy','excited','curious','calm'].includes(e)).reduce((s,[,c])=>s+c,0)
  const balanceScore=totalEmotions>0?Math.round(posCount/totalEmotions*100):null
  const reportAge=lastReport?Math.floor((new Date()-new Date(lastReport.created_at))/(1000*60*60*24)):999
  const reportFresh=reportAge<30
  const avatarEl=currentChild.avatar_photo?<img src={currentChild.avatar_photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:22}}>{currentChild.avatar_emoji||(currentChild.gender==='kız'?'👧':'👦')}</span>
  const card={background:'white',borderRadius:16,padding:18,marginBottom:14,boxShadow:'0 2px 12px rgba(0,0,0,.08)'}
  const parentName = parentProfile?.full_name || 'Veli'
  const isFemale = ['anne','abla','anneanne','babaanne'].includes(parentProfile?.role||'')

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#a8607a,#b87fa0,#8f6aaa,#7a8cc0,#7ab5c8,#8fbfa8)',backgroundSize:'300% 300%',animation:'gradShift 18s ease infinite',position:'relative',overflowX:'hidden',fontFamily:'Nunito,sans-serif'}}>

      {/* Header */}
      <div style={{background:'rgba(100,60,100,0.88)',backdropFilter:'blur(20px)',padding:'18px 20px',position:'sticky',top:0,zIndex:10}}>
        <div style={{maxWidth:520,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:42,height:42,borderRadius:'50%',overflow:'hidden',border:'2px solid rgba(255,255,255,.3)',background:'#0D9B7E',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{avatarEl}</div>
            <div>
              <div style={{color:'rgba(255,255,255,.5)',fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase'}}>Gelişim Raporu</div>
              <div style={{color:'white',fontSize:18,fontWeight:900}}>{currentChild.name}</div>
              <div style={{color:'rgba(255,255,255,.4)',fontSize:11}}>{isFemale?'Bayan':'Bay'} {parentName}</div>
            </div>
          </div>
          <button onClick={()=>setScreen('children')} style={{background:'rgba(255,255,255,.12)',border:'1.5px solid rgba(255,255,255,.2)',borderRadius:20,padding:'8px 14px',color:'white',fontSize:12,fontWeight:700,cursor:'pointer'}}>← Geri</button>
        </div>
      </div>

      <div style={{position:'relative',zIndex:1,maxWidth:520,margin:'0 auto',padding:'20px 16px 60px'}}>

        {/* Stat kartları - Tüm planlar */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
          {[{icon:"⏱️",val:totalMinutes,label:"Dakika",color:"#2563EB"},{icon:"💬",val:totalMessages,label:"Mesaj",color:"#0D9B7E"},{icon:"📖",val:sessions.length,label:"Sohbet",color:"#7C3AED"}].map(s=>(
            <div key={s.label} style={{background:'white',borderRadius:14,padding:'14px 8px',textAlign:'center',boxShadow:'0 2px 10px rgba(0,0,0,.07)'}}>
              <div style={{fontSize:20}}>{s.icon}</div>
              <div style={{fontSize:22,fontWeight:900,color:s.color,marginTop:4}}>{s.val}</div>
              <div style={{fontSize:10,color:'#9CA3AF',fontWeight:700,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sohbet Geçmişi - Tüm planlar */}
        {sessions.length>0 && (
          <div style={{background:'white',borderRadius:16,overflow:'hidden',marginBottom:14,boxShadow:'0 2px 12px rgba(0,0,0,.08)'}}>
            <button onClick={()=>setSessionsOpen(!sessionsOpen)} style={{width:'100%',padding:'14px 18px',border:'none',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',boxSizing:'border-box',fontFamily:'Nunito,sans-serif'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#111827'}}>🕐 Sohbet Geçmişi <span style={{fontSize:12,color:'#9CA3AF',fontWeight:600}}>({sessions.length} sohbet)</span></div>
              <span style={{fontSize:14,color:'#9CA3AF',transition:'transform .3s',display:'inline-block',transform:sessionsOpen?'rotate(180deg)':''}}>▼</span>
            </button>
            {sessionsOpen && (
              <div style={{padding:'0 18px 14px'}}>
                {sessions.map((s,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i<sessions.length-1?'1px solid #f3f4f6':'none'}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'#111827'}}>{new Date(s.started_at).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})}</div>
                      <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>{new Date(s.started_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#0D9B7E'}}>{s.duration_mins||0} dk</div>
                      <div style={{fontSize:11,color:'#9CA3AF'}}>{s.message_count||0} mesaj</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pro bölümü — Duygu, İlgi, Karakter */}
        {isPro ? (
          <div>
            {/* Duygusal Denge */}
            <div style={card}>
              <div style={{fontSize:14,fontWeight:800,color:'#111827',marginBottom:14}}>💙 Duygusal Denge Skoru</div>
              {balanceScore!==null ? (
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:14}}>
                    <div style={{position:'relative',width:76,height:76,flexShrink:0}}>
                      <svg width="76" height="76" viewBox="0 0 76 76">
                        <circle cx="38" cy="38" r="32" fill="none" stroke="#f3f4f6" strokeWidth="7"/>
                        <circle cx="38" cy="38" r="32" fill="none" stroke={balanceScore>=70?"#16A34A":balanceScore>=40?"#D97706":"#DC2626"} strokeWidth="7" strokeDasharray={2*Math.PI*32} strokeDashoffset={2*Math.PI*32*(1-balanceScore/100)} strokeLinecap="round" transform="rotate(-90 38 38)"/>
                      </svg>
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:900,color:'#111827'}}>{balanceScore}%</div>
                    </div>
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:balanceScore>=70?"#16A34A":balanceScore>=40?"#D97706":"#DC2626"}}>{balanceScore>=70?"Çok İyi 🌟":balanceScore>=40?"Dengeli 👍":"Dikkat ⚠️"}</div>
                      <div style={{fontSize:12,color:'#6B7280',marginTop:4,lineHeight:1.4}}>{balanceScore>=70?`${currentChild.name} mutlu ve pozitif görünüyor`:balanceScore>=40?"Duygusal denge iyi seviyede":"Bazı zorluklarla başa çıkıyor"}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {Object.entries(emotionCounts).sort((a,b)=>b[1]-a[1]).map(([e,c])=>(
                      <div key={e} style={{display:'flex',alignItems:'center',gap:4,background:eBg[e]||'#f3f4f6',borderRadius:20,padding:'4px 10px'}}>
                        <span>{eEmoji[e]||'😐'}</span>
                        <span style={{fontSize:12,fontWeight:700,color:eColor[e]||'#6B7280'}}>{eLabel[e]||e}</span>
                        <span style={{fontSize:11,color:'#9CA3AF'}}>%{Math.round(c/totalEmotions*100)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{textAlign:'center',color:'#9CA3AF',fontSize:13,padding:'12px 0'}}>😊 Duygu verisi henüz yok.</div>
              )}
            </div>

            {/* İlgi Alanları */}
            {topInterests.length>0 && (
              <div style={card}>
                <div style={{fontSize:14,fontWeight:800,color:'#111827',marginBottom:14}}>⭐ İlgi Alanları & Eğilimler</div>
                {topInterests.map(([area,count])=>{
                  const pct=Math.round(count/totalEmotions*100)
                  return (
                    <div key={area} style={{marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{fontSize:13,fontWeight:700,color:'#111827'}}>{iIcon[area]||'🌍'} {area.charAt(0).toUpperCase()+area.slice(1)}</span>
                        <span style={{fontSize:12,color:'#0D9B7E',fontWeight:800}}>%{pct}</span>
                      </div>
                      <div style={{height:7,background:'#f3f4f6',borderRadius:8,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#0D9B7E,#7C3AED)',borderRadius:8}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Karakter Analizi */}
            {charHints.length>0 && (
              <div style={card}>
                <div style={{fontSize:14,fontWeight:800,color:'#111827',marginBottom:12}}>🧠 Karakter Analizi</div>
                {[...new Set(charHints)].slice(0,4).map((h,i)=>(
                  <div key={i} style={{display:'flex',gap:8,padding:'10px 12px',background:'#f0fdf4',borderRadius:10,borderLeft:'3px solid #0D9B7E',marginBottom:8}}>
                    <span>💙</span><span style={{fontSize:13,color:'#374151',lineHeight:1.5}}>{h}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Akademik Ustalık */}
            {mastery.length>0 && (
              <div style={card}>
                <div style={{fontSize:14,fontWeight:800,color:'#111827',marginBottom:14}}>📊 Akademik Ustalık</div>
                {mastery.map(m=>(
                  <div key={m.topic} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span>{tIcon[m.topic]||'🌍'}</span>
                        <span style={{fontSize:13,fontWeight:700,color:'#111827'}}>{m.topic}</span>
                        <span style={{fontSize:11,color:'#9CA3AF'}}>{m.message_count} etkileşim</span>
                      </div>
                      <span style={{fontSize:12,fontWeight:800,color:tColor[m.topic]||'#6B7280',background:`${tColor[m.topic]||'#6B7280'}18`,padding:'3px 10px',borderRadius:20}}>%{m.score}</span>
                    </div>
                    <div style={{height:7,background:'#f3f4f6',borderRadius:8,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${m.score}%`,background:tColor[m.topic]||'#6B7280',borderRadius:8}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{background:'rgba(124,58,237,.08)',border:'1.5px solid rgba(124,58,237,.25)',borderRadius:16,padding:'20px 18px',marginBottom:14,textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:8}}>🔒</div>
            <div style={{color:'#7C3AED',fontSize:14,fontWeight:800,marginBottom:6}}>Duygu Analizi, Karakter & İlgi Alanları</div>
            <div style={{color:'#6B7280',fontSize:12,marginBottom:14}}>Bu detaylı analizler sadece Bibi Pro planında görüntülenebilir.</div>
            <button onClick={()=>setScreen('subscription')} style={{padding:'10px 24px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#7C3AED,#0D9B7E)',color:'white',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:'Nunito,sans-serif'}}>⭐ Pro'ya Geç</button>
          </div>
        )}

        {/* Aylık Rapor */}
        <div style={{background:'white',borderRadius:16,overflow:'hidden',marginBottom:12,boxShadow:'0 2px 12px rgba(0,0,0,.08)'}}>
          <button onClick={()=>setAccordionOpen(!accordionOpen)} style={{width:'100%',padding:'16px 18px',border:'none',background:'linear-gradient(135deg,#1A2E2A,#243d38)',color:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',boxSizing:'border-box',fontFamily:'Nunito,sans-serif'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:18}}>✨</span>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:14,fontWeight:800}}>Aylık Gelişim Raporu</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginTop:2}}>{lastReport?`${new Date(lastReport.created_at).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})} • ${reportFresh?`${30-reportAge} gün sonra yenilenir`:'Güncelleme mevcut'}`:'Henüz oluşturulmadı'}</div>
              </div>
            </div>
            <span style={{fontSize:16,transition:'transform .3s',flexShrink:0,display:'inline-block',transform:accordionOpen?'rotate(180deg)':''}}>▼</span>
          </button>
          {accordionOpen && (
            <div style={{padding:'16px 18px',borderTop:'1px solid #f3f4f6'}}>
              {lastReport
                ? <div style={{color:'#374151',fontSize:13,lineHeight:1.8,whiteSpace:'pre-line'}}>{lastReport.summary}</div>
                : <div style={{color:'#9CA3AF',fontSize:13,textAlign:'center'}}>Henüz rapor oluşturulmadı.</div>}
            </div>
          )}
        </div>

        {/* Rapor butonu - sadece Pro */}
        {isPro ? (
          <button onClick={generateReport} disabled={generating} style={{width:'100%',padding:15,borderRadius:16,border:'none',background:generating?'rgba(13,155,126,.5)':'linear-gradient(135deg,#0D9B7E,#7C3AED)',color:'white',fontWeight:800,fontSize:14,cursor:'pointer',boxSizing:'border-box',fontFamily:'Nunito,sans-serif'}}>
            {generating?'⏳ Rapor hazırlanıyor...':lastReport?(reportFresh?`🔄 Raporu Yenile (${30-reportAge} gün kaldı)`:'🔄 Yeni Rapor Al'):'✨ Aylık Gelişim Raporunu Oluştur'}
          </button>
        ) : (
          <div style={{background:'rgba(124,58,237,.08)',border:'1.5px solid rgba(124,58,237,.25)',borderRadius:16,padding:'16px 18px',textAlign:'center'}}>
            <div style={{color:'#7C3AED',fontSize:13,fontWeight:800,marginBottom:4}}>Aylık Rapor — Pro Özelliği</div>
            <div style={{color:'#6B7280',fontSize:12,marginBottom:10}}>Detaylı aylık gelişim raporları sadece Bibi Pro'da kullanılabilir.</div>
            <button onClick={()=>setScreen('subscription')} style={{padding:'8px 20px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#7C3AED,#0D9B7E)',color:'white',fontWeight:800,fontSize:12,cursor:'pointer',fontFamily:'Nunito,sans-serif'}}>⭐ Pro'ya Geç</button>
          </div>
        )}
      </div>
      <style>{`@keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
    </div>
  )
}
