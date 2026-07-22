import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import { callAI } from '../lib/api'

const TYPE_NAMES = { homework:"Birlikte Ödev", experiment:"Deney/Proje", quiz:"Bilgi Yarışması" }
const TYPE_ICONS = { homework:"📚", experiment:"🔬", quiz:"🎯" }

export default function ProjectScreen() {
  const { currentChild, projectFriend, projectType, projectSessionId, setProjectSessionId, isProjectHost, setScreen } = useApp()
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  
  // Quiz state
  const [quizSession, setQuizSession] = useState(null)
  const [myAnswer, setMyAnswer] = useState(null)
  const [friendAnswer, setFriendAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [finalScores, setFinalScores] = useState(null)
  const [waitingFriend, setWaitingFriend] = useState(false)

  const messagesEndRef = useRef(null)
  const stateRef = useRef({ messages: [] })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (!currentChild || !projectFriend || !projectType) return
    
    addMsg('system', `🤝 ${currentChild.name} ve ${projectFriend.name} birlikte ${TYPE_NAMES[projectType]} yapıyor!`)
    
    if (projectType === 'quiz') {
      if (isProjectHost) {
        // Host sorular oluşturur ve session'a yazar
        initQuizSession()
      } else {
        // Guest host'un session'ını bekler
        waitForQuizSession()
      }
    } else {
      sendAI(`${TYPE_NAMES[projectType]} projesini başlatın. ${currentChild.name} ve ${projectFriend.name} ile heyecanlı bir karşılama yapın ve ilk adımı sorun.`)
    }
  }, [])

  async function initQuizSession() {
    setIsTyping(true)
    addMsg('bibi', '🎯 Sorular hazırlanıyor...')
    
    const age = currentChild.age || 9
    const optCount = age <= 8 ? 2 : age <= 12 ? 3 : 4
    
    const result = await callAI(null, [{
      role: 'user',
      content: `${age} yaşında çocuklar için Türkçe bilgi yarışması. 5 farklı dersten (Matematik, Fen, Tarih, Yabancı Dil, Genel Kültür) birer soru. ${optCount} şıklı. Yaşa uygun.
JSON formatında yaz (başka hiçbir şey yazma):
{"questions":[{"question":"...","options":["A) ...","B) ..."],"correct":0,"subject":"...","explanation":"Bu sorudan öğrendiğin şey: ..."}]}`
    }], 1500)

    let parsed = null
    try { parsed = JSON.parse(result.replace(/```json|```/g, '').trim()) }
    catch { addMsg('bibi', 'Sorular hazırlanamadı 🙈'); setIsTyping(false); return }

    // Session oluştur
    const scores = {}
    scores[currentChild.id] = 0
    scores[projectFriend.id] = 0

    const { data: session } = await sb.from('project_sessions').insert({
      friendship_id: null,
      project_type: 'quiz',
      questions: parsed.questions,
      current_question: 0,
      answers: {},
      scores,
      status: 'active'
    }).select().single()

    if (session) {
      setProjectSessionId(session.id)
      setQuizSession(session)
      setIsTyping(false)
      subscribeToSession(session.id)
      showQuestion(session, 0)
    }
  }

  async function waitForQuizSession() {
    addMsg('bibi', '⏳ Arkadaşın soruları hazırlıyor...')
    
    // 30 sn bekle, her 2 sn'de bir kontrol et
    let tries = 0
    const interval = setInterval(async () => {
      tries++
      // En son oluşturulan aktif quiz session'ını bul
      const { data } = await sb.from('project_sessions')
        .select('*')
        .eq('project_type', 'quiz')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        clearInterval(interval)
        setProjectSessionId(data.id)
        setQuizSession(data)
        subscribeToSession(data.id)
        showQuestion(data, data.current_question)
      }

      if (tries > 15) {
        clearInterval(interval)
        addMsg('bibi', 'Bağlantı zaman aşımına uğradı 😔')
      }
    }, 2000)
  }

  function subscribeToSession(sessionId) {
    const channel = sb.channel(`quiz-session-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'project_sessions',
        filter: `id=eq.${sessionId}`
      }, payload => {
        const updated = payload.new
        setQuizSession(updated)
        handleSessionUpdate(updated)
      })
      .subscribe()
    
    return () => sb.removeChannel(channel)
  }

  function handleSessionUpdate(session) {
    const answers = session.answers || {}
    const currentQ = session.current_question
    const qKey = `q${currentQ}`

    const myAns = answers[`${qKey}_${currentChild.id}`]
    const friendAns = answers[`${qKey}_${projectFriend.id}`]

    if (myAns !== undefined) setMyAnswer(myAns)
    if (friendAns !== undefined) setFriendAnswer(friendAns)

    // İkisi de cevapladıysa sonucu göster
    if (myAns !== undefined && friendAns !== undefined) {
      setWaitingFriend(false)
      showQuestionResult(session, currentQ, myAns, friendAns)
    }

    // Quiz bittiyse
    if (session.status === 'finished') {
      setQuizFinished(true)
      setFinalScores(session.scores)
    }
  }

  function showQuestion(session, qIndex) {
    const q = session.questions[qIndex]
    if (!q) return
    setMyAnswer(null)
    setFriendAnswer(null)
    setWaitingFriend(false)
    setShowResult(false)
    addMsg('system', `📝 Soru ${qIndex + 1}/${session.questions.length} — ${q.subject}`)
  }

  async function handleAnswer(optionIndex) {
    if (myAnswer !== null || !quizSession) return
    setMyAnswer(optionIndex)
    setWaitingFriend(true)

    const qKey = `q${quizSession.current_question}`
    const currentAnswers = quizSession.answers || {}
    const newAnswers = { ...currentAnswers, [`${qKey}_${currentChild.id}`]: optionIndex }

    // Supabase'e yaz
    await sb.from('project_sessions')
      .update({ answers: newAnswers })
      .eq('id', quizSession.id)
  }

  async function showQuestionResult(session, qIndex, myAns, friendAns) {
    const q = session.questions[qIndex]
    const myCorrect = myAns === q.correct
    const friendCorrect = friendAns === q.correct

    // Skorları güncelle
    const newScores = { ...session.scores }
    if (myCorrect) newScores[currentChild.id] = (newScores[currentChild.id] || 0) + 1
    if (friendCorrect) newScores[projectFriend.id] = (newScores[projectFriend.id] || 0) + 1

    setShowResult(true)

    const nextQ = qIndex + 1
    const isLast = nextQ >= session.questions.length

    if (isProjectHost) {
      await sb.from('project_sessions').update({
        scores: newScores,
        current_question: nextQ,
        status: isLast ? 'finished' : 'active',
        answers: isLast ? session.answers : session.answers
      }).eq('id', session.id)
    }

    if (isLast) {
      setFinalScores(newScores)
      setTimeout(() => setQuizFinished(true), 2000)
    } else {
      setTimeout(() => {
        setShowResult(false)
        showQuestion({ ...session, current_question: nextQ }, nextQ)
      }, 3000)
    }
  }

  function addMsg(role, text) {
    setMessages(prev => [...prev, { role, text, id: Date.now() + Math.random() }])
  }

  async function sendAI(userText) {
    setIsTyping(true)
    try {
      const reply = await callAI(
        `Sen iki çocuğun (${currentChild.name} ve ${projectFriend.name}) ortak Bibi'sisin. ${TYPE_NAMES[projectType]} yapıyorlar. Kısa, heyecanlı, Türkçe konuş.`,
        [...stateRef.current.messages, { role: 'user', content: userText }], 800
      )
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
    setInput(''); addMsg('user', t); sendAI(t)
  }

  if (!currentChild || !projectFriend || !projectType) {
    return <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>Proje bulunamadı</div>
  }

  const currentQ = quizSession ? quizSession.questions?.[quizSession.current_question] : null
  const myScore = finalScores?.[currentChild.id] || 0
  const friendScore = finalScores?.[projectFriend.id] || 0

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>

      {/* Header */}
      <div style={{ background:'rgba(255,255,255,.06)', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(12px)', flexShrink:0 }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>İş Birliği</div>
          <div style={{ color:'white', fontSize:15, fontWeight:900 }}>{TYPE_ICONS[projectType]} {TYPE_NAMES[projectType]}</div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>{currentChild.name} & {projectFriend.name}</div>
        </div>
        {quizSession && (
          <div style={{ textAlign:'center' }}>
            <div style={{ color:'#fbbf24', fontSize:11, fontWeight:700 }}>SKOR</div>
            <div style={{ color:'white', fontSize:16, fontWeight:900 }}>
              {quizSession.scores?.[currentChild.id]||0} — {quizSession.scores?.[projectFriend.id]||0}
            </div>
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
              <div style={{ maxWidth:'80%', padding:'11px 15px', borderRadius:'4px 18px 18px 18px', background:'rgba(255,255,255,.9)', color:'#1A2E2A', fontSize:14, lineHeight:1.6 }}>{m.text}</div>
            )}
          </div>
        ))}
        {isTyping && (
          <div style={{ display:'flex', marginBottom:12 }}>
            <div style={{ padding:'12px 16px', borderRadius:'4px 18px 18px 18px', background:'rgba(255,255,255,.15)', display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:i===1?'#a78bfa':'#4ade80', display:'block', animation:`dotPulse 1.2s ease ${i*0.2}s infinite` }}/>)}
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Quiz Soru Alanı */}
      {projectType === 'quiz' && currentQ && !showResult && !quizFinished && (
        <div style={{ padding:'12px 16px', background:'rgba(0,0,0,.4)', borderTop:'1px solid rgba(255,255,255,.1)', flexShrink:0 }}>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:10, fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>
            SORU {(quizSession?.current_question||0)+1} / {quizSession?.questions?.length||5} • {currentQ.subject}
          </div>
          <div style={{ color:'white', fontSize:15, fontWeight:800, marginBottom:12, lineHeight:1.5 }}>{currentQ.question}</div>
          
          {myAnswer === null ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {currentQ.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)}
                  style={{ padding:'11px 16px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.08)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif' }}>
                  {opt}
                </button>
              ))}
            </div>
          ) : waitingFriend ? (
            <div style={{ textAlign:'center', padding:'16px 0', color:'rgba(255,255,255,.6)', fontSize:14 }}>
              ✅ Cevabın kaydedildi! {projectFriend.name} cevap bekliyor... ⏳
            </div>
          ) : null}
        </div>
      )}

      {/* Soru Sonucu */}
      {showResult && currentQ && !quizFinished && (
        <div style={{ padding:'16px', background:'rgba(0,0,0,.5)', borderTop:'1px solid rgba(255,255,255,.1)', flexShrink:0, textAlign:'center' }}>
          <div style={{ fontSize:24, marginBottom:8 }}>
            {myAnswer === currentQ.correct ? '✅ Doğru!' : '❌ Yanlış!'}
          </div>
          <div style={{ color:'rgba(255,255,255,.6)', fontSize:13, marginBottom:4 }}>
            Doğru cevap: <span style={{ color:'#4ade80', fontWeight:800 }}>{currentQ.options[currentQ.correct]}</span>
          </div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>
            {projectFriend.name}: {friendAnswer === currentQ.correct ? '✅ Doğru' : '❌ Yanlış'}
          </div>
          {currentQ.explanation && (
            <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(74,222,128,.1)', borderRadius:10, color:'#4ade80', fontSize:12 }}>
              💡 {currentQ.explanation}
            </div>
          )}
        </div>
      )}

      {/* Normal Chat Input */}
      {projectType !== 'quiz' && (
        <div style={{ padding:'12px 16px 18px', background:'rgba(0,0,0,.3)', backdropFilter:'blur(12px)', flexShrink:0 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendMessage()}
              placeholder="Bibi'lere bir şey söyle..." style={{ flex:1, padding:'12px 16px', borderRadius:24, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', fontSize:15, color:'white', fontFamily:'Nunito,sans-serif' }}/>
            <button onClick={sendMessage} style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,.2)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Quiz Bitiş Popup */}
      {quizFinished && finalScores && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', backdropFilter:'blur(10px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'linear-gradient(135deg,#1A2E2A,#243d38)', borderRadius:24, padding:'32px 24px', maxWidth:360, width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.5)' }}>
            
            {myScore > friendScore ? (
              <>
                <div style={{ fontSize:64, marginBottom:12 }}>🏆</div>
                <div style={{ color:'#fbbf24', fontSize:24, fontWeight:900, marginBottom:8 }}>Tebrikler {currentChild.name}!</div>
                <div style={{ color:'rgba(255,255,255,.7)', fontSize:15, marginBottom:4 }}>Bu yarışmayı kazandın! 🎉</div>
                <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:20 }}>
                  {projectFriend.name} bu kez olmadı — ama her soru bir kazanım! 💪
                </div>
              </>
            ) : myScore < friendScore ? (
              <>
                <div style={{ fontSize:64, marginBottom:12 }}>🌟</div>
                <div style={{ color:'white', fontSize:22, fontWeight:900, marginBottom:8 }}>Harika mücadele {currentChild.name}!</div>
                <div style={{ color:'rgba(255,255,255,.6)', fontSize:14, marginBottom:4 }}>Bu kez {projectFriend.name} öndeydi.</div>
                <div style={{ color:'#4ade80', fontSize:13, marginBottom:20, lineHeight:1.6 }}>
                  Ama bu sorular senin için gerçek bir kazanım! Her yanlış cevap, bir sonraki seferki doğrunun tohumudur. 🌱
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:64, marginBottom:12 }}>🤝</div>
                <div style={{ color:'#4ade80', fontSize:22, fontWeight:900, marginBottom:8 }}>Berabere! Harika!</div>
                <div style={{ color:'rgba(255,255,255,.6)', fontSize:14, marginBottom:20 }}>İkiniz de eşit güçtesiniz! Her soru bir kazanım! 🎊</div>
              </>
            )}

            {/* Skor tablosu */}
            <div style={{ background:'rgba(255,255,255,.08)', borderRadius:16, padding:'16px', marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-around', marginBottom:12 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ color:'#4ade80', fontSize:32, fontWeight:900 }}>{myScore}</div>
                  <div style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>{currentChild.name}</div>
                </div>
                <div style={{ color:'rgba(255,255,255,.3)', fontSize:24, alignSelf:'center' }}>vs</div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ color:'#a78bfa', fontSize:32, fontWeight:900 }}>{friendScore}</div>
                  <div style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>{projectFriend.name}</div>
                </div>
              </div>
              <div style={{ color:'rgba(255,255,255,.3)', fontSize:11 }}>{quizSession?.questions?.length||5} sorudan</div>
            </div>

            {/* Konu bazlı özet */}
            <div style={{ background:'rgba(74,222,128,.08)', border:'1px solid rgba(74,222,128,.2)', borderRadius:12, padding:'12px 14px', marginBottom:20, textAlign:'left' }}>
              <div style={{ color:'#4ade80', fontSize:12, fontWeight:800, marginBottom:6 }}>📚 Bu yarışmadan kazanımların:</div>
              {quizSession?.questions?.map((q, i) => {
                const qKey = `q${i}`
                const myAns = quizSession.answers?.[`${qKey}_${currentChild.id}`]
                return (
                  <div key={i} style={{ color:'rgba(255,255,255,.6)', fontSize:11, marginBottom:4 }}>
                    {myAns === q.correct ? '✅' : '📌'} {q.subject}: {q.explanation || q.question.slice(0, 40) + '...'}
                  </div>
                )
              })}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{setQuizFinished(false);setFinalScores(null);setQuizSession(null);setMessages([]);if(isProjectHost)initQuizSession();else waitForQuizSession()}}
                style={{ flex:1, padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'transparent', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>🔄 Tekrar</button>
              <button onClick={()=>setScreen('friends')}
                style={{ flex:1, padding:12, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Bitir ✓</button>
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
