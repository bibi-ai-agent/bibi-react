import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import BibiFace from '../components/BibiFace'

export default function ChildSelectScreen({ onBack }) {
  const { currentUser, setCurrentChild, setScreen } = useApp()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [parentId, setParentId] = useState(null)

  useEffect(() => { loadChildren() }, [])

  async function loadChildren() {
    // Tüm velileri getir, çocukları bul
    const { data: parents } = await sb.from('parents').select('id, full_name')
    const ids = parents?.map(p => p.id) || []
    const { data } = await sb.from('children').select('*').in('parent_id', ids)
    setChildren(data || [])
    setLoading(false)
  }

  async function selectChild(child) {
    setCurrentChild(child)
    setScreen('childHome')
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#FFF9F0,#FEF3C7)', fontFamily:'Nunito,sans-serif', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,.06)', border:'none', borderRadius:'50%', width:38, height:38, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
        <div style={{ color:'rgba(0,0,0,.4)', fontSize:13, fontWeight:700 }}>Kim oynuyor?</div>
      </div>

      {/* Papağan */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 20px 16px' }}>
        <BibiFace expr="curious" size={80}/>
        <div style={{ color:'#1a1206', fontSize:20, fontWeight:900, marginTop:8 }}>Merhaba! 👋</div>
        <div style={{ color:'rgba(0,0,0,.4)', fontSize:13, marginTop:4 }}>Profilini seç</div>
      </div>

      {/* Çocuk listesi */}
      <div style={{ padding:'0 18px', display:'flex', flexDirection:'column', gap:10 }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'rgba(0,0,0,.3)' }}>Yükleniyor...</div>
        ) : children.map(child => (
          <button key={child.id} onClick={() => selectChild(child)}
            style={{ background:'white', border:'2px solid #FDE68A', borderRadius:18, padding:'16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', textAlign:'left', fontFamily:'Nunito,sans-serif', width:'100%', boxShadow:'0 2px 12px rgba(245,158,11,.1)' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'#FEF3C7', border:'2px solid #FDE68A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
              {child.gender === 'kız' ? '👧' : '👦'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:'#1a1206', fontSize:16, fontWeight:900 }}>{child.name}</div>
              <div style={{ color:'rgba(0,0,0,.4)', fontSize:12, marginTop:2 }}>{child.age} yaş</div>
              {child.streak_days > 0 && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:3, background:'#FEF3C7', borderRadius:8, padding:'2px 8px', marginTop:4 }}>
                  <span style={{ fontSize:12 }}>🔥</span>
                  <span style={{ color:'#D97706', fontSize:11, fontWeight:700 }}>{child.streak_days} gün</span>
                </div>
              )}
            </div>
            <div style={{ color:'#F59E0B', fontSize:22 }}>›</div>
          </button>
        ))}

        {children.length === 0 && !loading && (
          <div style={{ textAlign:'center', padding:'30px 20px', color:'rgba(0,0,0,.4)', fontSize:14 }}>
            Henüz çocuk profili oluşturulmamış.<br/>Veli girişi yaparak ekleyebilirsiniz.
          </div>
        )}
      </div>
    </div>
  )
}
