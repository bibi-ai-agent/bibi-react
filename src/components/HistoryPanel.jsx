import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

export default function HistoryPanel({ child, onClose, onLoadSession }) {
  const [sessions, setSessions] = useState([])
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)

    // Sohbetleri ilk mesajıyla getir
    const { data: sess } = await sb.from('sessions')
      .select('id,started_at,duration_mins,message_count,pinned')
      .eq('child_id', child.id)
      .gt('message_count', 0)
      .order('started_at', { ascending: false })
      .limit(20)

    if (sess?.length) {
      const ids = sess.map(s => s.id)
      const { data: msgs } = await sb.from('messages')
        .select('session_id,content')
        .in('session_id', ids)
        .eq('role', 'user')
        .order('created_at', { ascending: true })

      const firstMsg = {}
      msgs?.forEach(m => { if (!firstMsg[m.session_id]) firstMsg[m.session_id] = m.content })
      setSessions(sess.map(s => ({ ...s, firstMsg: firstMsg[s.id] || 'Sohbet' })))
    } else {
      setSessions([])
    }

    // Assets (görseller, sunular, PDF'ler)
    const { data: ast, error: astErr } = await sb.from('chat_assets')
      .select('*')
      .eq('child_id', child.id)
      .order('created_at', { ascending: false })
      .limit(20)
    console.log('Assets:', ast, 'Error:', astErr)
    setAssets(ast || [])

    setLoading(false)
  }

  async function pinSession(id, currentPinned) {
    await sb.from('sessions').update({ pinned: !currentPinned }).eq('id', id)
    loadAll()
  }

  async function deleteSession(id) {
    if (!window.confirm('Bu sohbeti silmek istiyor musun?')) return
    await sb.from('sessions').delete().eq('id', id)
    loadAll()
  }

  const typeLabel = { image:'🖼️ Görsel', presentation:'📊 Sunu', pdf:'📄 PDF' }

  return (
    <div style={{ position:'fixed', left:0, top:0, bottom:0, width:300, background:'rgba(10,20,18,.97)', backdropFilter:'blur(16px)', zIndex:20, display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>
      
      {/* Header */}
      <div style={{ padding:'16px 14px 12px', borderBottom:'1px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ color:'white', fontSize:15, fontWeight:900 }}>Sohbet Geçmişi</div>
        <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,.1)', border:'none', cursor:'pointer', color:'white', fontSize:14 }}>✕</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
        {loading ? (
          <div style={{ color:'rgba(255,255,255,.3)', fontSize:13, textAlign:'center', padding:20 }}>Yükleniyor...</div>
        ) : (
          <>
            {/* Sohbetler */}
            <div style={{ color:'rgba(255,255,255,.35)', fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>SOHBETLER</div>
            
            {sessions.length === 0
              ? <div style={{ color:'rgba(255,255,255,.25)', fontSize:13, textAlign:'center', padding:'16px 0' }}>Henüz sohbet yok</div>
              : sessions.map(s => (
                <div key={s.id} style={{ background:'rgba(255,255,255,.05)', borderRadius:10, padding:'10px 12px', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <div onClick={() => onLoadSession(s.id)} style={{ flex:1, cursor:'pointer' }}>
                      <div style={{ color:'white', fontSize:13, fontWeight:700, lineHeight:1.3 }}>
                        {s.firstMsg?.slice(0, 45)}{s.firstMsg?.length > 45 ? '...' : ''}
                      </div>
                      <div style={{ color:'rgba(255,255,255,.3)', fontSize:10, marginTop:3 }}>
                        {new Date(s.started_at).toLocaleDateString('tr-TR', {day:'numeric', month:'short'})} • {s.message_count||0} mesaj
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      <button onClick={() => pinSession(s.id, s.pinned)} title={s.pinned?"Sabitlendi":"Sabitle"} style={{ width:24, height:24, borderRadius:6, background:s.pinned?'rgba(13,155,126,.3)':'rgba(255,255,255,.08)', border:s.pinned?'1px solid #4ade80':'none', cursor:'pointer', color:s.pinned?'#4ade80':'rgba(255,255,255,.5)', fontSize:11 }}>📌</button>
                      <button onClick={() => deleteSession(s.id)} title="Sil" style={{ width:24, height:24, borderRadius:6, background:'rgba(239,68,68,.15)', border:'none', cursor:'pointer', color:'#fca5a5', fontSize:11 }}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))
            }

            {/* Ekler */}
            {assets.length > 0 && (
              <>
                <div style={{ color:'rgba(255,255,255,.35)', fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', margin:'16px 0 8px' }}>EKLENTİLER</div>
                {assets.map(a => (
                  <div key={a.id} style={{ background:'rgba(255,255,255,.05)', borderRadius:10, padding:'10px 12px', marginBottom:6, display:'flex', alignItems:'center', gap:10 }}>
                    {a.type === 'image' && a.url && (
                      <img src={a.url} style={{ width:40, height:40, borderRadius:6, objectFit:'cover', flexShrink:0 }}/>
                    )}
                    {a.type !== 'image' && (
                      <div style={{ width:40, height:40, borderRadius:6, background:'rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                        {a.type==='presentation'?'📊':'📄'}
                      </div>
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:'rgba(255,255,255,.5)', fontSize:10 }}>{typeLabel[a.type]||a.type}</div>
                      <div style={{ color:'white', fontSize:12, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.title||'İsimsiz'}</div>
                    </div>
                    {a.type === 'image' && a.url && (
                      <a href={a.url} download="bibi-gorsel.jpg" target="_blank" style={{ width:28, height:28, borderRadius:6, background:'rgba(13,155,126,.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#4ade80', fontSize:13, textDecoration:'none' }}>⬇️</a>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
