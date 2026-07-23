import { useState, useMemo } from 'react'

const PRODUCTS = {
  young: [
    { name:'🍎 Elma', price: 5 }, { name:'🥛 Süt', price: 8 },
    { name:'🍞 Ekmek', price: 10 }, { name:'🧃 Meyve Suyu', price: 12 },
    { name:'🍫 Çikolata', price: 15 }, { name:'🥚 Yumurta', price: 20 },
    { name:'🍌 Muz', price: 7 }, { name:'🧀 Peynir', price: 18 },
  ],
  middle: [
    { name:'🍕 Pizza', price: 45 }, { name:'📚 Kitap', price: 75 },
    { name:'🎮 Oyun', price: 120 }, { name:'👟 Ayakkabı', price: 250 },
    { name:'🎒 Çanta', price: 180 }, { name:'🖊️ Kalem Seti', price: 35 },
    { name:'🧸 Oyuncak', price: 95 }, { name:'🎨 Boya Seti', price: 65 },
  ],
  teen: [
    { name:'💻 Mouse', price: 350 }, { name:'🎧 Kulaklık', price: 550 },
    { name:'📱 Kılıf', price: 130 }, { name:'⌨️ Klavye', price: 450 },
    { name:'🖥️ Webcam', price: 680 }, { name:'🎮 Joystick', price: 900 },
    { name:'📷 Tripod', price: 275 }, { name:'🔋 Powerbank', price: 400 },
  ]
}

const BILLS = {
  young:  [10, 20, 50, 100],
  middle: [50, 100, 200, 500],
  teen:   [500, 1000, 2000],
}

function generateQuestion(age) {
  const set = age <= 8 ? 'young' : age <= 12 ? 'middle' : 'teen'
  const products = PRODUCTS[set]
  const bills = BILLS[set]
  const count = age <= 8 ? 2 : age <= 12 ? 3 : 4
  const selected = []
  const used = new Set()
  while(selected.length < count) {
    const i = Math.floor(Math.random() * products.length)
    if (!used.has(i)) { used.add(i); selected.push(products[i]) }
  }
  const total = selected.reduce((s, p) => s + p.price, 0)
  const bill = bills.find(b => b > total) || bills[bills.length-1]
  const change = bill - total
  return { products: selected, total, bill, change }
}

function makeOptions(correct) {
  const opts = new Set([correct])
  let tries = 0
  while(opts.size < 4 && tries < 50) {
    tries++
    const fake = correct + (Math.floor(Math.random() * 20) - 10)
    if (fake >= 0 && fake !== correct) opts.add(fake)
  }
  return [...opts].sort(() => Math.random() - 0.5)
}

const TOTAL_Q = 5

export default function MarketGame({ currentChild, onFinish }) {
  const age = currentChild.age || 9

  const [questions] = useState(() => Array.from({length: TOTAL_Q}, () => generateQuestion(age)))
  const [allOptions] = useState(() => {
    return Array.from({length: TOTAL_Q}, (_, i) => {
      const q = questions[i] // questions is captured from outer scope via closure
      return {
        totalOpts: makeOptions(q.total),
        changeOpts: makeOptions(q.change)
      }
    })
  })

  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(null)
  const [step, setStep] = useState('total') // total | change
  const [finished, setFinished] = useState(false)

  const q = questions[current]
  const opts = step === 'total' ? allOptions[current].totalOpts : allOptions[current].changeOpts
  const correctAnswer = step === 'total' ? q.total : q.change

  function handleAnswer(chosen) {
    if (answered !== null) return
    setAnswered(chosen)
    const isCorrect = chosen === correctAnswer

    setTimeout(() => {
      if (step === 'total') {
        if (isCorrect) setScore(s => s + 1)
        setStep('change')
        setAnswered(null)
      } else {
        const newScore = score + (isCorrect ? 1 : 0)
        if (isCorrect) setScore(newScore)
        const next = current + 1
        if (next >= TOTAL_Q) {
          setFinished(true)
          onFinish(newScore)
        } else {
          setCurrent(next)
          setStep('total')
          setAnswered(null)
        }
      }
    }, 800)
  }

  if (finished) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:20 }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
      <div style={{ color:'white', fontSize:18, fontWeight:900 }}>Tamamladın! {score}/{TOTAL_Q*2} puan</div>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'16px', overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:700 }}>SORU {current+1}/{TOTAL_Q}</div>
        <div style={{ color:'#fbbf24', fontSize:13, fontWeight:700 }}>Puan: {score}</div>
      </div>

      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:16, padding:16, marginBottom:12 }}>
        <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, marginBottom:10 }}>🛒 ALIŞVERİŞ SEPETİ</div>
        {q.products.map((p, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom: i < q.products.length-1 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
            <span style={{ color:'white', fontSize:14 }}>{p.name}</span>
            <span style={{ color:'#4ade80', fontSize:14, fontWeight:700 }}>₺{p.price}</span>
          </div>
        ))}
      </div>

      <div style={{ background:'rgba(124,58,237,.15)', border:'1.5px solid rgba(124,58,237,.3)', borderRadius:14, padding:14, marginBottom:16, textAlign:'center' }}>
        {step === 'total' ? (
          <div style={{ color:'white', fontSize:15, fontWeight:800 }}>💰 Toplam tutar ne kadar? (₺)</div>
        ) : (
          <div>
            <div style={{ color:'#4ade80', fontSize:14, fontWeight:700, marginBottom:4 }}>Toplam: ₺{q.total} | Verilen: ₺{q.bill}</div>
            <div style={{ color:'white', fontSize:15, fontWeight:800 }}>🪙 Üstü ne kadar? (₺)</div>
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {opts.map((opt, i) => {
          let bg = 'rgba(255,255,255,.08)'
          let border = 'rgba(255,255,255,.15)'
          if (answered !== null) {
            if (opt === correctAnswer) { bg = 'rgba(74,222,128,.2)'; border = '#4ade80' }
            else if (opt === answered) { bg = 'rgba(239,68,68,.2)'; border = '#fca88a' }
          }
          return (
            <button key={i} onClick={() => handleAnswer(opt)}
              style={{ padding:'18px 8px', borderRadius:12, border:`1.5px solid ${border}`, background:bg, color:'white', fontSize:18, fontWeight:800, cursor: answered !== null ? 'default' : 'pointer', fontFamily:'Nunito,sans-serif' }}>
              ₺{opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
