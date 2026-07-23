import { useState } from 'react'
import { Chess } from 'chess.js'
import { callAI } from '../../lib/api'

const LEVELS = {
  young:  [{ id:'easy', name:'Kolay', depth:1 }, { id:'medium', name:'Orta', depth:2 }, { id:'hard', name:'Zor', depth:3 }],
  middle: [{ id:'easy', name:'Başlangıç', depth:2 }, { id:'medium', name:'Orta', depth:3 }, { id:'hard', name:'İleri', depth:4 }],
  teen:   [{ id:'easy', name:'Amatör', depth:2 }, { id:'medium', name:'Yarı Pro', depth:3 }, { id:'hard', name:'Pro', depth:4 }],
}

const PIECE_SYMBOLS = {
  wk:'♔', wq:'♕', wr:'♖', wb:'♗', wn:'♘', wp:'♙',
  bk:'♚', bq:'♛', br:'♜', bb:'♝', bn:'♞', bp:'♟'
}

const LEARN_STEPS = [
  { title:'Taşlar', icon:'♟️', msg:`Merhaba! Satranç öğrenmek çok eğlenceli! 🎉\n\nSatranç tahtası 8x8 = 64 kareden oluşur.\nHer oyuncunun 16 taşı var:\n\n♔ Şah — En değerli, 1 kare hareket eder\n♕ Vezir — En güçlü, her yöne hareket eder\n♖ Kale — Yatay ve dikey hareket eder\n♗ Fil — Çapraz hareket eder\n♘ At — L şeklinde, taşların üzerinden atlar\n♙ Piyon — Öne 1 kare, çapraz yer` },
  { title:'Amaç', icon:'🎯', msg:`Oyunun amacı rakibinin ŞAHI'nı MAT etmek!\n\n⚠️ Şah = Şahın tehdit altında olması\n🏆 Mat = Şahın kaçacak yeri kalmaması\n\nÖnemli kurallar:\n• Beyazlar her zaman ilk hamle yapar\n• Şahın üzerine giremezsin\n• Mat olunca oyun biter` },
  { title:'Taktik', icon:'💡', msg:`Başlangıç için altın kurallar:\n\n1️⃣ Merkezi kontrol et (e4 veya d4)\n2️⃣ Atları ve filleri çabuk çıkar\n3️⃣ Şahı güvene al\n4️⃣ Aynı taşı arka arkaya oynatma\n5️⃣ Taş kaybetmemeye dikkat et\n\nŞimdi pratik yapmaya hazır mısın? 🚀` },
]

const PRACTICE_POSITIONS = [
  {
    title: 'Vezirle Mat',
    desc: 'Beyaz vezirle siyah şahı mat et! Vezir e7`ye git.',
    fen: '4k3/8/8/8/8/8/8/4K2Q w - - 0 1',
    hint: 'Veziri e7`ye taşı — Qe7#',
    bestMove: { from:'h1', to:'e8' },
    tip: 'Vezir çok güçlü! Şahı köşeye sıkıştırınca mat olur.'
  },
  {
    title: 'Kaleyle Mat',
    desc: 'Kaleyle mat pozisyonu. Kale a8`e git!',
    fen: '8/8/8/8/8/8/R7/4K1k1 w - - 0 1',
    hint: 'Kaleyi a8`e taşı — Ra8#',
    bestMove: { from:'a2', to:'a8' },
    tip: 'Kale, siyah şahı üst sıraya kapatır ve mat eder!'
  },
  {
    title: 'Çatal Hamlesi',
    desc: 'At iki taşa aynı anda saldırabilir! f3`e git.',
    fen: 'r3k3/8/8/8/8/8/8/4K1N1 w - - 0 1',
    hint: 'Atı f3`e taşı — hem kaleye hem şaha çatal!',
    bestMove: { from:'g1', to:'f3' },
    tip: 'At L şeklinde hareket eder ve aynı anda 2 taşa saldırabilir!'
  },
  {
    title: 'Fil Diyagonali',
    desc: 'Fil çapraz hareket eder. h7`deki piyonu ye!',
    fen: '7p/8/8/8/8/8/8/B3K3 w - - 0 1',
    hint: 'Fili h8`e taşı — Ah8',
    bestMove: { from:'a1', to:'h8' },
    tip: 'Fil çapraz şeritte güçlüdür — uzun mesafelere ulaşır!'
  },
  {
    title: 'Piyon Terfisi',
    desc: 'Piyon son sıraya ulaşırsa vezir olur! e8`e git.',
    fen: '8/4P3/8/8/8/8/8/4K2k w - - 0 1',
    hint: 'Piyonu e8`e taşı — vezir olur!',
    bestMove: { from:'e7', to:'e8' },
    tip: 'Piyon son sıraya ulaşınca istediğin taşa dönüşür!'
  },
]


function getSet(age) { return age <= 8 ? 'young' : age <= 12 ? 'middle' : 'teen' }

function evaluateBoard(chess) {
  const vals = { p:10, n:30, b:30, r:50, q:90, k:900 }
  let score = 0
  chess.board().flat().forEach(p => { if(p) score += p.color==='b' ? vals[p.type] : -vals[p.type] })
  return score
}

function minimax(chess, depth, alpha, beta, isMax) {
  if (depth === 0 || chess.isGameOver()) return evaluateBoard(chess)
  const moves = chess.moves()
  if (isMax) {
    let best = -Infinity
    for (const m of moves) {
      chess.move(m); const e = minimax(chess, depth-1, alpha, beta, false); chess.undo()
      best = Math.max(best, e); alpha = Math.max(alpha, e)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      chess.move(m); const e = minimax(chess, depth-1, alpha, beta, true); chess.undo()
      best = Math.min(best, e); beta = Math.min(beta, e)
      if (beta <= alpha) break
    }
    return best
  }
}

function getBestMove(chess, depth) {
  const moves = [...chess.moves()]
  for (let i = moves.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [moves[i], moves[j]] = [moves[j], moves[i]]
  }
  let bestMove = moves[0], bestEval = -Infinity
  for (const m of moves) {
    chess.move(m)
    const e = minimax(chess, depth-1, -Infinity, Infinity, false)
    chess.undo()
    if (e > bestEval) { bestEval = e; bestMove = m }
  }
  return bestMove
}

export default function ChessGame({ currentChild, onFinish }) {
  const age = currentChild.age || 9
  const levels = LEVELS[getSet(age)]

  const [knowsChess, setKnowsChess] = useState(null)
  const [practiceMode, setPracticeMode] = useState(false)
  const [practiceStep, setPracticeStep] = useState(0)
  const [practiceGame, setPracticeGame] = useState(null)
  const [practiceSelected, setPracticeSelected] = useState(null)
  const [practiceValidMoves, setPracticeValidMoves] = useState([])
  const [practiceDone, setPracticeDone] = useState(false)
  const [practiceMsg, setPracticeMsg] = useState('')
  const [learnStep, setLearnStep] = useState(0)
  const [learnMessages, setLearnMessages] = useState([])
  const [learnInput, setLearnInput] = useState('')
  const [learnTyping, setLearnTyping] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [game, setGame] = useState(null)
  const [selected, setSelected] = useState(null)
  const [validMoves, setValidMoves] = useState([])
  const [status, setStatus] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [result, setResult] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [moveCount, setMoveCount] = useState(0)

  async function askBibi(userMsg) {
    setLearnTyping(true)
    const msgs = [...learnMessages, { role:'user', text:userMsg }]
    setLearnMessages(msgs)
    setLearnInput('')
    try {
      const reply = await callAI(
        `Sen Bibi'sin, ${currentChild?.name}'e satranç öğretiyorsun. Yaşı: ${age}. Kısa, eğlenceli, Türkçe cevap ver.`,
        msgs.map(m => ({ role: m.role==='user'?'user':'assistant', content: m.text })), 400
      )
      setLearnMessages(p => [...p, { role:'bibi', text:reply }])
    } catch { setLearnMessages(p => [...p, { role:'bibi', text:'Bir sorun oluştu 😅' }]) }
    setLearnTyping(false)
  }

  function startGame(level) {
    setSelectedLevel(level)
    const g = new Chess()
    setGame(g); setSelected(null); setValidMoves([])
    setStatus('Senin sıran — Beyazları oynuyorsun ♙')
    setGameOver(false); setResult(null); setMoveCount(0)
  }

  function checkOver(g) {
    if (g.isCheckmate()) {
      const win = g.turn() === 'b'
      setResult(win ? 'win' : 'lose')
      setStatus(win ? 'Tebrikler, kazandın! 🏆' : 'AI kazandı! 🤖')
      setGameOver(true); return true
    }
    if (g.isDraw()) { setResult('draw'); setStatus('Beraberlik! 🤝'); setGameOver(true); return true }
    if (g.isCheck()) setStatus('Şah! ⚠️')
    else setStatus(g.turn() === 'w' ? 'Senin sıran ♙' : 'AI düşünüyor...')
    return false
  }

  function handleSquareClick(row, col) {
    if (!game || gameOver || thinking || game.turn() !== 'w') return
    const files = ['a','b','c','d','e','f','g','h']
    const sq = files[col] + (8 - row)
    if (selected) {
      if (validMoves.includes(sq)) {
        const g = new Chess(game.fen())
        const moveResult = g.move({ from: selected, to: sq, promotion: 'q' })
        if (!moveResult) { setSelected(null); setValidMoves([]); return }
        setGame(g); setSelected(null); setValidMoves([])
        setMoveCount(m => m+1)
        if (checkOver(g)) return
        setThinking(true)
        setStatus('AI düşünüyor... 🤔')
        setTimeout(() => {
          const ag = new Chess(g.fen())
          if (ag.turn() !== 'b') { setThinking(false); return }
          const best = getBestMove(ag, selectedLevel.depth)
          if (best) { ag.move(best); setGame(ag); setMoveCount(m => m+1); checkOver(ag) }
          setThinking(false)
        }, 400)
      } else {
        const piece = game.get(sq)
        if (piece && piece.color === 'w') {
          setSelected(sq)
          setValidMoves(game.moves({ square: sq, verbose: true }).map(m => m.to))
        } else { setSelected(null); setValidMoves([]) }
      }
    } else {
      const piece = game.get(sq)
      if (piece && piece.color === 'w') {
        setSelected(sq)
        setValidMoves(game.moves({ square: sq, verbose: true }).map(m => m.to))
      }
    }
  }

  function renderBoard() {
    if (!game) return null
    const board = game.board()
    const files = ['a','b','c','d','e','f','g','h']
    const size = Math.min(window.innerWidth - 16, window.innerHeight - 200)
    const sq = Math.floor(size / 8)
    const actualSize = sq * 8
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ display:'flex', width:actualSize, justifyContent:'space-around', marginBottom:2, padding:'0 2px' }}>
          {files.map(f => <div key={f} style={{ width:sq, textAlign:'center', color:'rgba(255,255,255,.3)', fontSize:10 }}>{f}</div>)}
        </div>
        <div style={{ display:'flex' }}>
          <div style={{ display:'flex', flexDirection:'column', marginRight:2 }}>
            {[8,7,6,5,4,3,2,1].map(n => <div key={n} style={{ height:sq, display:'flex', alignItems:'center', color:'rgba(255,255,255,.3)', fontSize:10, width:12 }}>{n}</div>)}
          </div>
          <div style={{ width:actualSize, height:actualSize, display:'grid', gridTemplateColumns:`repeat(8,${sq}px)`, border:'3px solid rgba(255,255,255,.3)', borderRadius:6, overflow:'hidden' }}>
            {board.map((row, ri) => row.map((piece, ci) => {
              const sqName = files[ci] + (8-ri)
              const isLight = (ri+ci)%2===0
              const isSelected = selected===sqName
              const isValid = validMoves.includes(sqName)
              let bg = isLight ? '#f0d9b5' : '#b58863'
              if (isSelected) bg = '#f6f669'
              else if (isValid && piece) bg = '#cc0000'
              else if (isValid) bg = isLight ? '#cdd16f' : '#aaa23a'
              const isWhitePiece = piece?.color==='w'
              const symbol = piece ? PIECE_SYMBOLS[piece.color+piece.type] : ''
              return (
                <div key={sqName} onClick={() => handleSquareClick(ri, ci)}
                  style={{ width:sq, height:sq, background:bg, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  {isValid && !piece && <div style={{ width:sq*0.28, height:sq*0.28, borderRadius:'50%', background:'rgba(0,0,0,.25)' }}/>}
                  {symbol && <span style={{ fontSize:sq*0.72, lineHeight:1, userSelect:'none', color:isWhitePiece?'#fff':'#000', textShadow:isWhitePiece?'0 0 3px #000,1px 1px 2px #000':'0 0 3px #fff', filter:isWhitePiece?'drop-shadow(0 1px 2px rgba(0,0,0,.8))':'drop-shadow(0 1px 2px rgba(255,255,255,.4))' }}>{symbol}</span>}
                </div>
              )
            }))}
          </div>
        </div>
      </div>
    )
  }


  // Pratik modu — 5 pozisyon
  if (practiceMode) {
    const pos = PRACTICE_POSITIONS[practiceStep]
    const files = ['a','b','c','d','e','f','g','h']
    const size = Math.min(window.innerWidth - 32, 320)
    const sq = Math.floor(size / 8)
    const board = practiceGame?.board() || []

    function handlePracticeClick(row, col) {
      if (practiceDone || !practiceGame) return
      const sqName = files[col] + (8-row)
      if (practiceSelected) {
        if (practiceValidMoves.includes(sqName)) {
          const g = new Chess(practiceGame.fen())
          try {
            g.move({ from: practiceSelected, to: sqName, promotion: 'q' })
            setPracticeGame(g)
            setPracticeSelected(null)
            setPracticeValidMoves([])
            setPracticeDone(true)
            if (g.isCheckmate() || sqName === pos.bestMove.to) {
              setPracticeMsg('🎉 Harika! ' + pos.tip)
            } else {
              setPracticeMsg('✅ İyi hamle! ' + pos.tip)
            }
          } catch { setPracticeSelected(null); setPracticeValidMoves([]) }
        } else {
          const piece = practiceGame.get(sqName)
          if (piece && piece.color === 'w') {
            setPracticeSelected(sqName)
            setPracticeValidMoves(practiceGame.moves({ square: sqName, verbose: true }).map(m => m.to))
          } else { setPracticeSelected(null); setPracticeValidMoves([]) }
        }
      } else {
        const piece = practiceGame.get(sqName)
        if (piece && piece.color === 'w') {
          setPracticeSelected(sqName)
          setPracticeValidMoves(practiceGame.moves({ square: sqName, verbose: true }).map(m => m.to))
        }
      }
    }

    function nextPractice() {
      const next = practiceStep + 1
      if (next >= PRACTICE_POSITIONS.length) {
        setPracticeMode(false)
        setKnowsChess(true)
      } else {
        setPracticeStep(next)
        setPracticeGame(new Chess(PRACTICE_POSITIONS[next].fen))
        setPracticeDone(false)
        setPracticeMsg('')
        setPracticeSelected(null)
        setPracticeValidMoves([])
      }
    }

    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'12px 16px', fontFamily:'Nunito,sans-serif' }}>
        {/* İlerleme */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ color:'#a78bfa', fontSize:12, fontWeight:700 }}>PRATİK {practiceStep+1}/{PRACTICE_POSITIONS.length}</div>
          <div style={{ display:'flex', gap:4 }}>
            {PRACTICE_POSITIONS.map((_,i) => <div key={i} style={{ width:20, height:4, borderRadius:2, background:i<=practiceStep?'#a78bfa':'rgba(255,255,255,.15)' }}/>)}
          </div>
        </div>

        {/* Pozisyon başlığı */}
        <div style={{ background:'rgba(167,139,250,.12)', border:'1.5px solid rgba(167,139,250,.3)', borderRadius:12, padding:'10px 14px', marginBottom:10 }}>
          <div style={{ color:'#a78bfa', fontSize:14, fontWeight:800, marginBottom:3 }}>{pos.title}</div>
          <div style={{ color:'rgba(255,255,255,.6)', fontSize:12 }}>{pos.desc}</div>
          {!practiceDone && <div style={{ color:'rgba(255,255,255,.35)', fontSize:11, marginTop:4 }}>💡 İpucu: {pos.hint}</div>}
        </div>

        {/* Tahta */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
          <div style={{ width:sq*8, height:sq*8, display:'grid', gridTemplateColumns:`repeat(8,${sq}px)`, border:'2px solid rgba(255,255,255,.2)', borderRadius:6, overflow:'hidden' }}>
            {board.map((row, ri) => row.map((piece, ci) => {
              const sqName = files[ci]+(8-ri)
              const isLight = (ri+ci)%2===0
              const isSel = practiceSelected===sqName
              const isVal = practiceValidMoves.includes(sqName)
              let bg = isLight?'#f0d9b5':'#b58863'
              if (isSel) bg='#f6f669'
              else if (isVal&&piece) bg='#cc0000'
              else if (isVal) bg=isLight?'#cdd16f':'#aaa23a'
              const isW = piece?.color==='w'
              const sym = piece ? PIECE_SYMBOLS[piece.color+piece.type] : ''
              return (
                <div key={sqName} onClick={() => handlePracticeClick(ri,ci)}
                  style={{ width:sq,height:sq,background:bg,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
                  {isVal&&!piece&&<div style={{ width:sq*0.28,height:sq*0.28,borderRadius:'50%',background:'rgba(0,0,0,.25)' }}/>}
                  {sym&&<span style={{ fontSize:sq*0.72,lineHeight:1,userSelect:'none',color:isW?'#fff':'#000',textShadow:isW?'0 0 3px #000,1px 1px 2px #000':'0 0 3px #fff' }}>{sym}</span>}
                </div>
              )
            }))}
          </div>
        </div>

        {/* Sonuç / İlerleme */}
        {practiceMsg ? (
          <div style={{ background:'rgba(74,222,128,.12)', border:'1px solid rgba(74,222,128,.3)', borderRadius:12, padding:'12px 14px', marginBottom:12, color:'#4ade80', fontSize:13, lineHeight:1.5 }}>
            {practiceMsg}
          </div>
        ) : (
          <div style={{ color:'rgba(255,255,255,.3)', fontSize:12, textAlign:'center', marginBottom:12 }}>Taşa bas → yeşil karelere oyna</div>
        )}

        {practiceDone && (
          <button onClick={nextPractice}
            style={{ width:'100%', padding:13, borderRadius:12, border:'none', background: practiceStep<PRACTICE_POSITIONS.length-1?'#7C3AED':'#0D9B7E', color:'white', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
            {practiceStep < PRACTICE_POSITIONS.length-1 ? 'Sonraki Pozisyon →' : '🎮 Gerçek Oyuna Geç!'}
          </button>
        )}
      </div>
    )
  }

  // 1. Biliyor musun popup'ı
  if (knowsChess === null) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:24, padding:'32px 24px', maxWidth:320, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:16 }}>♟️</div>
        <div style={{ color:'white', fontSize:19, fontWeight:900, marginBottom:8 }}>Satranç oynamayı biliyor musun?</div>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:24 }}>Dürüst olabilirsin, Bibi sana öğretir! 😊</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => setKnowsChess(true)} style={{ padding:'15px 20px', borderRadius:14, border:'1.5px solid rgba(74,222,128,.4)', background:'rgba(74,222,128,.15)', color:'#4ade80', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>✅ Evet, biliyorum!</button>
          <button onClick={() => { setKnowsChess(false); setLearnMessages([{ role:'bibi', text:LEARN_STEPS[0].msg }]) }} style={{ padding:'15px 20px', borderRadius:14, border:'1.5px solid rgba(167,139,250,.4)', background:'rgba(167,139,250,.15)', color:'#a78bfa', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>📚 Öğrenmek istiyorum</button>
        </div>
      </div>
    </div>
  )

  // 2. Öğretici mod
  if (knowsChess === false) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex', gap:6, padding:'10px 14px' }}>
        {LEARN_STEPS.map((s, i) => (
          <div key={i} onClick={() => { setLearnStep(i); setLearnMessages([{ role:'bibi', text:s.msg }]) }}
            style={{ flex:1, padding:'7px 4px', borderRadius:10, background:learnStep===i?'rgba(167,139,250,.3)':'rgba(255,255,255,.06)', border:learnStep===i?'1.5px solid #a78bfa':'1.5px solid transparent', textAlign:'center', cursor:'pointer' }}>
            <div style={{ fontSize:14 }}>{s.icon}</div>
            <div style={{ color:learnStep===i?'#a78bfa':'rgba(255,255,255,.4)', fontSize:9, fontWeight:700, marginTop:2 }}>{s.title}</div>
          </div>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'0 14px 8px' }}>
        {learnMessages.map((m, i) => (
          <div key={i} style={{ display:'flex', marginBottom:10, justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
            {m.role==='bibi'
              ? <div style={{ maxWidth:'85%', background:'rgba(255,255,255,.9)', borderRadius:'4px 18px 18px 18px', padding:'11px 14px', color:'#1A2E2A', fontSize:13, lineHeight:1.6, whiteSpace:'pre-line' }}>{m.text}</div>
              : <div style={{ maxWidth:'75%', background:'linear-gradient(135deg,#7C3AED,#0D9B7E)', borderRadius:'18px 4px 18px 18px', padding:'11px 14px', color:'white', fontSize:13, lineHeight:1.6 }}>{m.text}</div>
            }
          </div>
        ))}
        {learnTyping && <div style={{ display:'flex', gap:5, padding:'12px 14px', background:'rgba(255,255,255,.1)', borderRadius:'4px 18px 18px 18px', width:'fit-content' }}>{[0,1,2].map(i=><span key={i} style={{ width:7,height:7,borderRadius:'50%',background:'#4ade80',display:'block',animation:`dotPulse 1.2s ease ${i*0.2}s infinite` }}/>)}</div>}
      </div>
      <div style={{ padding:'8px 14px 12px', background:'rgba(0,0,0,.3)' }}>
        {learnStep < LEARN_STEPS.length-1
          ? <button onClick={() => { const n=learnStep+1; setLearnStep(n); setLearnMessages([{ role:'bibi', text:LEARN_STEPS[n].msg }]) }} style={{ width:'100%', padding:11, borderRadius:12, border:'none', background:'#7C3AED', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', marginBottom:8 }}>Sonraki Konu →</button>
          : <button onClick={() => { setPracticeMode(true); setPracticeStep(0); setPracticeGame(new Chess(PRACTICE_POSITIONS[0].fen)); setPracticeDone(false); setPracticeMsg('') }} style={{ width:'100%', padding:11, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', marginBottom:8 }}>🎮 Pratik Yap!</button>
        }
        <div style={{ display:'flex', gap:8 }}>
          <input value={learnInput} onChange={e=>setLearnInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&learnInput.trim()&&askBibi(learnInput)} placeholder="Bibi'ye soru sor..." style={{ flex:1, padding:'9px 13px', borderRadius:20, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.08)', color:'white', fontSize:13, fontFamily:'Nunito,sans-serif' }}/>
          <button onClick={()=>learnInput.trim()&&askBibi(learnInput)} style={{ width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,.15)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
      <style>{'@keyframes dotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}'}</style>
    </div>
  )

  // 3. Seviye seçim
  if (!selectedLevel) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>♟️</div>
      <div style={{ color:'white', fontSize:18, fontWeight:900, marginBottom:6 }}>Satranç</div>
      <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginBottom:28 }}>Seviye seç</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:280 }}>
        {levels.map(l => (
          <button key={l.id} onClick={() => startGame(l)} style={{ padding:'16px 20px', borderRadius:14, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.06)', color:'white', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
            {l.id==='easy'?'🟢':l.id==='medium'?'🟡':'🔴'} {l.name}
          </button>
        ))}
      </div>
      <button onClick={() => setKnowsChess(null)} style={{ marginTop:16, background:'none', border:'none', color:'rgba(255,255,255,.3)', fontSize:13, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>← Geri</button>
    </div>
  )

  // 4. Oyun bitti
  if (gameOver) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:24, padding:'32px 24px', maxWidth:320, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:12 }}>{result==='win'?'🏆':result==='lose'?'🤖':'🤝'}</div>
        <div style={{ color:result==='win'?'#fbbf24':'white', fontSize:22, fontWeight:900, marginBottom:8 }}>{status}</div>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginBottom:20 }}>{moveCount} hamle yapıldı</div>
        {result!=='win' && <div style={{ background:'rgba(74,222,128,.08)', border:'1px solid rgba(74,222,128,.2)', borderRadius:12, padding:'10px 14px', marginBottom:16, color:'#4ade80', fontSize:12 }}>💡 {result==='lose'?'Her yenilgi bir öğrenme fırsatı!':'Beraberlik de başarıdır!'}</div>}
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <button onClick={() => startGame(selectedLevel)} style={{ flex:1, padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'transparent', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>🔄 Tekrar</button>
          <button onClick={() => setSelectedLevel(null)} style={{ flex:1, padding:12, borderRadius:12, border:'none', background:'#7C3AED', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Seviye</button>
        </div>
        <button onClick={() => onFinish(result)} style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Bitir ✓</button>
      </div>
    </div>
  )

  // 5. Oyun
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'8px', overflow:'hidden', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, padding:'0 8px' }}>
        <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700 }}>{selectedLevel.name.toUpperCase()}</div>
        <div style={{ color:thinking?'#fbbf24':game?.isCheck()?'#fca88a':'#4ade80', fontSize:12, fontWeight:700 }}>{status}</div>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:11 }}>{moveCount} hamle</div>
      </div>
      {renderBoard()}
      <div style={{ textAlign:'center', marginTop:8, color:'rgba(255,255,255,.3)', fontSize:11 }}>
        {thinking ? '⏳ AI düşünüyor...' : 'Taşa bas → yeşil karelere oyna'}
      </div>
    </div>
  )
}
