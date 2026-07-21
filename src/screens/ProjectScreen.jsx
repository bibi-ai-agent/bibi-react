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
  const [quizState, setQuizState] = useState(null) // { questions, currentQ, scores: {me, friend}, options, waitingFor }
  const [quizResult, setQuizResult] = useState(null) // { winner, myScore, friendScore }
  const [quizStarted, setQuizStarted] = useState(false)
  const messagesEndRef = useRef(null)
  const stateRef = useRef({ messages: [] })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (!currentChild || !projectFriend || !projectType) return
    addMsg('system', `🤝 ${currentChild.name} ve ${projectFriend.name} birlikte ${TYPE_NAMES[projectType]} yapıyor!`)
    if (projectType === 'quiz') {
      startQuiz()
    } else {
      sendAI(`${TYPE_NAMES[projectType]} projesini başlatın. ${currentChild.name} ve ${projectFriend.name} ile kısa ve heyecanlı bir karşılama yapın, projeyi nasıl yapacağınızı açıklayın ve ilk adımı sorun.`)
    }
  }, [])

  async function startQuiz() {
    setIsTyping(true)
    addMsg('bibi', `🎯 Bilgi Yarışması başlıyor! ${currentChild.name} vs ${projectFriend.name} — Kim kazanacak? 🏆`)
    
    const age = currentChild.age || 9
    const optCount = age <= 8 ? 2 : age <= 12 ? 3 : 4
    
    const result = await callAI(null, [{
      role: 'user',
      content: `${age} yaşında çocuklar için Türkçe bilgi yarışması. 5 farklı dersten (Matematik, Fen, Tarih, Yabancı Dil, Genel Kültür) birer soru. ${optCount} şıklı. Yaşa uygun zorluk.
JSON (başka hiçbir şey yazma):
{"questions":[{"question":"...","options":["A)...","B)..."],"correct":0,"subject":"..."}]}`
    }], 1500)

    let parsed = null
    try {
      parsed = JSON.parse(result.replace(/```json|```/g, '').trim())
    } catch {
      addMsg('bibi', 'Sorular hazırlanamadı 🙈')
      setIsTyping(false)
      return
    }

    setIsTyping(false)
    setQuizState({
      questions: parsed.questions,
      currentQ: 0,
      scores: { me: 0, friend: 0 },
      answered: { me: null, friend: null }
    })
    setQuizStarted(true)
  }

  function handleQuizAnswer(optionIndex) {
    if (!quizState) return
    const q = quizState.questions[quizState.currentQ]
    const isCorrect = optionIndex === q.correct

    const newScores = {
      me: quizState.scores.me + (isCorrect ? 1 : 0),
      friend: quizState.scores.friend // arkadaşın cevabını simüle et
    }

    // Arkadaşı simüle et (random doğru/yanlış, yaşa göre başarı oranı)
    const friendChance = currentChild.age <= 8 ? 0.5 : currentChild.age <= 12 ? 0.6 : 0.7
    const friendCorrect = Math.random() < friendChance
    newScores.friend = quizState.scores.friend + (friendCorrect ? 1 : 0)

    const resultText = isCorrect ? '✅ Doğru!' : `❌ Yanlış! Doğru cevap: ${q.options[q.correct]}`
    const friendText = friendCorrect ? `${projectFriend.name} de doğru yaptı! 🎉` : `${projectFriend.name} de yanlış yaptı.`

    addMsg('system', `${currentChild.name}: ${resultText} | ${friendText}`)

    const nextQ = quizState.currentQ + 1

    if (nextQ >= quizState.questions.length) {
      // Quiz bitti
      setTimeout(() => {
        setQuizResult({
          myScore: newScores.me,
          friendScore: newScores.friend,
          total: quizState.questions.length
        })
      }, 800)
      setQuizState({ ...quizState, scores: newScores, currentQ: nextQ })
    } else {
      setQuizState({ ...quizState, scores: newScores, currentQ: nextQ })
    }
  }

  function addMsg(role, text) {
    setMessages(prev => [...prev, { role, text, id: Date.now() + Math.random() }])
  }

  async function sendAI(userText) {
    setIsTyping(true)
    const s1 = currentChild.bibi_specialty, s2 = projectFriend.bibi_specialty
    const systemPrompt = `Sen iki farklı çocuğun Bibi'si olarak konuşuyorsun:
- ${currentChild.name}'in Bibi'si${s1 ? ` (${s1} ${SPECIALTY_ICONS[s1]||'⭐'} uzmanı)` : ''}
- ${projectFriend.name}'in Bibi'si${s2 ? ` (${s2} ${SPECIALTY_ICONS[s2]||'⭐'} uzmanı)` : ''}
Proje: ${TYPE_NAMES[projectType]}
KURALLAR: İkisine de hitap et, kısa ve heyecanlı yaz, Türkçe konuş.`
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

  const currentQuestion = quizState && quizState.currentQ < quizState.questions.length
    ? quizState.questions[quizState.currentQ]
    : null

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>

      {/* Header */}
      <div style={{ background:'rgba(255,255,255,.06)', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(12px)', flexShrink:0 }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>İş Birliği</div>
          <div style={{ color:'white', fontSize:16, fontWeight:900 }}>{TYPE_ICONS[projectType]} {TYPE_NAMES[projectType]} — {currentChild.name} & {projectFriend.name}</div>
        </div>
        {quizState && (
          <div style={{ color:'#fbbf24', fontSize:13, fontWeight:800 }}>
            {currentChild.name}: {quizState.scores.me} | {projectFriend.name}: {quizState.scores.friend}
          </div>
        )}
        <button onClick={() => setScreen('friends')} style={{ background:'rgba(255,255,255,.1)', border:'1.5px solid rgba(255,255,255,.2)', borderRadius:20, padding:'7px 14px', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>✕ Çık</button>
      </div>

      {/* Mesajlar */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 8px', display:'flex', flexDirection:'column' }}>
        {messages.map(m => (
          <div key={m.id} style={{ display:'flex', marginBottom:12, justifyContent: m.role==='user' ? 'flex-end' : m.role==='system' ? 'center' : 'flex-start' }}>
            {m.role === 'system' ? (
              <div style={{ maxWidth:'92%', padding:'8px 14px', borderRadius:12, background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.7)', fontSize:13, fontWeight:600, textAlign:'center' }}>{m.text}</div>
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

      {/* Quiz Soru Alanı */}
      {projectType === 'quiz' && currentQuestion && (
        <div style={{ padding:'12px 16px', background:'rgba(0,0,0,.4)', borderTop:'1px solid rgba(255,255,255,.1)', flexShrink:0 }}>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:10, fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>
            SORU {(quizState?.currentQ||0)+1} / {quizState?.questions?.length||5} • {currentQuestion.subject}
          </div>
          <div style={{ color:'white', fontSize:15, fontWeight:800, marginBottom:12, lineHeight:1.5 }}>{currentQuestion.question}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {currentQuestion.options.map((opt, i) => (
              <button key={i} onClick={() => handleQuizAnswer(i)} style={{ padding:'11px 16px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.08)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif' }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Normal Input — quiz değilse */}
      {projectType !== 'quiz' && (
        <div style={{ padding:'12px 16px 18px', background:'rgba(0,0,0,.3)', backdropFilter:'blur(12px)', flexShrink:0 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendMessage()} placeholder="Bibi'lere bir şey söyle veya sor..." style={{ flex:1, padding:'12px 16px', borderRadius:24, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', fontSize:15, color:'white', fontFamily:'Nunito,sans-serif' }}/>
            <button onClick={sendMessage} style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,.2)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Quiz Sonuç Popup */}
      {quizResult && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', backdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'linear-gradient(135deg,#1A2E2A,#243d38)', borderRadius:24, padding:'32px 28px', maxWidth:340, width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.5)' }}>
            {quizResult.myScore > quizResult.friendScore ? (
              <>
                <div style={{ fontSize:56, marginBottom:12 }}>🏆</div>
                <div style={{ color:'#fbbf24', fontSize:22, fontWeight:900, marginBottom:8 }}>Tebrikler {currentChild.name}!</div>
                <div style={{ color:'rgba(255,255,255,.7)', fontSize:15, marginBottom:4 }}>Sen kazandın! 🎉</div>
                <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:20 }}>{projectFriend.name} bu kez olmadı, bir dahaki sefere! 💪</div>
              </>
            ) : quizResult.friendScore > quizResult.myScore ? (
              <>
                <div style={{ fontSize:56, marginBottom:12 }}>🌟</div>
                <div style={{ color:'white', fontSize:22, fontWeight:900, marginBottom:8 }}>Çok yakındın {currentChild.name}!</div>
                <div style={{ color:'rgba(255,255,255,.7)', fontSize:15, marginBottom:4 }}>Bu kez {projectFriend.name} kazandı.</div>
                <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:20 }}>Bir dahaki sefere sen kazanacaksın! 💪</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:56, marginBottom:12 }}>🤝</div>
                <div style={{ color:'#4ade80', fontSize:22, fontWeight:900, marginBottom:8 }}>Berabere!</div>
                <div style={{ color:'rgba(255,255,255,.7)', fontSize:15, marginBottom:20 }}>İkiniz de eşit puan aldınız! 🎊</div>
              </>
            )}

            {/* Skor tablosu */}
            <div style={{ background:'rgba(255,255,255,.08)', borderRadius:14, padding:'14px 16px', marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-around' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ color:'#4ade80', fontSize:28, fontWeight:900 }}>{quizResult.myScore}</div>
                  <div style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>{currentChild.name}</div>
                </div>
                <div style={{ color:'rgba(255,255,255,.3)', fontSize:20, alignSelf:'center' }}>vs</div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ color:'#a78bfa', fontSize:28, fontWeight:900 }}>{quizResult.friendScore}</div>
                  <div style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>{projectFriend.name}</div>
                </div>
              </div>
              <div style={{ color:'rgba(255,255,255,.3)', fontSize:11, marginTop:8 }}>{quizResult.total} sorudan</div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{setQuizResult(null);startQuiz();setMessages([])}} style={{ flex:1, padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'transparent', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>🔄 Tekrar</button>
              <button onClick={()=>setScreen('friends')} style={{ flex:1, padding:12, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Çık ✓</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
      `}</style>
    </div>
  )
}
