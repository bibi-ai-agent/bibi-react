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
  { title:'Taşlar', icon:'♟️', msg:`Merhaba! Satranç öğrenmek çok eğlenceli!\n\nSatranç tahtası 8x8 = 64 kareden oluşur.\nHer oyuncunun 16 taşı var:\n\n♔ Şah — En değerli, 1 kare hareket eder\n♕ Vezir — En güçlü, her yöne hareket eder\n♖ Kale — Yatay ve dikey hareket eder\n♗ Fil — Çapraz hareket eder\n♘ At — L şeklinde, taşların üzerinden atlar\n♙ Piyon — Öne 1 kare, çapraz yer` },
  { title:'Amaç', icon:'🎯', msg:`Oyunun amacı rakibinin ŞAHI'nı MAT etmek!\n\n⚠️ Şah = Şahın tehdit altında olması\n🏆 Mat = Şahın kaçacak yeri kalmaması\n\nÖnemli kurallar:\n• Beyazlar her zaman ilk hamle yapar\n• Şahın üzerine giremezsin\n• Mat olunca oyun biter` },
  { title:'Taktik', icon:'💡', msg:`Başlangıç için altın kurallar:\n\n1 Merkezi kontrol et (e4 veya d4)\n2 Atları ve filleri çabuk çıkar\n3 Şahı güvene al\n4 Aynı taşı arka arkaya oynatma\n5 Taş kaybetmemeye dikkat et\n\nŞimdi pratik yapmaya hazır mısın?` },
]

const PRACTICE_POSITIONS = [
  { title:'Vezirle Mat', desc:'Beyaz vezirle siyah şahı mat et!', fen:'4k3/8/8/8/8/8/8/4K2Q w - - 0 1', hint:'Veziri e8 karesine taşı', bestTo:'e8', tip:'Vezir çok güçlü — şahı köşeye sıkıştırınca mat olur!' },
  { title:'Kaleyle Mat', desc:'Kaleyle mat pozisyonu!', fen:'8/8/8/8/8/8/R7/4K1k1 w - - 0 1', hint:'Kaleyi a8 karesine taşı', bestTo:'a8', tip:'Kale siyah şahı üst sıraya kapatır ve mat eder!' },
  { title:'Çatal Hamlesi', desc:'At iki taşa aynı anda saldırabilir!', fen:'r3k3/8/8/8/8/8/8/4K1N1 w - - 0 1', hint:'Atı f3 karesine taşı', bestTo:'f3', tip:'At L şeklinde hareket eder ve 2 taşa aynı anda saldırır!' },
  { title:'Piyon Terfisi', desc:'Piyon son sıraya ulaşırsa vezir olur!', fen:'8/4P3/8/8/8/8/8/4K2k w - - 0 1', hint:'Piyonu e8 karesine taşı', bestTo:'e8', tip:'Piyon son sıraya ulaşınca istediğin taşa dönüşür!' },
  { title:'Fil Diyagonali', desc:'Fil çapraz hareket eder, piyonu al!', fen:'7p/8/8/8/8/8/8/B3K3 w - - 0 1', hint:'Fili h8 karesine taşı', bestTo:'h8', tip:'Fil çapraz şeritte güçlüdür — uzun mesafelere ulaşır!' },
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
    for (const m of moves) { chess.move(m); const e = minimax(chess,depth-1,alpha,beta,false); chess.undo(); best=Math.max(best,e); alpha=Math.max(alpha,e); if(beta<=alpha)break }
    return best
  } else {
    let best = Infinity
    for (const m of moves) { chess.move(m); const e = minimax(chess,depth-1,alpha,beta,true); chess.undo(); best=Math.min(best,e); beta=Math.min(beta,e); if(beta<=alpha)break }
    return best
  }
}

function getBestMove(chess, depth) {
  const moves = [...chess.moves()]
  for (let i=moves.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[moves[i],moves[j]]=[moves[j],moves[i]]}
  let bestMove=moves[0], bestEval=-Infinity
  for (const m of moves) { chess.move(m); const e=minimax(chess,depth-1,-Infinity,Infinity,false); chess.undo(); if(e>bestEval){bestEval=e;bestMove=m} }
  return bestMove
}

const FILES = ['a','b','c','d','e','f','g','h']

function Board({ game, selected, validMoves, onClick, size }) {
  const sq = Math.floor(size / 8)
  const board = game.board()
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ display:'flex', width:sq*8+12, paddingLeft:14 }}>
        {FILES.map(f => <div key={f} style={{ width:sq, textAlign:'center', color:'rgba(255,255,255,.5)', fontSize:10, fontWeight:700 }}>{f}</div>)}
      </div>
      <div style={{ display:'flex' }}>
        <div style={{ display:'flex', flexDirection:'column', marginRight:2 }}>
          {[8,7,6,5,4,3,2,1].map(n => <div key={n} style={{ height:sq, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.5)', fontSize:10, fontWeight:700, width:12 }}>{n}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(8,${sq}px)`, border:'2px solid rgba(255,255,255,.3)', borderRadius:4, overflow:'hidden' }}>
          {board.map((row, ri) => row.map((piece, ci) => {
            const sqName = FILES[ci]+(8-ri)
            const isLight = (ri+ci)%2===0
            const isSel = selected===sqName
            const isVal = validMoves.includes(sqName)
            let bg = isLight?'#f0d9b5':'#b58863'
            if (isSel) bg='#f6f669'
            else if (isVal&&piece) bg='#cc0000'
            else if (isVal) bg=isLight?'#cdd16f':'#aaa23a'
            const isW = piece?.color==='w'
            const sym = piece ? PIECE_SYMBOLS[piece.color+piece.type] : ''
            return (
              <div key={sqName} onClick={() => onClick(ri,ci)}
                style={{ width:sq, height:sq, background:bg, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                {isVal&&!piece&&<div style={{ width:sq*0.28, height:sq*0.28, borderRadius:'50%', background:'rgba(0,0,0,.25)' }}/>}
                {sym&&<span style={{ fontSize:sq*0.72, lineHeight:1, userSelect:'none', color:isW?'#fff':'#000', textShadow:isW?'0 0 3px #000,1px 1px 2px #000':'0 0 3px #fff,0 0 2px rgba(255,255,255,.5)' }}>{sym}</span>}
              </div>
            )
          }))}
        </div>
      </div>
    </div>
  )
}

export default function ChessGame({ currentChild, onFinish }) {
  const age = currentChild.age || 9
  const levels = LEVELS[getSet(age)]

  // Mode states
  const [knowsChess, setKnowsChess] = useState(null)
  const [learnStep, setLearnStep] = useState(0)
  const [learnMessages, setLearnMessages] = useState([])
  const [learnInput, setLearnInput] = useState('')
  const [learnTyping, setLearnTyping] = useState(false)

  // Practice states
  const [practiceMode, setPracticeMode] = useState(false)
  const [practiceStep, setPracticeStep] = useState(0)
  const [practiceGame, setPracticeGame] = useState(null)
  const [practiceSelected, setPracticeSelected] = useState(null)
  const [practiceValidMoves, setPracticeValidMoves] = useState([])
  const [practiceDone, setPracticeDone] = useState(false)
  const [practiceMsg, setPracticeMsg] = useState('')

  // Game states
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [game, setGame] = useState(null)
  const [selected, setSelected] = useState(null)
  const [validMoves, setValidMoves] = useState([])
  const [status, setStatus] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [result, setResult] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [moveCount, setMoveCount] = useState(0)

  const boardSize = Math.min(window.innerWidth - 40, 340)

  async function askBibi(msg) {
    setLearnTyping(true)
    const msgs = [...learnMessages, { role:'user', text:msg }]
    setLearnMessages(msgs)
    setLearnInput('')
    try {
      const reply = await callAI(`Sen Bibi'sin, ${currentChild.name}'e satranç öğretiyorsun. Kısa, eğlenceli, Türkçe.`,
        msgs.map(m => ({ role:m.role==='user'?'user':'assistant', content:m.text })), 400)
      setLearnMessages(p => [...p, { role:'bibi', text:reply }])
    } catch { setLearnMessages(p => [...p, { role:'bibi', text:'Bir sorun oldu 😅' }]) }
    setLearnTyping(false)
  }

  function startPractice() {
    setPracticeMode(true)
    setPracticeStep(0)
    setPracticeGame(new Chess(PRACTICE_POSITIONS[0].fen))
    setPracticeDone(false)
    setPracticeMsg('')
    setPracticeSelected(null)
    setPracticeValidMoves([])
  }

  function handlePracticeClick(ri, ci) {
    if (practiceDone || !practiceGame) return
    const sqName = FILES[ci]+(8-ri)
    if (practiceSelected) {
      if (practiceValidMoves.includes(sqName)) {
        const g = new Chess(practiceGame.fen())
        try {
          g.move({ from:practiceSelected, to:sqName, promotion:'q' })
          setPracticeGame(g)
          setPracticeSelected(null)
          setPracticeValidMoves([])
          setPracticeDone(true)
          setPracticeMsg('🎉 Harika! ' + PRACTICE_POSITIONS[practiceStep].tip)
        } catch { setPracticeSelected(null); setPracticeValidMoves([]) }
      } else {
        const piece = practiceGame.get(sqName)
        if (piece&&piece.color==='w') { setPracticeSelected(sqName); setPracticeValidMoves(practiceGame.moves({square:sqName,verbose:true}).map(m=>m.to)) }
        else { setPracticeSelected(null); setPracticeValidMoves([]) }
      }
    } else {
      const piece = practiceGame.get(sqName)
      if (piece&&piece.color==='w') { setPracticeSelected(sqName); setPracticeValidMoves(practiceGame.moves({square:sqName,verbose:true}).map(m=>m.to)) }
    }
  }

  function nextPractice() {
    const next = practiceStep+1
    if (next >= PRACTICE_POSITIONS.length) { setPracticeMode(false); setKnowsChess(true) }
    else {
      setPracticeStep(next)
      setPracticeGame(new Chess(PRACTICE_POSITIONS[next].fen))
      setPracticeDone(false); setPracticeMsg(''); setPracticeSelected(null); setPracticeValidMoves([])
    }
  }

  function startGame(level) {
    setSelectedLevel(level); const g=new Chess(); setGame(g)
    setSelected(null); setValidMoves([]); setStatus('Senin sıran — Beyazları oynuyorsun ♙')
    setGameOver(false); setResult(null); setMoveCount(0)
  }

  function checkOver(g) {
    if (g.isCheckmate()) { const win=g.turn()==='b'; setResult(win?'win':'lose'); setStatus(win?'Tebrikler! 🏆':'AI kazandı! 🤖'); setGameOver(true); return true }
    if (g.isDraw()) { setResult('draw'); setStatus('Beraberlik! 🤝'); setGameOver(true); return true }
    if (g.isCheck()) setStatus('Şah! ⚠️'); else setStatus(g.turn()==='w'?'Senin sıran ♙':'AI düşünüyor...')
    return false
  }

  function handleGameClick(ri, ci) {
    if (!game||gameOver||thinking||game.turn()!=='w') return
    const sqName = FILES[ci]+(8-ri)
    if (selected) {
      if (validMoves.includes(sqName)) {
        const g=new Chess(game.fen())
        try {
          g.move({from:selected,to:sqName,promotion:'q'})
          setGame(g); setSelected(null); setValidMoves([]); setMoveCount(m=>m+1)
          if (checkOver(g)) return
          setThinking(true)
          setTimeout(() => {
            const ag=new Chess(g.fen())
            if (ag.turn()==='b') { const best=getBestMove(ag,selectedLevel.depth); if(best){ag.move(best);setGame(ag);setMoveCount(m=>m+1);checkOver(ag)} }
            setThinking(false)
          }, 400)
        } catch { setSelected(null); setValidMoves([]) }
      } else {
        const piece=game.get(sqName)
        if (piece&&piece.color==='w') { setSelected(sqName); setValidMoves(game.moves({square:sqName,verbose:true}).map(m=>m.to)) }
        else { setSelected(null); setValidMoves([]) }
      }
    } else {
      const piece=game.get(sqName)
      if (piece&&piece.color==='w') { setSelected(sqName); setValidMoves(game.moves({square:sqName,verbose:true}).map(m=>m.to)) }
    }
  }

  const dot = { width:8, height:8, borderRadius:'50%', background:'#4ade80', display:'block' }

  // ── 1. Biliyor musun? ──
  if (knowsChess === null) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:24, padding:'32px 24px', maxWidth:320, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:16 }}>♟️</div>
        <div style={{ color:'white', fontSize:19, fontWeight:900, marginBottom:8 }}>Satranç oynamayı biliyor musun?</div>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:24 }}>Dürüst olabilirsin, Bibi sana öğretir! 😊</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => { setKnowsChess(true); startPractice() }} style={{ padding:'15px 20px', borderRadius:14, border:'1.5px solid rgba(74,222,128,.4)', background:'rgba(74,222,128,.15)', color:'#4ade80', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>✅ Evet, biliyorum!</button>
          <button onClick={() => { setKnowsChess(false); setLearnMessages([{ role:'bibi', text:LEARN_STEPS[0].msg }]) }} style={{ padding:'15px 20px', borderRadius:14, border:'1.5px solid rgba(167,139,250,.4)', background:'rgba(167,139,250,.15)', color:'#a78bfa', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>📚 Öğrenmek istiyorum</button>
        </div>
      </div>
    </div>
  )

  // ── 2. Pratik modu — öğretici moddan ÖNCE kontrol et ──
  if (practiceMode) {
    const pos = PRACTICE_POSITIONS[practiceStep]
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'12px 16px', fontFamily:'Nunito,sans-serif' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ color:'#a78bfa', fontSize:12, fontWeight:700 }}>PRATİK {practiceStep+1}/{PRACTICE_POSITIONS.length}</div>
          <div style={{ display:'flex', gap:4 }}>
            {PRACTICE_POSITIONS.map((_,i) => <div key={i} style={{ width:20, height:4, borderRadius:2, background:i<=practiceStep?'#a78bfa':'rgba(255,255,255,.15)' }}/>)}
          </div>
        </div>
        <div style={{ background:'rgba(167,139,250,.12)', border:'1.5px solid rgba(167,139,250,.3)', borderRadius:12, padding:'10px 14px', marginBottom:10 }}>
          <div style={{ color:'#a78bfa', fontSize:14, fontWeight:800, marginBottom:3 }}>{pos.title}</div>
          <div style={{ color:'rgba(255,255,255,.6)', fontSize:12 }}>{pos.desc}</div>
          {!practiceDone && <div style={{ color:'rgba(255,255,255,.35)', fontSize:11, marginTop:4 }}>💡 İpucu: {pos.hint}</div>}
        </div>
        {practiceGame && (
          <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
            <Board game={practiceGame} selected={practiceSelected} validMoves={practiceValidMoves} onClick={handlePracticeClick} size={boardSize}/>
          </div>
        )}
        {practiceMsg
          ? <div style={{ background:'rgba(74,222,128,.12)', border:'1px solid rgba(74,222,128,.3)', borderRadius:12, padding:'12px 14px', marginBottom:12, color:'#4ade80', fontSize:13, lineHeight:1.5 }}>{practiceMsg}</div>
          : <div style={{ color:'rgba(255,255,255,.3)', fontSize:12, textAlign:'center', marginBottom:12 }}>Taşa bas → yeşil karelere oyna</div>
        }
        {practiceDone && (
          <button onClick={nextPractice} style={{ width:'100%', padding:13, borderRadius:12, border:'none', background:practiceStep<PRACTICE_POSITIONS.length-1?'#7C3AED':'#0D9B7E', color:'white', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
            {practiceStep < PRACTICE_POSITIONS.length-1 ? 'Sonraki Pozisyon →' : '🎮 Gerçek Oyuna Geç!'}
          </button>
        )}
      </div>
    )
  }

  // ── 3. Öğretici mod ──
  if (knowsChess === false) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex', gap:6, padding:'10px 14px' }}>
        {LEARN_STEPS.map((s,i) => (
          <div key={i} onClick={() => { setLearnStep(i); setLearnMessages([{ role:'bibi', text:s.msg }]) }}
            style={{ flex:1, padding:'7px 4px', borderRadius:10, background:learnStep===i?'rgba(167,139,250,.3)':'rgba(255,255,255,.06)', border:learnStep===i?'1.5px solid #a78bfa':'1.5px solid transparent', textAlign:'center', cursor:'pointer' }}>
            <div style={{ fontSize:14 }}>{s.icon}</div>
            <div style={{ color:learnStep===i?'#a78bfa':'rgba(255,255,255,.4)', fontSize:9, fontWeight:700, marginTop:2 }}>{s.title}</div>
          </div>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'0 14px 8px' }}>
        {learnMessages.map((m,i) => (
          <div key={i} style={{ display:'flex', marginBottom:10, justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
            {m.role==='bibi'
              ? <div style={{ maxWidth:'85%', background:'rgba(255,255,255,.9)', borderRadius:'4px 18px 18px 18px', padding:'11px 14px', color:'#1A2E2A', fontSize:13, lineHeight:1.6, whiteSpace:'pre-line' }}>{m.text}</div>
              : <div style={{ maxWidth:'75%', background:'linear-gradient(135deg,#7C3AED,#0D9B7E)', borderRadius:'18px 4px 18px 18px', padding:'11px 14px', color:'white', fontSize:13 }}>{m.text}</div>
            }
          </div>
        ))}
        {learnTyping && <div style={{ display:'flex', gap:5, padding:'12px 14px', background:'rgba(255,255,255,.1)', borderRadius:'4px 18px 18px 18px', width:'fit-content' }}>{[0,1,2].map(i=><span key={i} style={{...dot, animation:`dp 1.2s ease ${i*0.2}s infinite`}}/>)}</div>}
      </div>
      <div style={{ padding:'8px 14px 12px', background:'rgba(0,0,0,.3)' }}>
        {learnStep < LEARN_STEPS.length-1
          ? <button onClick={() => { const n=learnStep+1; setLearnStep(n); setLearnMessages([{ role:'bibi', text:LEARN_STEPS[n].msg }]) }} style={{ width:'100%', padding:11, borderRadius:12, border:'none', background:'#7C3AED', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', marginBottom:8 }}>Sonraki Konu →</button>
          : <button onClick={startPractice} style={{ width:'100%', padding:11, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', marginBottom:8 }}>🎮 Pratik Yap!</button>
        }
        <div style={{ display:'flex', gap:8 }}>
          <input value={learnInput} onChange={e=>setLearnInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&learnInput.trim()&&askBibi(learnInput)} placeholder="Bibi'ye soru sor..." style={{ flex:1, padding:'9px 13px', borderRadius:20, border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.08)', color:'white', fontSize:13, fontFamily:'Nunito,sans-serif' }}/>
          <button onClick={()=>learnInput.trim()&&askBibi(learnInput)} style={{ width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,.15)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
      <style>{'@keyframes dp{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}'}</style>
    </div>
  )

  // ── 3. Pratik modu ──
  if (practiceMode) {
    const pos = PRACTICE_POSITIONS[practiceStep]
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'12px 16px', fontFamily:'Nunito,sans-serif' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ color:'#a78bfa', fontSize:12, fontWeight:700 }}>PRATİK {practiceStep+1}/{PRACTICE_POSITIONS.length}</div>
          <div style={{ display:'flex', gap:4 }}>
            {PRACTICE_POSITIONS.map((_,i) => <div key={i} style={{ width:20, height:4, borderRadius:2, background:i<=practiceStep?'#a78bfa':'rgba(255,255,255,.15)' }}/>)}
          </div>
        </div>
        <div style={{ background:'rgba(167,139,250,.12)', border:'1.5px solid rgba(167,139,250,.3)', borderRadius:12, padding:'10px 14px', marginBottom:10 }}>
          <div style={{ color:'#a78bfa', fontSize:14, fontWeight:800, marginBottom:3 }}>{pos.title}</div>
          <div style={{ color:'rgba(255,255,255,.6)', fontSize:12 }}>{pos.desc}</div>
          {!practiceDone && <div style={{ color:'rgba(255,255,255,.35)', fontSize:11, marginTop:4 }}>💡 İpucu: {pos.hint}</div>}
        </div>
        {practiceGame && (
          <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
            <Board game={practiceGame} selected={practiceSelected} validMoves={practiceValidMoves} onClick={handlePracticeClick} size={boardSize}/>
          </div>
        )}
        {practiceMsg
          ? <div style={{ background:'rgba(74,222,128,.12)', border:'1px solid rgba(74,222,128,.3)', borderRadius:12, padding:'12px 14px', marginBottom:12, color:'#4ade80', fontSize:13, lineHeight:1.5 }}>{practiceMsg}</div>
          : <div style={{ color:'rgba(255,255,255,.3)', fontSize:12, textAlign:'center', marginBottom:12 }}>Taşa bas → yeşil karelere oyna</div>
        }
        {practiceDone && (
          <button onClick={nextPractice} style={{ width:'100%', padding:13, borderRadius:12, border:'none', background:practiceStep<PRACTICE_POSITIONS.length-1?'#7C3AED':'#0D9B7E', color:'white', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
            {practiceStep < PRACTICE_POSITIONS.length-1 ? 'Sonraki Pozisyon →' : '🎮 Gerçek Oyuna Geç!'}
          </button>
        )}
      </div>
    )
  }

  // ── 4. Seviye seçim ──
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

  // ── 5. Oyun bitti ──
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

  // ── 6. Oyun ──
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'8px', overflow:'hidden', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, padding:'0 8px' }}>
        <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700 }}>{selectedLevel.name.toUpperCase()}</div>
        <div style={{ color:thinking?'#fbbf24':game?.isCheck()?'#fca88a':'#4ade80', fontSize:12, fontWeight:700 }}>{status}</div>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:11 }}>{moveCount} hamle</div>
      </div>
      <div style={{ display:'flex', justifyContent:'center' }}>
        {game && <Board game={game} selected={selected} validMoves={validMoves} onClick={handleGameClick} size={boardSize}/>}
      </div>
      <div style={{ textAlign:'center', marginTop:8, color:'rgba(255,255,255,.3)', fontSize:11 }}>
        {thinking ? '⏳ AI düşünüyor...' : 'Taşa bas → yeşil karelere oyna'}
      </div>
    </div>
  )
}
