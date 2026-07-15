import { useState, useRef } from 'react'
import { sb } from '../lib/supabase'

const EMOJIS = ["👧","👦","🧒","👶","🦊","🐱","🐶","🐼","🐨","🦁","🐯","🐸","🦄","🐲","🤖","👾","🦸","🧙","🧚","🧜","🦋","🌸","⭐","🎨"]

export default function EditAvatarModal({ child, onClose, onSave }) {
  const [selectedEmoji, setSelectedEmoji] = useState(child.avatar_emoji || '👤')
  const [avatarPhoto, setAvatarPhoto] = useState(child.avatar_photo || null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setAvatarPhoto(ev.target.result); }
    reader.readAsDataURL(file)
  }

  async function save() {
    setLoading(true)
    const { data } = await sb.from('children').update({
      avatar_emoji: avatarPhoto ? null : selectedEmoji,
      avatar_photo: avatarPhoto || null
    }).eq('id', child.id).select().single()
    setLoading(false)
    if (data) onSave(data)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)', zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center', fontFamily:'Nunito,sans-serif' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:'100%', maxWidth:480, background:'white', borderRadius:'24px 24px 0 0', padding:'24px 20px 36px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:17, fontWeight:900, color:'#1A2E2A' }}>Avatar Değiştir</div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'#f3f4f6', border:'none', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>

        {/* Önizleme */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', overflow:'hidden', background:'#e8f7f3', border:'3px solid #0D9B7E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40 }}>
            {avatarPhoto
              ? <img src={avatarPhoto} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : selectedEmoji}
          </div>
        </div>

        {/* Fotoğraf yükle */}
        <button onClick={()=>fileRef.current.click()} style={{ width:'100%', padding:'11px', borderRadius:12, border:'1.5px solid #e0f0ec', background:'#f9fafb', fontSize:14, fontWeight:700, cursor:'pointer', color:'#7C3AED', marginBottom:14 }}>
          📷 Fotoğraf Yükle
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto}/>

        {/* Emoji seçici */}
        <div style={{ fontSize:12, fontWeight:700, color:'#6B7280', marginBottom:8 }}>VEYA EMOJİ SEÇ</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
          {EMOJIS.map(em => (
            <button key={em} onClick={()=>{setSelectedEmoji(em);setAvatarPhoto(null)}} style={{ width:44, height:44, borderRadius:10, border:`2px solid ${selectedEmoji===em&&!avatarPhoto?'#0D9B7E':'#e0f0ec'}`, background:selectedEmoji===em&&!avatarPhoto?'#e8f7f3':'white', fontSize:24, cursor:'pointer' }}>
              {em}
            </button>
          ))}
        </div>

        <button onClick={save} disabled={loading} style={{ width:'100%', padding:14, borderRadius:14, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, fontSize:15, cursor:'pointer' }}>
          {loading ? 'Kaydediliyor...' : 'Kaydet ✓'}
        </button>
      </div>
    </div>
  )
}
