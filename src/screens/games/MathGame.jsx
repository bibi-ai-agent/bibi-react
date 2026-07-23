import { useState, useEffect, useRef } from 'react'
import { sb } from '../../lib/supabase'

function generateQuestion(age) {
  const ops = age <= 8 ? ['+', '-'] : age <= 12 ? ['+', '-', '*'] : ['+', '-', '*', '/']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a, b, answer

  if (op === '+') {
    a = age <= 8 ? Math.floor(Math.random()*20)+1 : Math.floor(Math.random()*100)+1
    b = age <= 8 ? Math.floor(Math.random()*20)+1 : Math.floor(Math.random()*100)+1
    answer = a + b
  } else if (op === '-') {
    a = age <= 8 ? Math.floor(Math.random()*20)+10 : Math.floor(Math.random()*100)+20
    b = age <= 8 ? Math.floor(Math.random()*a)+1 : Math.floor(Math.random()*a)+1
    answer = a - b
  } else if (op === '*') {
    a = Math.floor(Math.random()*12)+1
    b = Math.floor(Math.random()*12)+1
    answer = a * b
  } else {
    b = Math.floor(Math.random()*10)+2
    answer = Math.floor(Math.random()*10)+1
    a = b * answer
  }

  return { question: `${a} ${op} ${b} = ?`, answer, op }
}

function generateOptions(answer) {
  const opts = new Set([answer])
  while(opts.size < 4) {
    const fake = answer + (Math.floor(Math.random()*10)-5)
    if (fake !== answer && fake >= 0) opts.add(fake)
  }
  return [...opts].sort(() => Math.random()-0.5)
}

const TOTAL = 10
const TIME_PER_Q = 15

export default function MathGame({ currentChild, projectFriend, sessionId, isHost, onFinish }) {
  const [questions] = useState(() => Array.from({length:TOTAL}, () => generateQuestion(currentChild.age||9)))
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [friendScore, setFriendScore] = useState(null)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [answered, setAnswered] = useState(null)
  const [finished, setFinished] = useState(false)
  const timerRef = useRef(null)

  const q = questions[current]
  const options = useState(() => questions.map(q => generateOptions(q.answer)))[0]

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleAnswer(null); return TIME_PER_Q }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [current])

  // Realtime — arkadaşın skorunu dinle
  useEffect(() => {
    if (!sessionId) return
    const channel = sb.channel(`math-${sessionId}`)
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'project_sessions', filter:`id=eq.${sessionId}` }, payload => {
        const scores = payload.new.scores || {}
        const fId = projectFriend.id
        if (scores[fId] !== undefined) setFriendScore(scores[fId])
        if (payload.new.status === 'finished') {
          setFriendScore(scores[fId] || 0)
        }
      })
      .subscribe()
    return () => sb.removeChannel(channel)
  }, [sessionId])

  async function handleAnswer(chosen) {
    clearInterval(timerRef.current)
    const correct = chosen === q.answer
    const newScore = score + (correct ? 1 : 0)
    setAnswered(chosen)
    setScore(newScore)

    setTimeout(async () => {
      setAnswered(null)
      setTimeLeft(TIME_PER_Q)

      if (current + 1 >= TOTAL) {
        setFinished(true)
        // Skoru Supabase'e yaz
        if (sessionId) {
          const { data } = await sb.from('project_sessions').select('scores').eq('id', sessionId).single()
          const scores = data?.scores || {}
          scores[currentChild.id] = newScore
          const allDone = scores[projectFriend.id] !== undefined
          await sb.from('project_sessions').update({
            scores,
            status: allDone ? 'finished' : 'active'
          }).eq('id', sessionId)
        }
        onFinish(newScore)
      } else {
        setCurrent(c => c + 1)
      }
    }, 800)
  }

  if (finished) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:20 }}>
      <div style={{ fontSize:48, marginBottom:12 }}>⏳</div>
      <div style={{ color:'white', fontSize:18, fontWeight:900 }}>Tamamladın! {score}/{TOTAL}</div>
      <div style={{ color:'rgba(255,255,255,.5)', fontSize:14, marginTop:8 }}>
        {friendScore !== null ? `${projectFriend.name}: ${friendScore}/${TOTAL}` : `${projectFriend.name} devam ediyor...`}
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px' }}>
      {/* Progress */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:700 }}>SORU {current+1}/{TOTAL}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ color: timeLeft <= 5 ? '#fca88a' : '#4ade80', fontSize:20, fontWeight:900 }}>{timeLeft}s</div>
          <div style={{ color:'#fbbf24', fontSize:13, fontWeight:700 }}>Puan: {score}</div>
        </div>
      </div>

      <div style={{ height:4, background:'rgba(255,255,255,.1)', borderRadius:4, marginBottom:24, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${(timeLeft/TIME_PER_Q)*100}%`, background: timeLeft <= 5 ? '#fca88a' : '#4ade80', borderRadius:4, transition:'width 1s linear' }}/>
      </div>

      {/* Soru */}
      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:20, padding:'32px 24px', textAlign:'center', marginBottom:24 }}>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginBottom:8 }}>
          {q.op === '+' ? 'Toplama' : q.op === '-' ? 'Çıkarma' : q.op === '*' ? 'Çarpma' : 'Bölme'}
        </div>
        <div style={{ color:'white', fontSize:36, fontWeight:900 }}>{q.question}</div>
      </div>

      {/* Şıklar */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {options[current].map((opt, i) => {
          let bg = 'rgba(255,255,255,.08)'
          let border = 'rgba(255,255,255,.15)'
          if (answered !== null) {
            if (opt === q.answer) { bg = 'rgba(74,222,128,.2)'; border = '#4ade80' }
            else if (opt === answered) { bg = 'rgba(239,68,68,.2)'; border = '#fca88a' }
          }
          return (
            <button key={i} onClick={() => answered === null && handleAnswer(opt)}
              style={{ padding:'18px 12px', borderRadius:14, border:`1.5px solid ${border}`, background:bg, color:'white', fontSize:20, fontWeight:800, cursor: answered !== null ? 'default' : 'pointer', fontFamily:'Nunito,sans-serif', transition:'all .2s' }}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
