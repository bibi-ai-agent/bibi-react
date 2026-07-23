import { useState, useCallback, useRef } from 'react'
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
  const moves = chess.moves()
  // Hamleleri karıştır — aynı skorlarda farklı hamle seçilsin
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [game, setGame] = useState(null)
  const [selected, setSelected] = useState(null)
  const [validMoves, setValidMoves] = useState([])
  const [status, setStatus] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [result, setResult] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [moveCount, setMoveCount] = useState(0)

  const [knowsChess, setKnowsChess] = useState(null) // null=sorulmadı, true=biliyor, false=bilmiyor
  const [learnStep, setLearnStep] = useState(0)
  const [learnMessages, setLearnMessages] = useState([])
  const [learnInput, setLearnInput] = useState('')
  const [learnTyping, setLearnTyping] = useState(false)

  const LEARN_STEPS = [
    { title:'Taşları Tanıyalım', icon:'♟️', msg:`Merhaba ${currentChild?.name}! Satranç öğrenmek çok eğlenceli! 🎉\n\nSatranç tahtası 8x8 = 64 kareden oluşur. Her oyuncunun 16 taşı var:\n\n♔ Şah — En değerli taş, 1 kare hareket eder\n♕ Vezir — En güçlü taş, her yöne hareket eder\n♖ Kale — Yatay ve dikey hareket eder\n♗ Fil — Çapraz hareket eder\n♘ At — L şeklinde atlar, taşların üzerinden geçer\n♙ Piyon — Öne 1 kare gider, çapraz yer` },
    { title:'Oyunun Amacı', icon:'🎯', msg:`Oyunun amacı rakibinin ŞAH'ını MAT etmek!\n\nŞah = Şahın tehdit altında olması ⚠️\nMat = Şahın kaçacak yeri kalmamış olması 🏆\n\nBazı önemli kurallar:\n• Beyazlar her zaman ilk hamleyi yapar\n• Şahın üzerine giremezsin\n• Mat olunca oyun biter` },
    { title:'İlk Hamle Taktikleri', icon:'💡', msg:`Başlangıç için altın kurallar:\n\n1️⃣ Merkezi kontrol et — e4 veya d4 hamlesi yap\n2️⃣ Atları ve filleri çabuk çıkar\n3️⃣ Şahı kale arkasına al (rok)\n4️⃣ Aynı taşı arka arkaya oynatma\n5️⃣ Taş kaybetmemeye dikkat et\n\nŞimdi AI ile pratik yapmaya hazır mısın? 🚀` },
  ]

  async function askBibi(userMsg) {
    setLearnTyping(true)
    const msgs = [...learnMessages, { role:'user', text:userMsg }]
    setLearnMessages(msgs)
    setLearnInput('')
    try {
      const reply = await callAI(
        `Sen Bibi'sin, ${currentChild?.name}'e satranç öğretiyorsun. Yaşı: ${currentChild?.age}. Kısa, eğlenceli, Türkçe cevap ver. Somut örnekler kullan.`,
        msgs.map(m => ({ role: m.role==='user'?'user':'assistant', content: m.text })),
        400
      )
      setLearnMessages(p => [...p, { role:'bibi', text:reply }])
    } catch { setLearnMessages(p => [...p, { role:'bibi', text:'Bir sorun oluştu 😅' }]) }
    setLearnTyping(false)
  }
    setSelectedLevel(level)
    const g = new Chess() // Chess.js default'u beyaz başlar
    if (g.turn() !== 'w') g.reset() // güvenlik
    setGame(g)
    setSelected(null); setValidMoves([])
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
        // AI hamlesi — thinking true olana kadar tıklamayı engelle
        setThinking(true)
        setStatus('AI düşünüyor... 🤔')
        setTimeout(() => {
          const ag = new Chess(g.fen())
          if (ag.turn() !== 'b') { setThinking(false); return } // güvenlik kontrolü
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
        {/* Sıra göstergesi */}
        <div style={{ display:'flex', width:actualSize, justifyContent:'space-between', marginBottom:4, padding:'0 2px' }}>
          {['a','b','c','d','e','f','g','h'].map(f => (
            <div key={f} style={{ width:sq, textAlign:'center', color:'rgba(255,255,255,.3)', fontSize:10 }}>{f}</div>
          ))}
        </div>
        <div style={{ display:'flex' }}>
          {/* Sol rakam */}
          <div style={{ display:'flex', flexDirection:'column', marginRight:4 }}>
            {[8,7,6,5,4,3,2,1].map(n => (
              <div key={n} style={{ height:sq, display:'flex', alignItems:'center', color:'rgba(255,255,255,.3)', fontSize:10 }}>{n}</div>
            ))}
          </div>
          <div style={{ width:actualSize, height:actualSize, display:'grid', gridTemplateColumns:`repeat(8,${sq}px)`, border:'3px solid rgba(255,255,255,.3)', borderRadius:6, overflow:'hidden' }}>
            {board.map((row, ri) => row.map((piece, ci) => {
              const sqName = files[ci] + (8 - ri)
              const isLight = (ri + ci) % 2 === 0
              const isSelected = selected === sqName
              const isValid = validMoves.includes(sqName)
              
              let bg = isLight ? '#f0d9b5' : '#b58863'
              if (isSelected) bg = '#f6f669'
              else if (isValid && piece) bg = '#cc0000'
              else if (isValid) bg = isLight ? '#cdd16f' : '#aaa23a'

              const isWhitePiece = piece?.color === 'w'
              const symbol = piece ? PIECE_SYMBOLS[piece.color + piece.type] : ''

              return (
                <div key={sqName} onClick={() => handleSquareClick(ri, ci)}
                  style={{ width:sq, height:sq, background:bg, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
                  {isValid && !piece && (
                    <div style={{ width:sq*0.28, height:sq*0.28, borderRadius:'50%', background:'rgba(0,0,0,.25)' }}/>
                  )}
                  {symbol && (
                    <span style={{
                      fontSize: sq * 0.72,
                      lineHeight: 1,
                      userSelect: 'none',
                      color: isWhitePiece ? '#fff' : '#000',
                      textShadow: isWhitePiece
                        ? '0 0 3px #000, 0 0 3px #000, 1px 1px 2px #000'
                        : '0 0 3px #fff, 0 0 2px rgba(255,255,255,.5)',
                      filter: isWhitePiece ? 'drop-shadow(0 1px 2px rgba(0,0,0,.8))' : 'drop-shadow(0 1px 2px rgba(255,255,255,.4))'
                    }}>
                      {symbol}
                    </span>
                  )}
                </div>
              )
            }))}
          </div>
        </div>
      </div>
    )
  }

  // Biliyor musun popup'ı
  if (knowsChess === null) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:24, padding:'32px 24px', maxWidth:320, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:16 }}>♟️</div>
        <div style={{ color:'white', fontSize:19, fontWeight:900, marginBottom:8 }}>Satranç oynamayı biliyor musun?</div>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:24 }}>Dürüst olabilirsin, Bibi sana öğretir! 😊</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => setKnowsChess(true)}
            style={{ padding:'15px 20px', borderRadius:14, border:'1.5px solid rgba(74,222,128,.4)', background:'rgba(74,222,128,.15)', color:'#4ade80', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
            ✅ Evet, biliyorum!
          </button>
          <button onClick={() => { setKnowsChess(false); setLearnMessages([{ role:'bibi', text: LEARN_STEPS[0].msg }]) }}
            style={{ padding:'15px 20px', borderRadius:14, border:'1.5px solid rgba(167,139,250,.4)', background:'rgba(167,139,250,.15)', color:'#a78bfa', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
            📚 Öğrenmek istiyorum
          </button>
        </div>
      </div>
    </div>
  )

  // Öğretici mod
  if (knowsChess === false) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', justifyContent:'center', gap:8, padding:'12px 16px' }}>
        {LEARN_STEPS.map((s, i) => (
          <div key={i} onClick={() => { setLearnStep(i); setLearnMessages([{ role:'bibi', text:s.msg }]) }}
            style={{ flex:1, padding:'8px 4px', borderRadius:10, background: learnStep===i?'rgba(167,139,250,.3)':'rgba(255,255,255,.06)', border: learnStep===i?'1.5px solid #a78bfa':'1.5px solid transparent', textAlign:'center', cursor:'pointer' }}>
            <div style={{ fontSize:16 }}>{s.icon}</div>
            <div style={{ color: learnStep===i?'#a78bfa':'rgba(255,255,255,.4)', fontSize:9, fontWeight:700, marginTop:2 }}>{s.title}</div>
          </div>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px 8px' }}>
        {learnMessages.map((m, i) => (
          <div key={i} style={{ display:'flex', marginBottom:10, justifyContent: m.role==='user'?'flex-end':'flex-start' }}>
            {m.role==='bibi' ? (
              <div style={{ maxWidth:'85%', background:'rgba(255,255,255,.9)', borderRadius:'4px 18px 18px 18px', padding:'11px 14px', color:'#1A2E2A', fontSize:13, lineHeight:1.6, whiteSpace:'pre-line' }}>{m.text}</div>
            ) : (
              <div style={{ maxWidth:'75%', background:'linear-gradient(135deg,#7C3AED,#0D9B7E)', borderRadius:'18px 4px 18px 18px', padding:'11px 14px', color:'white', fontSize:13, lineHeight:1.6 }}>{m.text}</div>
            )}
          </div>
        ))}
        {learnTyping && (
          <div style={{ display:'flex', gap:5, padding:'12px 14px', background:'rgba(255,255,255,.1)', borderRadius:'4px 18px 18px 18px', width:'fit-content' }}>
            {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', display:'block', animation:`dotPulse 1.2s ease ${i*0.2}s infinite` }}/>)}
          </div>
        )}
      </div>
      <div style={{ padding:'8px 16px 12px', background:'rgba(0,0,0,.3)' }}>
        {learnStep < LEARN_STEPS.length - 1 ? (
          <button onClick={() => { const next=learnStep+1; setLearnStep(next); setLearnMessages([{ role:'bibi', text:LEARN_STEPS[next].msg }]) }}
            style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:'#7C3AED', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', marginBottom:8 }}>
            Sonraki Konu →
          </button>
        ) : (
          <button onClick={() => setKnowsChess(true)}
            style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', marginBottom:8 }}>
            🎮 Oynamaya Hazırım!
          </button>
        )}
        <div style={{ display:'flex', gap:8 }}>
          <input value={learnInput} onChange={e=>setLearnInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&learnInput.trim()&&askBibi(learnInput)}
            placeholder="Bibi'ye soru sor..." style={{ flex:1, padding:'10px 14px', borderRadius:20, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.08)', color:'white', fontSize:13, fontFamily:'Nunito,sans-serif' }}/>
          <button onClick={()=>learnInput.trim()&&askBibi(learnInput)}
            style={{ width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,.15)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
      <style>{'@keyframes dotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}'}</style>
    </div>
  )

  if (!selectedLevel) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>♟️</div>
      <div style={{ color:'white', fontSize:18, fontWeight:900, marginBottom:6 }}>Satranç</div>
      <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginBottom:28 }}>Seviye seç</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:280 }}>
        {levels.map(l => (
          <button key={l.id} onClick={() => startGame(l)}
            style={{ padding:'16px 20px', borderRadius:14, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.06)', color:'white', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
            {l.id==='easy'?'🟢':l.id==='medium'?'🟡':'🔴'} {l.name}
          </button>
        ))}
      </div>
    </div>
  )

  if (gameOver) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:24, padding:'32px 24px', maxWidth:320, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:12 }}>{result==='win'?'🏆':result==='lose'?'🤖':'🤝'}</div>
        <div style={{ color:result==='win'?'#fbbf24':'white', fontSize:22, fontWeight:900, marginBottom:8 }}>{status}</div>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginBottom:20 }}>{moveCount} hamle yapıldı</div>
        {result!=='win' && (
          <div style={{ background:'rgba(74,222,128,.08)', border:'1px solid rgba(74,222,128,.2)', borderRadius:12, padding:'10px 14px', marginBottom:16, color:'#4ade80', fontSize:12 }}>
            💡 {result==='lose'?'Her yenilgi bir öğrenme fırsatı! Tekrar dene.':'Beraberlik de başarıdır!'}
          </div>
        )}
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <button onClick={() => startGame(selectedLevel)} style={{ flex:1, padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'transparent', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>🔄 Tekrar</button>
          <button onClick={() => setSelectedLevel(null)} style={{ flex:1, padding:12, borderRadius:12, border:'none', background:'#7C3AED', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Seviye</button>
        </div>
        <button onClick={() => onFinish(result)} style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Bitir ✓</button>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'8px', overflow:'hidden' }}>
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
