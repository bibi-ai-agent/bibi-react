import { useState, useEffect, useRef } from 'react'
import { callAI } from '../../lib/api'

const TIME_PER_Q = 30
const TOTAL_Q = 8

const PROMPT = {
  young: `8 yaş altı çocuklar için Türkçe bilmece ve mantık soruları. Basit, eğlenceli.
Örnek türler: klasik bilmeceler ("Kolları var ama eli yok"), basit mantık ("Bir dükkanda 5 elma var, 3 tanesi satıldı, kaç kaldı?"), dizi tamamlama ("🐱🐶🐱🐶?").`,
  middle: `9-12 yaş çocuklar için Türkçe mantık ve bulmaca soruları. Orta zorluk.
Örnek türler: mantık bulmacaları, sıralama soruları, dizi tamamlama, "kim ne aldı" tarzı çıkarım soruları.`,
  teen: `13-15 yaş gençler için Türkçe zor mantık soruları. Zorlu.
Örnek türler: karmaşık çıkarım, olasılık, kelime analojileri, matematiksel mantık.`
}

export default function RiddleGame({ currentChild, onFinish }) {
  const age = currentChild.age || 9
  const level = age <= 8 ? 'young' : age <= 12 ? 'middle' : 'teen'

  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(null)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [finished, setFinished] = useState(false)
  const [showExplain, setShowExplain] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    loadQuestions()
  }, [])

  useEffect(() => {
    if (loading || finished || answered !== null) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleAnswer(-1); return TIME_PER_Q }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [current, loading, finished, answered])

  async function loadQuestions() {
    setLoading(true)
    const result = await callAI(null, [{
      role: 'user',
      content: `${PROMPT[level]}

${TOTAL_Q} soru üret. JSON (başka hiçbir şey yazma):
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"...","type":"bilmece"}]}`
    }], 2000)

    try {
      const parsed = JSON.parse(result.replace(/```json|```/g, '').trim())
      setQuestions(parsed.questions)
    } catch {
      // Fallback sorular
      setQuestions([
        { question: "Kolları var ama eli yok, bacakları var ama ayağı yok. Ben neyim?", options:["A) Sandalye","B) Masa","C) Kapı","D) Pencere"], correct:0, explanation:"Sandalye: kolları ve bacakları var ama insan gibi eli ve ayağı yok.", type:"bilmece" },
        { question: "Her zaman seninle gelir ama asla tutamazsın. Ben neyim?", options:["A) Gölge","B) Ses","C) Rüzgar","D) Işık"], correct:0, explanation:"Gölge: her zaman yanındadır ama tutamazsın.", type:"bilmece" },
        { question: "Ali, Veli'den yaşlı. Veli, Ayşe'den genç. En yaşlı kim?", options:["A) Ali","B) Veli","C) Ayşe","D) Hepsi aynı"], correct:0, explanation:"Ali > Veli > Ayşe sıralaması, en yaşlı Ali.", type:"mantık" },
      ])
    }
    setLoading(false)
  }

  function handleAnswer(idx) {
    clearInterval(timerRef.current)
    if (answered !== null) return
    setAnswered(idx)
    const q = questions[current]
    const isCorrect = idx === q.correct
    if (isCorrect) setScore(s => s + 1)
    setShowExplain(true)

    setTimeout(() => {
      setShowExplain(false)
      setAnswered(null)
      setTimeLeft(TIME_PER_Q)
      const next = current + 1
      if (next >= questions.length) {
        setFinished(true)
        onFinish(score + (isCorrect ? 1 : 0))
      } else {
        setCurrent(next)
      }
    }, 2500)
  }

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:40 }}>🧠</div>
      <div style={{ color:'white', fontSize:16, fontWeight:700 }}>Sorular hazırlanıyor...</div>
      <div style={{ display:'flex', gap:6 }}>
        {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80', animation:`dotPulse 1.2s ease ${i*0.2}s infinite` }}/>)}
      </div>
      <style>{'@keyframes dotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}'}</style>
    </div>
  )

  if (finished) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:24, padding:'32px 24px', maxWidth:320, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:12 }}>{score >= questions.length*0.7 ? '🧠' : score >= questions.length*0.4 ? '💪' : '📚'}</div>
        <div style={{ color:'#4ade80', fontSize:22, fontWeight:900, marginBottom:8 }}>
          {score >= questions.length*0.7 ? 'Dahi misin sen!' : score >= questions.length*0.4 ? 'Çok iyisin!' : 'Pratik yapınca daha iyi olacaksın!'}
        </div>
        <div style={{ color:'rgba(255,255,255,.6)', fontSize:15, marginBottom:20 }}>
          {score}/{questions.length} doğru
        </div>
        <div style={{ background:'rgba(255,255,255,.06)', borderRadius:12, padding:14, marginBottom:20 }}>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>Başarı oranı</div>
          <div style={{ height:8, background:'rgba(255,255,255,.1)', borderRadius:4, marginTop:8, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(score/questions.length)*100}%`, background:'linear-gradient(90deg,#4ade80,#0D9B7E)', borderRadius:4 }}/>
          </div>
          <div style={{ color:'#4ade80', fontSize:14, fontWeight:800, marginTop:6 }}>{Math.round((score/questions.length)*100)}%</div>
        </div>
        <button onClick={() => { setFinished(false); setCurrent(0); setScore(0); setAnswered(null); setTimeLeft(TIME_PER_Q); loadQuestions() }}
          style={{ width:'100%', padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'transparent', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif', marginBottom:10 }}>🔄 Tekrar</button>
      </div>
    </div>
  )

  const q = questions[current]
  if (!q) return null

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'12px 16px', overflowY:'auto' }}>
      {/* Üst bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:700 }}>
          {current+1}/{questions.length}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ color: timeLeft <= 10 ? '#fca88a' : '#4ade80', fontSize:16, fontWeight:900 }}>{timeLeft}s</div>
          <div style={{ color:'#fbbf24', fontSize:13, fontWeight:700 }}>⭐ {score}</div>
        </div>
      </div>

      {/* Timer bar */}
      <div style={{ height:4, background:'rgba(255,255,255,.1)', borderRadius:4, marginBottom:16, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${(timeLeft/TIME_PER_Q)*100}%`, background: timeLeft<=10?'#fca88a':'#4ade80', borderRadius:4, transition:'width 1s linear' }}/>
      </div>

      {/* Soru tipi */}
      <div style={{ display:'inline-block', background:'rgba(124,58,237,.2)', border:'1px solid rgba(124,58,237,.3)', borderRadius:20, padding:'4px 12px', fontSize:11, color:'#a78bfa', fontWeight:700, marginBottom:12, alignSelf:'flex-start' }}>
        🧠 {q.type || 'Akıl Sorusu'}
      </div>

      {/* Soru */}
      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:16, padding:'20px 18px', marginBottom:16, lineHeight:1.6 }}>
        <div style={{ color:'white', fontSize:16, fontWeight:700 }}>{q.question}</div>
      </div>

      {/* Açıklama */}
      {showExplain && (
        <div style={{ background: answered === q.correct ? 'rgba(74,222,128,.15)' : 'rgba(239,68,68,.12)', border:`1px solid ${answered === q.correct ? '#4ade80' : '#fca88a'}`, borderRadius:12, padding:'10px 14px', marginBottom:12, fontSize:13, color: answered === q.correct ? '#4ade80' : '#fca88a' }}>
          {answered === q.correct ? '✅ Doğru! ' : `❌ Yanlış! Doğru: ${q.options[q.correct]} — `}{q.explanation}
        </div>
      )}

      {/* Şıklar */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {q.options.map((opt, i) => {
          let bg = 'rgba(255,255,255,.08)'
          let border = 'rgba(255,255,255,.15)'
          let color = 'white'
          if (answered !== null) {
            if (i === q.correct) { bg = 'rgba(74,222,128,.2)'; border = '#4ade80'; color = '#4ade80' }
            else if (i === answered) { bg = 'rgba(239,68,68,.2)'; border = '#fca88a'; color = '#fca88a' }
          }
          return (
            <button key={i} onClick={() => answered === null && handleAnswer(i)}
              style={{ padding:'13px 16px', borderRadius:12, border:`1.5px solid ${border}`, background:bg, color, fontSize:14, fontWeight:700, cursor: answered !== null ? 'default' : 'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif', transition:'all .2s' }}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
