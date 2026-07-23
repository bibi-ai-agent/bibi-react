import { useState, useCallback } from 'react'
import { Chess } from 'chess.js'

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

  function startGame(level) {
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
