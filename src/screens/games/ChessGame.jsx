import { useState, useEffect, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'

const LEVELS = {
  young:  [{ id:'easy', name:'Kolay', depth:1 }, { id:'medium', name:'Orta', depth:2 }, { id:'hard', name:'Zor', depth:3 }],
  middle: [{ id:'easy', name:'Başlangıç', depth:2 }, { id:'medium', name:'Orta', depth:3 }, { id:'hard', name:'İleri', depth:4 }],
  teen:   [{ id:'easy', name:'Amatör', depth:3 }, { id:'medium', name:'Yarı Pro', depth:4 }, { id:'hard', name:'Pro', depth:5 }],
}

function getSet(age) {
  return age <= 8 ? 'young' : age <= 12 ? 'middle' : 'teen'
}

// Minimax AI
function evaluateBoard(chess) {
  const pieceValues = { p:10, n:30, b:30, r:50, q:90, k:900 }
  let score = 0
  const board = chess.board()
  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue
      const val = pieceValues[piece.type] || 0
      score += piece.color === 'b' ? val : -val
    }
  }
  return score
}

function minimax(chess, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || chess.isGameOver()) return evaluateBoard(chess)
  const moves = chess.moves()
  if (isMaximizing) {
    let maxEval = -Infinity
    for (const move of moves) {
      chess.move(move)
      const eval_ = minimax(chess, depth-1, alpha, beta, false)
      chess.undo()
      maxEval = Math.max(maxEval, eval_)
      alpha = Math.max(alpha, eval_)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of moves) {
      chess.move(move)
      const eval_ = minimax(chess, depth-1, alpha, beta, true)
      chess.undo()
      minEval = Math.min(minEval, eval_)
      beta = Math.min(beta, eval_)
      if (beta <= alpha) break
    }
    return minEval
  }
}

function getBestMove(chess, depth) {
  const moves = chess.moves()
  let bestMove = null
  let bestEval = -Infinity
  for (const move of moves) {
    chess.move(move)
    const eval_ = minimax(chess, depth-1, -Infinity, Infinity, false)
    chess.undo()
    if (eval_ > bestEval) { bestEval = eval_; bestMove = move }
  }
  return bestMove
}

export default function ChessGame({ currentChild, onFinish }) {
  const age = currentChild.age || 9
  const levels = LEVELS[getSet(age)]
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [game, setGame] = useState(null)
  const [status, setStatus] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [result, setResult] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [moveCount, setMoveCount] = useState(0)

  function startGame(level) {
    setSelectedLevel(level)
    setGame(new Chess())
    setStatus('Senin sıran — Beyazları oynuyorsun ♟️')
    setGameOver(false)
    setResult(null)
    setMoveCount(0)
  }

  function checkGameOver(chess) {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'AI kazandı! 🤖' : 'Sen kazandın! 🏆'
      setResult(chess.turn() === 'w' ? 'lose' : 'win')
      setStatus(winner)
      setGameOver(true)
      return true
    }
    if (chess.isDraw()) {
      setStatus('Beraberlik! 🤝')
      setResult('draw')
      setGameOver(true)
      return true
    }
    if (chess.isCheck()) setStatus('Şah! Dikkat et! ⚠️')
    else setStatus('Senin sıran ♟️')
    return false
  }

  function onDrop(sourceSquare, targetSquare) {
    if (!game || gameOver || thinking || game.turn() !== 'w') return false
    const gameCopy = new Chess(game.fen())
    try {
      const move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
      if (!move) return false
      setGame(gameCopy)
      setMoveCount(m => m + 1)
      if (checkGameOver(gameCopy)) return true
      // AI hamlesi
      setThinking(true)
      setStatus('AI düşünüyor... 🤔')
      setTimeout(() => {
        const aiGame = new Chess(gameCopy.fen())
        const bestMove = getBestMove(aiGame, selectedLevel.depth)
        if (bestMove) {
          aiGame.move(bestMove)
          setGame(aiGame)
          setMoveCount(m => m + 1)
          checkGameOver(aiGame)
        }
        setThinking(false)
      }, 300)
      return true
    } catch { return false }
  }

  // Seviye seçim ekranı
  if (!selectedLevel) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>♟️</div>
      <div style={{ color:'white', fontSize:18, fontWeight:900, marginBottom:6 }}>Satranç</div>
      <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginBottom:28 }}>Seviye seç</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:300 }}>
        {levels.map(l => (
          <button key={l.id} onClick={() => startGame(l)}
            style={{ padding:'16px 20px', borderRadius:14, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.06)', color:'white', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
            {l.id === 'easy' ? '🟢' : l.id === 'medium' ? '🟡' : '🔴'} {l.name}
          </button>
        ))}
      </div>
    </div>
  )

  if (gameOver) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:24, padding:'32px 24px', maxWidth:320, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:12 }}>
          {result === 'win' ? '🏆' : result === 'lose' ? '🤖' : '🤝'}
        </div>
        <div style={{ color: result === 'win' ? '#fbbf24' : result === 'lose' ? 'white' : '#4ade80', fontSize:22, fontWeight:900, marginBottom:8 }}>
          {result === 'win' ? 'Tebrikler!' : result === 'lose' ? 'İyi deneme!' : 'Berabere!'}
        </div>
        <div style={{ color:'rgba(255,255,255,.6)', fontSize:14, marginBottom:8 }}>{status}</div>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginBottom:20 }}>{moveCount} hamle yapıldı</div>
        {result !== 'win' && (
          <div style={{ background:'rgba(74,222,128,.08)', border:'1px solid rgba(74,222,128,.2)', borderRadius:12, padding:'10px 14px', marginBottom:16, color:'#4ade80', fontSize:12, lineHeight:1.5 }}>
            💡 {result === 'lose' ? 'Her yenilgi bir öğrenme fırsatı! Tekrar dene.' : 'Beraberlik de başarıdır!'}
          </div>
        )}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => startGame(selectedLevel)}
            style={{ flex:1, padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'transparent', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>🔄 Tekrar</button>
          <button onClick={() => setSelectedLevel(null)}
            style={{ flex:1, padding:12, borderRadius:12, border:'none', background:'#7C3AED', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Seviye Değiştir</button>
        </div>
        <button onClick={() => onFinish(result)}
          style={{ width:'100%', marginTop:10, padding:12, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Bitir ✓</button>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'12px 16px', overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700 }}>
          {selectedLevel.name.toUpperCase()} SEVİYE
        </div>
        <div style={{ color: thinking ? '#fbbf24' : '#4ade80', fontSize:12, fontWeight:700 }}>{status}</div>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:11 }}>{moveCount} hamle</div>
      </div>
      <div style={{ maxWidth:360, margin:'0 auto', width:'100%' }}>
        {game && (
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardWidth={Math.min(360, window.innerWidth - 32)}
            customBoardStyle={{ borderRadius: 8, overflow: 'hidden' }}
            customDarkSquareStyle={{ backgroundColor: '#0D9B7E' }}
            customLightSquareStyle={{ backgroundColor: '#e8f7f3' }}
            arePiecesDraggable={!thinking && !gameOver}
          />
        )}
      </div>
      <div style={{ textAlign:'center', marginTop:12, color:'rgba(255,255,255,.3)', fontSize:11 }}>
        Taşı sürükleyerek hamle yap
      </div>
    </div>
  )
}
