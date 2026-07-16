import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import { callAI } from '../lib/api'

const TYPE_NAMES = { homework:"Birlikte Ödev", experiment:"Deney/Proje", quiz:"Bilgi Yarışması" }
const TYPE_ICONS = { homework:"📚", experiment:"🔬", quiz:"🎯" }
const SPECIALTY_ICONS = { Matematik:"📐", Fen:"🔬", "Yabancı Dil":"🌐", Tarih:"🏛️", Sanat:"🎨", Genel:"🌍" }

export default function ProjectScreen() {
  const { currentChild, projectFriend, projectType, setScreen } = useApp()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const stateRef = useRef({ messages: [] })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (!currentChild || !projectFriend || !projectType) return
    addMsg('system', `🤝 ${currentChild.name}'in Bibi'si ve ${projectFriend.name}'in Bibi'si birlikte çalışıyor!`)
    sendAI(`${TYPE_NAMES[projectType]} projesini başlatın. ${currentChild.name} ve ${projectFriend.name} ile kısa ve heyecanlı bir karşılama yapın, projeyi nasıl yapacağınızı açıklayın ve ilk adımı sorun.`)
  }, [])

  function addMsg(role, text) {
    setMessages(prev => [...prev, { role, text, id: Date.now() + Math.random() }])
  }

  async function sendAI(userText) {
    setIsTyping(true)
    const s1 = currentChild.bibi_specialty, s2 = projectFriend.bibi_specialty

    const systemPrompt = `Sen iki farklı çocuğun Bibi'si olarak konuşuyorsun:
- ${currentChild.name}'in Bibi'si${s1 ? ` (${s1} ${SPECIALTY_ICONS[s1]||'⭐'} uzmanı)` : ''}
- ${projectFriend.name}'in Bibi'si${s2 ? ` (${s2} ${SPECIALTY_ICONS[s2]||'⭐'} uzmanı)` : ''}

Proje türü: ${projectType}
İki çocuk birlikte bir ${projectType==='homework'?'ödev':projectType==='experiment'?'fen deneyi':'bilgi yarışması'} yapıyor.

KURALLAR:
• İki Bibi'nin sesini de yansıt — farklı uzmanlıkları olan iki arkadaş gibi
• Her ikisine de hitap et, ikisinden de katkı iste
• Kısa, heyecanlı ve işbirlikçi yanıtlar ver
• Projeyi adım adım ilerlet, her adımda onlardan bir şey sor
• Türkçe konuş`

    try {
      const reply = await callAI(systemPrompt, [...stateRef.current.messages, { role: 'user', content: userText }], 800)
      setIsTyping(false)
      addMsg('bibi', reply)
      stateRef.current.messages.push({ role: 'user', content: userText }, { role: 'assistant', content: reply })
    } catch {
      setIsTyping(false)
      addMsg('bibi', 'Bağlantıda sorun var 😅')
    }
  }

  function sendMessage() {
    const t = input.trim(); if (!t) return
    setInput('')
    addMsg('user', t)
    sendAI(t)
  }

  if (!currentChild || !projectFriend || !projectType) {
    return <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>Proje bulunamadı</div>
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>

      {/* Header */}
      <div style={{ background:'rgba(255,255,255,.06)', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(12px)', flexShrink:0 }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>İş Birliği</div>
          <div style={{ color:'white', fontSize:16, fontWeight:900 }}>{TYPE_NAMES[projectType]} — {currentChild.name} & {projectFriend.name}</div>
        </div>
        <button onClick={() => setScreen('friends')} style={{ background:'rgba(255,255,255,.1)', border:'1.5px solid rgba(255,255,255,.2)', borderRadius:20, padding:'7px 14px', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>✕ Çık</button>
      </div>

      {/* Mesajlar */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 8px', display:'flex', flexDirection:'column' }}>
        {messages.map(m => (
          <div key={m.id} style={{ display:'flex', marginBottom:12, animation:'fadeUp .3s ease', justifyContent: m.role==='user' ? 'flex-end' : m.role==='system' ? 'center' : 'flex-start' }}>
            {m.role === 'system' ? (
              <div style={{ maxWidth:'90%', padding:'8px 14px', borderRadius:12, background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.6)', fontSize:12, fontWeight:600, textAlign:'center' }}>{m.text}</div>
            ) : m.role === 'user' ? (
              <div style={{ maxWidth:'75%', padding:'11px 15px', borderRadius:'18px 4px 18px 18px', background:'linear-gradient(135deg,#7C3AED,#0D9B7E)', color:'white', fontSize:14, lineHeight:1.6, fontWeight:600 }}>{m.text}</div>
            ) : (
              <div style={{ maxWidth:'80%', padding:'11px 15px', borderRadius:'4px 18px 18px 18px', background:'rgba(255,255,255,.9)', color:'#1A2E2A', fontSize:14, lineHeight:1.6, fontWeight:500 }}>{m.text}</div>
            )}
          </div>
        ))}
        {isTyping && (
          <div style={{ display:'flex', marginBottom:12 }}>
            <div style={{ padding:'12px 16px', borderRadius:'4px 18px 18px 18px', background:'rgba(255,255,255,.15)', display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background: i===1?'#a78bfa':'#4ade80', display:'block', animation:`dotPulse 1.2s ease ${i*0.2}s infinite` }}/>)}
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:'12px 16px 18px', background:'rgba(0,0,0,.3)', backdropFilter:'blur(12px)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendMessage()} placeholder="Bibi'lere bir şey söyle veya sor..." style={{ flex:1, padding:'12px 16px', borderRadius:24, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', fontSize:15, color:'white', fontFamily:'Nunito,sans-serif' }}/>
          <button onClick={sendMessage} style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,.2)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
      `}</style>
    </div>
  )
}
