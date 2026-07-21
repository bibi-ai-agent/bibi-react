import { useState, useRef, useEffect } from 'react'
import { sb } from '../lib/supabase'

const EMOJIS = ["👧","👦","🧒","👶","🦊","🐱","🐶","🐼","🐨","🦁","🐯","🐸","🦄","🐲","🤖","👾","🦸","🧙","🧚","🧜","🦋","🌸","⭐","🎨"]

export default function EditAvatarModal({ child, onClose, onSave }) {
  const [selectedEmoji, setSelectedEmoji] = useState(child.avatar_emoji || '👤')
  const [avatarPhoto, setAvatarPhoto] = useState(child.avatar_photo || null)
  const [loading, setLoading] = useState(false)
  const [cropMode, setCropMode] = useState(false)
  const [rawImage, setRawImage] = useState(null)
  const [cropStart, setCropStart] = useState(null)
  const [cropBox, setCropBox] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()
  const canvasRef = useRef()
  const imgRef = useRef()
  const containerRef = useRef()

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setRawImage(ev.target.result)
      setCropBox(null)
      setCropMode(true)
    }
    reader.readAsDataURL(file)
  }

  function getRelativePos(e, el) {
    const rect = el.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: Math.max(0, Math.min(clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(clientY - rect.top, rect.height))
    }
  }

  function onMouseDown(e) {
    e.preventDefault()
    const pos = getRelativePos(e, imgRef.current)
    setCropStart(pos)
    setCropBox({ x: pos.x, y: pos.y, w: 0, h: 0 })
    setDragging(true)
  }

  function onMouseMove(e) {
    if (!dragging || !cropStart) return
    e.preventDefault()
    const pos = getRelativePos(e, imgRef.current)
    const size = Math.min(Math.abs(pos.x - cropStart.x), Math.abs(pos.y - cropStart.y))
    setCropBox({
      x: pos.x < cropStart.x ? cropStart.x - size : cropStart.x,
      y: pos.y < cropStart.y ? cropStart.y - size : cropStart.y,
      w: size, h: size
    })
  }

  function onMouseUp(e) {
    setDragging(false)
  }

  function applyCrop() {
    if (!cropBox || cropBox.w < 10) return
    const img = imgRef.current
    const rect = img.getBoundingClientRect()
    const scaleX = img.naturalWidth / rect.width
    const scaleY = img.naturalHeight / rect.height
    const canvas = document.createElement('canvas')
    canvas.width = 300; canvas.height = 300
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img,
      cropBox.x * scaleX, cropBox.y * scaleY,
      cropBox.w * scaleX, cropBox.h * scaleY,
      0, 0, 300, 300
    )
    setAvatarPhoto(canvas.toDataURL('image/jpeg', 0.85))
    setCropMode(false)
    setRawImage(null)
    setCropBox(null)
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

  if (cropMode) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.9)', zIndex:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'Nunito,sans-serif', padding:20 }}>
      <div style={{ color:'white', fontSize:15, fontWeight:700, marginBottom:12 }}>✂️ Kırp — Kare alan seç</div>
      <div style={{ position:'relative', display:'inline-block', cursor:'crosshair', userSelect:'none', maxWidth:'100%', maxHeight:'70vh' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
        onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={onMouseUp}>
        <img ref={imgRef} src={rawImage} style={{ display:'block', maxWidth:'100%', maxHeight:'65vh', userSelect:'none', pointerEvents:'none' }}/>
        {cropBox && cropBox.w > 0 && (
          <div style={{
            position:'absolute', left:cropBox.x, top:cropBox.y, width:cropBox.w, height:cropBox.h,
            border:'2px solid #4ade80', background:'rgba(74,222,128,.15)', pointerEvents:'none'
          }}/>
        )}
      </div>
      <div style={{ display:'flex', gap:10, marginTop:16 }}>
        <button onClick={()=>{setCropMode(false);setRawImage(null)}} style={{ padding:'10px 20px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'transparent', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>İptal</button>
        <button onClick={applyCrop} disabled={!cropBox||cropBox.w<10} style={{ padding:'10px 24px', borderRadius:12, border:'none', background:!cropBox||cropBox.w<10?'#374151':'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Kırp ✓</button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)', zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center', fontFamily:'Nunito,sans-serif' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:'100%', maxWidth:480, background:'white', borderRadius:'24px 24px 0 0', padding:'24px 20px 36px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:17, fontWeight:900, color:'#1A2E2A' }}>Avatar Değiştir</div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'#f3f4f6', border:'none', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>

        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', overflow:'hidden', background:'#e8f7f3', border:'3px solid #0D9B7E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40 }}>
            {avatarPhoto ? <img src={avatarPhoto} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : selectedEmoji}
          </div>
        </div>

        <button onClick={()=>fileRef.current.click()} style={{ width:'100%', padding:'11px', borderRadius:12, border:'1.5px solid #e0f0ec', background:'#f9fafb', fontSize:14, fontWeight:700, cursor:'pointer', color:'#7C3AED', marginBottom:14 }}>
          📷 Fotoğraf Yükle & Kırp
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto}/>

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
