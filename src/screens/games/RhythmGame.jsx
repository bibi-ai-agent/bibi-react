import { useState, useEffect, useRef, useCallback } from 'react'
import { sb } from '../../lib/supabase'

const INSTRUMENTS = [
  { id:'guitar',  name:'Gitar',   emoji:'🎸', color:'#e74c3c', bg:'linear-gradient(135deg,#2d0a0a,#1a0000)', noteColor:'#ff6b6b', keys:['A','S','D','F'] },
  { id:'drums',   name:'Davul',   emoji:'🥁', color:'#e67e22', bg:'linear-gradient(135deg,#2d1a00,#1a0f00)', noteColor:'#ffaa44', keys:['A','S','D','F'] },
  { id:'piano',   name:'Piyano',  emoji:'🎹', color:'#9b59b6', bg:'linear-gradient(135deg,#1a002d,#0d001a)', noteColor:'#cc88ff', keys:['A','S','D','F'] },
  { id:'trumpet', name:'Trompet', emoji:'🎺', color:'#f1c40f', bg:'linear-gradient(135deg,#2d2a00,#1a1800)', noteColor:'#ffe044', keys:['A','S','D','F'] },
  { id:'violin',  name:'Keman',   emoji:'🎻', color:'#27ae60', bg:'linear-gradient(135deg,#002d0a,#001a05)', noteColor:'#44ff88', keys:['A','S','D','F'] },
]

const INSTRUMENT_VISUALS = {
  guitar:  { desc:'Gitar tellerini çal!',    laneLabels:['MI', 'LA', 'RE', 'SOL'] },
  drums:   { desc:'Davulu vur!',             laneLabels:['HİH', 'SNR', 'TOM', 'BAS'] },
  piano:   { desc:'Piyanonu çal!',           laneLabels:['DO', 'RE', 'Mİ', 'FA'] },
  trumpet: { desc:'Trompeti öttür!',         laneLabels:['DO', 'RE', 'Mİ', 'FA'] },
  violin:  { desc:'Kemanı çal!',             laneLabels:['SOL', 'RE', 'LA', 'Mİ'] },
}

const SONGS = {
  guitar:  { name:'Rock Beat', bpm:120, pattern:[[0,500],[1,1000],[2,1500],[3,2000],[0,2500],[1,3000],[2,3500],[0,4000],[3,4500],[1,5000],[0,5500],[2,6000],[1,6500],[3,7000],[0,7500],[2,8000]] },
  drums:   { name:'Funk Groove', bpm:130, pattern:[[0,400],[2,800],[1,1200],[3,1600],[0,2000],[2,2400],[1,2800],[0,3200],[3,3600],[2,4000],[1,4400],[0,4800],[3,5200],[2,5600],[1,6000],[0,6400]] },
  piano:   { name:'Klasik Melodi', bpm:100, pattern:[[0,600],[1,1200],[2,1800],[1,2400],[0,3000],[3,3600],[2,4200],[1,4800],[0,5400],[2,6000],[3,6600],[1,7200],[0,7800],[2,8400],[1,9000],[3,9600]] },
  trumpet: { name:'Caz Ritmi', bpm:110, pattern:[[0,545],[2,1090],[1,1635],[3,2180],[0,2725],[1,3270],[3,3815],[2,4360],[0,4905],[3,5450],[1,5995],[2,6540],[0,7085],[3,7630],[2,8175],[1,8720]] },
  violin:  { name:'Klasik Vals', bpm:90, pattern:[[0,666],[1,1332],[2,1998],[0,2664],[3,3330],[1,3996],[2,4662],[0,5328],[3,5994],[2,6660],[1,7326],[0,7992],[3,8658],[2,9324],[1,9990],[0,10656]] },
}

const LANE_W = 70
const NOTE_H = 36
const HIT_ZONE_Y = 80 // piksel cinsinden üstten
const FALL_SPEED_BASE = 200 // px/sn

function getSpeedForAge(age) {
  if (age <= 8) return 0.6
  if (age <= 12) return 0.9
  return 1.2
}

export default function RhythmGame({ currentChild, projectFriend, onFinish }) {
  const age = currentChild?.age || 9
  const [phase, setPhase] = useState('select') // select | countdown | playing | result
  const [selectedInstrument, setSelectedInstrument] = useState(null)
  const [countdown, setCountdown] = useState(3)
  const [notes, setNotes] = useState([]) // { id, lane, y, hit, miss }
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [laneFlash, setLaneFlash] = useState([false,false,false,false])
  const [hitFeedback, setHitFeedback] = useState(null) // { text, lane }
  const [totalNotes, setTotalNotes] = useState(0)

  const gameRef = useRef(null)
  const animRef = useRef(null)
  const lastTimeRef = useRef(null)
  const startTimeRef = useRef(null)
  const spawnedRef = useRef(new Set())
  const notesRef = useRef([])
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const hitsRef = useRef(0)
  const missesRef = useRef(0)

  const inst = selectedInstrument ? INSTRUMENTS.find(i => i.id === selectedInstrument) : null
  const song = selectedInstrument ? SONGS[selectedInstrument] : null
  const visual = selectedInstrument ? INSTRUMENT_VISUALS[selectedInstrument] : null
  const speed = FALL_SPEED_BASE * getSpeedForAge(age)
  const BOARD_H = typeof window !== 'undefined' ? window.innerHeight - 180 : 600
  const BOARD_W = LANE_W * 4

  function startGame(instId) {
    setSelectedInstrument(instId)
    setPhase('countdown')
    setCountdown(3)
    setNotes([]); setScore(0); setCombo(0); setMaxCombo(0)
    setHits(0); setMisses(0)
    notesRef.current = []
    scoreRef.current = 0
    comboRef.current = 0
    hitsRef.current = 0
    missesRef.current = 0
    spawnedRef.current = new Set()
    setTotalNotes(SONGS[instId].pattern.length)
  }

  // Geri sayım
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) { setPhase('playing'); startTimeRef.current = performance.now(); return }
    const t = setTimeout(() => setCountdown(c => c-1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  // Oyun döngüsü
  useEffect(() => {
    if (phase !== 'playing' || !song) return

    function gameLoop(ts) {
      if (!lastTimeRef.current) lastTimeRef.current = ts
      const dt = (ts - lastTimeRef.current) / 1000
      lastTimeRef.current = ts
      const elapsed = ts - startTimeRef.current

      // Yeni notaları spawn et
      song.pattern.forEach((p, idx) => {
        const [lane, spawnAt] = p
        if (!spawnedRef.current.has(idx) && elapsed >= spawnAt - (BOARD_H / speed * 1000)) {
          spawnedRef.current.add(idx)
          const newNote = { id: idx, lane, y: -NOTE_H, hit: false, miss: false }
          notesRef.current = [...notesRef.current, newNote]
        }
      })

      // Notaları hareket ettir
      notesRef.current = notesRef.current.map(n => {
        if (n.hit || n.miss) return n
        const newY = n.y + speed * dt
        // Hit zone'u geçti → miss
        const hitZoneBottom = BOARD_H - HIT_ZONE_Y + NOTE_H
        if (newY > hitZoneBottom + 20 && !n.hit && !n.miss) {
          missesRef.current++
          setMisses(missesRef.current)
          comboRef.current = 0
          setCombo(0)
          return { ...n, y: newY, miss: true }
        }
        return { ...n, y: newY }
      })

      // Ekrandan çıkan notları temizle
      notesRef.current = notesRef.current.filter(n => n.y < BOARD_H + 60)
      setNotes([...notesRef.current])

      // Oyun bitti mi?
      if (spawnedRef.current.size >= song.pattern.length) {
        const remaining = notesRef.current.filter(n => !n.hit && !n.miss)
        if (remaining.length === 0) {
          cancelAnimationFrame(animRef.current)
          setTimeout(() => {
            setPhase('result')
            if (currentChild) saveResult()
          }, 500)
          return
        }
      }

      animRef.current = requestAnimationFrame(gameLoop)
    }

    animRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase])

  // Klavye dinleyici
  useEffect(() => {
    if (phase !== 'playing') return
    const keyMap = { 'a':0, 's':1, 'd':2, 'f':3 }
    function onKey(e) {
      const lane = keyMap[e.key.toLowerCase()]
      if (lane === undefined) return
      hitLane(lane)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  function hitLane(lane) {
    const hitZoneTop = BOARD_H - HIT_ZONE_Y - NOTE_H
    const hitZoneBot = BOARD_H - HIT_ZONE_Y + NOTE_H

    // Flash efekti
    setLaneFlash(prev => { const n=[...prev]; n[lane]=true; return n })
    setTimeout(() => setLaneFlash(prev => { const n=[...prev]; n[lane]=false; return n }), 100)

    // Hit kontrol
    let hit = false
    notesRef.current = notesRef.current.map(n => {
      if (n.hit || n.miss || n.lane !== lane) return n
      if (n.y >= hitZoneTop && n.y <= hitZoneBot) {
        hit = true
        const diff = Math.abs(n.y - (BOARD_H - HIT_ZONE_Y))
        const perfect = diff < 20
        const pts = perfect ? 100 : 60
        scoreRef.current += pts * (1 + Math.floor(comboRef.current/5))
        comboRef.current++
        hitsRef.current++
        setScore(scoreRef.current)
        setCombo(comboRef.current)
        setHits(hitsRef.current)
        if (comboRef.current > maxCombo) setMaxCombo(comboRef.current)
        setHitFeedback({ text: perfect ? 'MÜKEMMEL! ✨' : 'İYİ! 👍', lane })
        setTimeout(() => setHitFeedback(null), 400)
        return { ...n, hit: true }
      }
      return n
    })
  }

  async function saveResult() {
    if (!currentChild || !selectedInstrument) return
    try {
      await sb.from('children').update({
        music_interest: INSTRUMENTS.find(i => i.id === selectedInstrument)?.name || selectedInstrument
      }).eq('id', currentChild.id)
    } catch {}
  }

  const accuracy = totalNotes > 0 ? Math.round((hitsRef.current / totalNotes) * 100) : 0
  const rank = accuracy >= 95 ? 'S' : accuracy >= 80 ? 'A' : accuracy >= 60 ? 'B' : accuracy >= 40 ? 'C' : 'D'
  const rankColor = { S:'#fbbf24', A:'#4ade80', B:'#60a5fa', C:'#a78bfa', D:'#fca88a' }

  // Enstrüman seçim ekranı
  if (phase === 'select') return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ fontSize:14, color:'rgba(255,255,255,.5)', fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>RİTİM OYUNU</div>
      <div style={{ color:'white', fontSize:20, fontWeight:900, marginBottom:6 }}>Hangi enstrümanı çalmak istersin?</div>
      <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:28 }}>Seç ve ritmi tut!</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:320 }}>
        {INSTRUMENTS.map(inst => (
          <button key={inst.id} onClick={() => startGame(inst.id)}
            style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderRadius:16, border:`2px solid ${inst.color}44`, background:`${inst.color}18`, cursor:'pointer', fontFamily:'Nunito,sans-serif', transition:'all .2s' }}
            onMouseOver={e => e.currentTarget.style.background=`${inst.color}30`}
            onMouseOut={e => e.currentTarget.style.background=`${inst.color}18`}>
            <div style={{ fontSize:36 }}>{inst.emoji}</div>
            <div style={{ textAlign:'left' }}>
              <div style={{ color:'white', fontSize:16, fontWeight:800 }}>{inst.name}</div>
              <div style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>{INSTRUMENT_VISUALS[inst.id].laneLabels.join(' · ')}</div>
            </div>
            <div style={{ marginLeft:'auto', color:inst.color, fontSize:20 }}>›</div>
          </button>
        ))}
      </div>
    </div>
  )

  // Geri sayım
  if (phase === 'countdown') return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background: inst?.bg || '#111', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ fontSize:80, marginBottom:16 }}>{inst?.emoji}</div>
      <div style={{ color:'white', fontSize:22, fontWeight:900, marginBottom:8 }}>{inst?.name}</div>
      <div style={{ color:'rgba(255,255,255,.5)', fontSize:14, marginBottom:48 }}>{visual?.desc}</div>
      <div style={{ color: inst?.color, fontSize:96, fontWeight:900, lineHeight:1 }}>
        {countdown === 0 ? 'BAŞLA!' : countdown}
      </div>
      <div style={{ color:'rgba(255,255,255,.3)', fontSize:13, marginTop:32 }}>
        Klavye: A S D F tuşlarını kullan
      </div>
    </div>
  )

  // Sonuç ekranı
  if (phase === 'result') return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif', background: inst?.bg || '#111' }}>
      <div style={{ background:'rgba(255,255,255,.08)', borderRadius:24, padding:'32px 24px', maxWidth:340, width:'100%', textAlign:'center', border:`1px solid ${inst?.color}44` }}>
        <div style={{ fontSize:56, marginBottom:8 }}>{inst?.emoji}</div>
        <div style={{ fontSize:72, fontWeight:900, color: rankColor[rank], marginBottom:4 }}>{rank}</div>
        <div style={{ color:'white', fontSize:18, fontWeight:900, marginBottom:20 }}>
          {rank==='S'?'Muhteşem!':rank==='A'?'Harika!':rank==='B'?'İyi iş!':rank==='C'?'Güzel deneme!':'Pratik yaparsan olacak!'}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
          {[
            { label:'Skor', value:scoreRef.current.toLocaleString() },
            { label:'Doğruluk', value:`%${accuracy}` },
            { label:'Max Combo', value:`x${maxCombo}` },
            { label:'İsabet', value:`${hitsRef.current}/${totalNotes}` },
          ].map((s,i) => (
            <div key={i} style={{ background:'rgba(255,255,255,.06)', borderRadius:12, padding:'10px 8px' }}>
              <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, marginBottom:4 }}>{s.label}</div>
              <div style={{ color:'white', fontSize:18, fontWeight:900 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background:`${inst?.color}20`, border:`1px solid ${inst?.color}44`, borderRadius:12, padding:'10px 14px', marginBottom:20, color:inst?.color, fontSize:13 }}>
          🎵 {inst?.name} ilgin kaydedildi! Veli raporunda görünecek.
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => { setPhase('select'); setSelectedInstrument(null) }}
            style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${inst?.color}44`, background:'transparent', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
            🔄 Tekrar
          </button>
          <button onClick={() => onFinish({ score:scoreRef.current, accuracy, rank, instrument:selectedInstrument })}
            style={{ flex:1, padding:12, borderRadius:12, border:'none', background: inst?.color, color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
            Bitir ✓
          </button>
        </div>
      </div>
    </div>
  )

  // Oyun ekranı
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background: inst?.bg || '#111', overflow:'hidden', fontFamily:'Nunito,sans-serif', userSelect:'none' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 16px', background:'rgba(0,0,0,.3)' }}>
        <div style={{ color:inst?.color, fontSize:13, fontWeight:700 }}>{inst?.emoji} {song?.name}</div>
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          {combo >= 3 && <div style={{ color:'#fbbf24', fontSize:12, fontWeight:800 }}>x{combo} COMBO!</div>}
          <div style={{ color:'white', fontSize:16, fontWeight:900 }}>{score.toLocaleString()}</div>
        </div>
      </div>

      {/* Tahta */}
      <div style={{ flex:1, display:'flex', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        <div ref={gameRef} style={{ width: BOARD_W, height:'100%', position:'relative', background:'rgba(0,0,0,.2)' }}>

          {/* Şerit çizgileri */}
          {[0,1,2,3].map(i => (
            <div key={i} style={{ position:'absolute', left: i * LANE_W, top:0, width:1, height:'100%', background:'rgba(255,255,255,.06)' }}/>
          ))}

          {/* Notalar */}
          {notes.filter(n => !n.miss).map(n => (
            <div key={n.id} style={{
              position:'absolute',
              left: n.lane * LANE_W + 8,
              top: n.y,
              width: LANE_W - 16,
              height: NOTE_H,
              borderRadius: 8,
              background: n.hit ? 'rgba(255,255,255,.1)' : inst?.noteColor,
              opacity: n.hit ? 0 : 1,
              boxShadow: n.hit ? 'none' : `0 0 12px ${inst?.noteColor}88`,
              transition: n.hit ? 'opacity 0.1s' : 'none',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:800, fontSize:13, color:'rgba(0,0,0,.6)',
            }}>
              {visual?.laneLabels[n.lane]}
            </div>
          ))}

          {/* Hit feedback */}
          {hitFeedback && (
            <div style={{
              position:'absolute',
              left: hitFeedback.lane * LANE_W,
              bottom: HIT_ZONE_Y + 40,
              width: LANE_W,
              textAlign:'center',
              color: '#fbbf24',
              fontSize:12, fontWeight:900,
              animation:'fadeUp .4s ease forwards',
              pointerEvents:'none'
            }}>
              {hitFeedback.text}
            </div>
          )}

          {/* Hit zone çizgisi */}
          <div style={{ position:'absolute', bottom: HIT_ZONE_Y - NOTE_H/2, left:0, right:0, height:2, background:`${inst?.color}88` }}/>

          {/* Lane butonları */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, display:'flex', height: HIT_ZONE_Y }}>
            {[0,1,2,3].map(i => (
              <div key={i} onPointerDown={() => hitLane(i)}
                style={{
                  flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                  background: laneFlash[i] ? `${inst?.color}60` : `${inst?.color}18`,
                  border:`2px solid ${inst?.color}${laneFlash[i]?'ff':'44'}`,
                  borderRadius: i===0?'8px 0 0 8px':i===3?'0 8px 8px 0':'0',
                  cursor:'pointer', transition:'background .05s',
                  flexDirection:'column', gap:4
                }}>
                <div style={{ fontSize:20 }}>{inst?.emoji}</div>
                <div style={{ color:inst?.color, fontSize:11, fontWeight:800 }}>{visual?.laneLabels[i]}</div>
                <div style={{ color:'rgba(255,255,255,.3)', fontSize:10 }}>{inst?.keys[i].toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeUp{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-20px)}}`}</style>
    </div>
  )
}
