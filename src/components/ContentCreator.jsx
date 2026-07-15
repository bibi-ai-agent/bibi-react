import { useState } from 'react'
import { callAI } from '../lib/api'

export default function ContentCreator({ type, age, onClose, onDone }) {
  const [topic, setTopic] = useState('')
  const [subType, setSubType] = useState(type === 'pdf' ? 'Araştırma Ödevi' : '5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isPDF = type === 'pdf'
  const pdfTypes = ['Araştırma Ödevi','Kompozisyon','Hikaye','Özet','Deneme']
  const slideOptions = ['5','8','10']

  async function create() {
    if (!topic.trim()) { setError('Konu girin!'); return }
    setLoading(true)
    setError('')
    try {
      if (isPDF) {
        await onDone({ type:'pdf', topic, contentType: subType })
      } else {
        await onDone({ type:'presentation', topic, slideCount: parseInt(subType) })
      }
      onClose()
    } catch(e) {
      setError('Bir hata oluştu, tekrar dene.')
    }
    setLoading(false)
  }

  const inp = {
    width:'100%', padding:'13px 16px', borderRadius:12,
    border:'1.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.08)',
    color:'white', fontSize:15, fontFamily:'Nunito,sans-serif', boxSizing:'border-box'
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center', fontFamily:'Nunito,sans-serif' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ width:'100%', maxWidth:480, background:'linear-gradient(135deg,#1A2E2A,#243d38)', borderRadius:'24px 24px 0 0', padding:'24px 20px 36px', boxShadow:'0 -8px 40px rgba(0,0,0,.4)' }}>
        
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ color:'white', fontSize:17, fontWeight:900 }}>{isPDF ? '📄 PDF Oluştur' : '📊 Sunu Hazırla'}</div>
            <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginTop:3 }}>
              {age<=8 ? 'Eğlenceli format' : age<=12 ? 'Açıklayıcı format' : 'Profesyonel format'}
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,.1)', border:'none', cursor:'pointer', color:'white', fontSize:16 }}>✕</button>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, marginBottom:6, letterSpacing:1 }}>KONU</div>
          <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder={isPDF ? "DNA ve genetik, Osmanlı İmparatorluğu..." : "Güneş sistemi, Su döngüsü..."} style={inp}
            onKeyDown={e=>e.key==='Enter'&&create()}/>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, marginBottom:8, letterSpacing:1 }}>{isPDF ? 'İÇERİK TÜRÜ' : 'SLAYT SAYISI'}</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {(isPDF ? pdfTypes : slideOptions).map(opt => (
              <button key={opt} onClick={() => setSubType(opt)} style={{
                padding:'7px 14px', borderRadius:20, cursor:'pointer', fontFamily:'Nunito,sans-serif', fontSize:12, fontWeight:700,
                border:`1.5px solid ${subType===opt?'rgba(13,155,126,.5)':'rgba(255,255,255,.2)'}`,
                background: subType===opt ? 'rgba(13,155,126,.3)' : 'transparent',
                color: subType===opt ? '#4ade80' : 'rgba(255,255,255,.6)'
              }}>{isPDF ? opt : `${opt} Slayt`}</button>
            ))}
          </div>
        </div>

        {error && <div style={{ color:'#fca88a', fontSize:12, marginBottom:10 }}>{error}</div>}

        <button onClick={create} disabled={loading} style={{
          width:'100%', padding:14, borderRadius:14, border:'none',
          background: loading ? 'rgba(13,155,126,.4)' : 'linear-gradient(135deg,#0D9B7E,#7C3AED)',
          color:'white', fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:'Nunito,sans-serif'
        }}>
          {loading ? '⏳ Hazırlanıyor...' : (isPDF ? '📄 Oluştur' : '📊 Oluştur')}
        </button>
      </div>
    </div>
  )
}
