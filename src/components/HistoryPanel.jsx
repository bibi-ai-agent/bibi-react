import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const TOPIC_COLORS = {
  matematik:  { bg: 'rgba(37,99,235,.15)',  border: 'rgba(37,99,235,.4)',  label: '🔢 Matematik' },
  fen:        { bg: 'rgba(16,185,129,.15)', border: 'rgba(16,185,129,.4)', label: '🔬 Fen' },
  tarih:      { bg: 'rgba(245,158,11,.15)', border: 'rgba(245,158,11,.4)', label: '📜 Tarih' },
  dil:        { bg: 'rgba(139,92,246,.15)', border: 'rgba(139,92,246,.4)', label: '📝 Dil' },
  sanat:      { bg: 'rgba(236,72,153,.15)', border: 'rgba(236,72,153,.4)', label: '🎨 Sanat' },
  odev:       { bg: 'rgba(239,68,68,.15)',  border: 'rgba(239,68,68,.4)',  label: '📚 Ödev' },
  gunluk:     { bg: 'rgba(107,114,128,.15)',border: 'rgba(107,114,128,.4)',label: '💬 Günlük' },
}

function moodEmoji(score) {
  if (!score) return '😐'
  if (score >= 8) return '😄'
  if (score >= 6) return '🙂'
  if (score >= 4) return '😐'
  return '😔'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000 / 60 / 60 / 24)
  if (diff === 0) return 'Bugün'
  if (diff === 1) return 'Dün'
  if (diff < 7) return diff + ' gün önce'
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function formatDuration(secs) {
  if (!secs) return ''
  if (secs < 60) return secs + ' sn'
  return Math.round(secs / 60) + ' dk'
}

function groupSessions(sessions) {
  const now = new Date()
  const groups = { 'Bugün': [], 'Bu Hafta': [], 'Bu Ay': [], 'Daha Eski': [] }
  sessions.forEach(function(s) {
    const d = new Date(s.started_at)
    const diff = Math.floor((now - d) / 1000 / 60 / 60 / 24)
    if (diff === 0) groups['Bugün'].push(s)
    else if (diff <= 7) groups['Bu Hafta'].push(s)
    else if (diff <= 30) groups['Bu Ay'].push(s)
    else groups['Daha Eski'].push(s)
  })
  return groups
}

export default function HistoryPanel({ child, onClose, onLoadSession }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTopic, setFilterTopic] = useState('tumu')

  useEffect(function() { loadSessions() }, [])

  async function loadSessions() {
    setLoading(true)
    const { data } = await sb
      .from('sessions')
      .select('id, started_at, ended_at, title, summary, topic_tags, mood_score, duration_seconds, message_count')
      .eq('child_id', child.id)
      .order('started_at', { ascending: false })
      .limit(50)
    setSessions(data || [])
    setLoading(false)
  }

  const filtered = sessions.filter(function(s) {
    const matchSearch = !search ||
      (s.title && s.title.toLowerCase().includes(search.toLowerCase())) ||
      (s.summary && s.summary.toLowerCase().includes(search.toLowerCase()))
    const matchTopic = filterTopic === 'tumu' ||
      (s.topic_tags && s.topic_tags.includes(filterTopic))
    return matchSearch && matchTopic
  })

  const grouped = groupSessions(filtered)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)', zIndex:150, display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1A2E2A,#243d38)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' }}>Sohbet Geçmişi</div>
          <div style={{ color:'white', fontSize:17, fontWeight:900 }}>{child.name}</div>
        </div>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,.1)', border:'1.5px solid rgba(255,255,255,.15)', borderRadius:20, padding:'8px 14px', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>✕ Kapat</button>
      </div>

      {/* Arama */}
      <div style={{ padding:'12px 16px', background:'rgba(0,0,0,.2)' }}>
        <input
          value={search}
          onChange={function(e) { setSearch(e.target.value) }}
          placeholder="Sohbetlerde ara..."
          style={{ width:'100%', padding:'10px 14px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.08)', color:'white', fontSize:13, fontFamily:'Nunito,sans-serif', boxSizing:'border-box', outline:'none' }}
        />
      </div>

      {/* Konu Filtresi */}
      <div style={{ padding:'0 16px 12px', display:'flex', gap:6, overflowX:'auto', background:'rgba(0,0,0,.2)' }}>
        {['tumu', 'matematik', 'fen', 'tarih', 'dil', 'sanat', 'odev', 'gunluk'].map(function(t) {
          const info = TOPIC_COLORS[t]
          const active = filterTopic === t
          return (
            <button key={t} onClick={function() { setFilterTopic(t) }}
              style={{ flexShrink:0, padding:'5px 12px', borderRadius:20, border:'1.5px solid ' + (active ? '#0D9B7E' : 'rgba(255,255,255,.15)'), background: active ? 'rgba(13,155,126,.2)' : 'transparent', color: active ? '#4ade80' : 'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
              {t === 'tumu' ? '📋 Tümü' : (info ? info.label : t)}
            </button>
          )
        })}
      </div>

      {/* Liste */}
      <div style={{ flex:1, overflowY:'auto', padding:'8px 16px 20px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,.3)' }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,.3)' }}>Sohbet bulunamadı</div>
        ) : (
          Object.entries(grouped).map(function([group, items]) {
            if (items.length === 0) return null
            return (
              <div key={group}>
                <div style={{ color:'rgba(255,255,255,.35)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', padding:'12px 0 6px' }}>{group}</div>
                {items.map(function(s) {
                  return (
                    <div key={s.id} onClick={function() { onLoadSession(s.id) }}
                      style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'14px', marginBottom:8, cursor:'pointer', transition:'background .15s' }}
                      onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,.1)' }}
                      onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,.05)' }}>

                      {/* Üst satır */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                        <div style={{ color:'white', fontSize:13, fontWeight:800, flex:1, marginRight:8 }}>
                          {s.title || 'Sohbet'}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                          <span style={{ fontSize:16 }}>{moodEmoji(s.mood_score)}</span>
                          <span style={{ color:'rgba(255,255,255,.35)', fontSize:11 }}>{formatDate(s.started_at)}</span>
                        </div>
                      </div>

                      {/* Özet */}
                      {s.summary && (
                        <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, lineHeight:1.5, marginBottom:8 }}>
                          {s.summary.slice(0, 100)}{s.summary.length > 100 ? '...' : ''}
                        </div>
                      )}

                      {/* Alt satır: etiketler + istatistikler */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          {(s.topic_tags || []).slice(0, 3).map(function(tag) {
                            const info = TOPIC_COLORS[tag]
                            if (!info) return null
                            return (
                              <span key={tag} style={{ padding:'2px 8px', borderRadius:8, background: info.bg, border:'1px solid ' + info.border, color:'white', fontSize:10, fontWeight:700 }}>
                                {info.label}
                              </span>
                            )
                          })}
                        </div>
                        <div style={{ display:'flex', gap:8, color:'rgba(255,255,255,.3)', fontSize:11 }}>
                          {s.message_count > 0 && <span>{s.message_count} mesaj</span>}
                          {s.duration_seconds > 0 && <span>{formatDuration(s.duration_seconds)}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
