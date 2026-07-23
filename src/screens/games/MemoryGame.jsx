import { useState, useEffect } from 'react'

const EMOJI_SETS = {
  young:  ['🐱','🐶','🐸','🦊','🐼','🦁','🐯','🐨','🦄','🐲','🌸','⭐','🎨','🎮','🎵','🍕'],
  middle: ['🧠','🔬','📚','🎯','🚀','💡','🌍','⚡','🎭','🏆','💎','🔮','🎸','🌈','🦋','🎪'],
  teen:   ['♟️','🧩','🔐','💻','🎯','⚗️','📡','🛸','🎲','🎴','🔭','🧬','💠','🌐','⚙️','🎰'],
}

function generateCards(age) {
  const set = age <= 8 ? EMOJI_SETS.young : age <= 12 ? EMOJI_SETS.middle : EMOJI_SETS.teen
  const pairs = set.slice(0, 8)
  const cards = [...pairs, ...pairs].map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))
  return cards.sort(() => Math.random() - 0.5)
}

export default function MemoryGame({ currentChild, projectFriend, onFinish }) {
  const [cards, setCards] = useState(() => generateCards(currentChild.age || 9))
  const [selected, setSelected] = useState([])
  const [moves, setMoves] = useState(0)
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [locked, setLocked] = useState(false)
  const [startTime] = useState(Date.now())
  const [finished, setFinished] = useState(false)

  const TOTAL_PAIRS = 8

  function flipCard(card) {
    if (locked || card.flipped || card.matched) return
    const newCards = cards.map(c => c.id === card.id ? { ...c, flipped: true } : c)
    setCards(newCards)
    const newSelected = [...selected, card]
    setSelected(newSelected)

    if (newSelected.length === 2) {
      setMoves(m => m + 1)
      setLocked(true)
      const [a, b] = newSelected
      if (a.emoji === b.emoji) {
        setTimeout(() => {
          setCards(prev => prev.map(c => c.emoji === a.emoji ? { ...c, matched: true } : c))
          const newMatched = matchedPairs + 1
          setMatchedPairs(newMatched)
          setSelected([])
          setLocked(false)
          if (newMatched >= TOTAL_PAIRS) {
            const elapsed = Math.round((Date.now() - startTime) / 1000)
            setFinished(true)
            onFinish({ moves: moves + 1, time: elapsed })
          }
        }, 500)
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            (c.id === a.id || c.id === b.id) && !c.matched ? { ...c, flipped: false } : c
          ))
          setSelected([])
          setLocked(false)
        }, 1000)
      }
    }
  }

  if (finished) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:20 }}>
      <div style={{ fontSize:48, marginBottom:12 }}>⏳</div>
      <div style={{ color:'white', fontSize:18, fontWeight:900, marginBottom:4 }}>Tebrikler! Tamamladın!</div>
      <div style={{ color:'#4ade80', fontSize:14 }}>{moves} hamle • {Math.round((Date.now()-startTime)/1000)} saniye</div>
      <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginTop:8 }}>{projectFriend.name} devam ediyor...</div>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:700 }}>EŞLEŞTİRME</div>
        <div style={{ display:'flex', gap:16 }}>
          <div style={{ color:'#4ade80', fontSize:13, fontWeight:700 }}>{matchedPairs}/{TOTAL_PAIRS} çift</div>
          <div style={{ color:'#fbbf24', fontSize:13, fontWeight:700 }}>{moves} hamle</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, maxWidth:360, margin:'0 auto', width:'100%' }}>
        {cards.map(card => (
          <button key={card.id} onClick={() => flipCard(card)}
            style={{
              aspectRatio:'1', borderRadius:12,
              border: card.matched ? '2px solid #4ade80' : '1.5px solid rgba(255,255,255,.15)',
              background: card.matched ? 'rgba(74,222,128,.2)' : card.flipped ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)',
              fontSize: card.flipped || card.matched ? 28 : 0,
              cursor: card.matched || card.flipped ? 'default' : 'pointer',
              transition:'all .3s',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
            {(card.flipped || card.matched) ? card.emoji : ''}
          </button>
        ))}
      </div>

      <div style={{ textAlign:'center', marginTop:16, color:'rgba(255,255,255,.3)', fontSize:12 }}>
        Kartlara tıkla, eşleştir!
      </div>
    </div>
  )
}
