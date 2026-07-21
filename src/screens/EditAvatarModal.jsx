import { useState, useRef, useEffect } from 'react'
import { sb } from '../lib/supabase'

const EMOJIS = ["👧","👦","🧒","👶","🦊","🐱","🐶","🐼","🐨","🦁","🐯","🐸","🦄","🐲","🤖","👾","🦸","🧙","🧚","🧜","🦋","🌸","⭐","🎨"]
const CROP_SIZE = 260

export default function EditAvatarModal({ child, onClose, onSave }) {
  const [selectedEmoji, setSelectedEmoji] = useState(child.avatar_emoji || '👤')
  const [avatarPhoto, setAvatarPhoto] = useState(child.avatar_photo || null)
  const [loading, setLoading] = useState(false)
  const [cropMode, setCropMode] = useState(false)
  const [rawImage, setRawImage] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [lastPos, setLastPos] = useState(null)
  const [lastDist, setLastDist] = useState(null)
  const [imgNatural, setImgNatural] = useState({ w: 1, h: 1 })
  const fileRef = useRef()
  const canvasRef = useRef()
  const imgRef = useRef()

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setRawImage(ev.target.result)
      setPos({ x: 0, y: 0 })
      setScale(1)
      setCropMode(true)
    }
    reader.readAsDataURL(file)
  }

  function onImgLoad() {
    const img = imgRef.current
    if (!img) return
    const w = img.naturalWidth, h = img.naturalHeight
    setImgNatural({ w, h })
    // Fotoğrafı kare alana sığdır
    const minSide = Math.min(w, h)
    const initScale = CROP_SIZE / minSide
    setScale(initScale)
    setPos({ x: (CROP_SIZE - w * initScale) / 2, y: (CROP_SIZE - h * initScale) / 2 })
  }

  // Mouse events
  function onMouseDown(e) {
    setDragging(true)
    setLastPos({ x: e.clientX, y: e.clientY })
  }
  function onMouseMove(e) {
    if (!dragging || !lastPos) return
    setPos(p => ({ x: p.x + e.clientX - lastPos.x, y: p.y + e.clientY - lastPos.y }))
    setLastPos({ x: e.clientX, y: e.clientY })
  }
  function onMouseUp() { setDragging(false); setLastPos(null) }

  // Touch events
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      setDragging(true)
      setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      setLastDist(Math.sqrt(dx*dx + dy*dy))
    }
  }
  function onTouchMove(e) {
    e.preventDefault()
    if (e.touches.length === 1 && dragging && lastPos) {
      setPos(p => ({ x: p.x + e.touches[0].clientX - lastPos.x, y: p.y + e.touches[0].clientY - lastPos.y }))
      setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    } else if (e.touches.length === 2 && lastDist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx*dx + dy*dy)
      const ratio = dist / lastDist
      setScale(s => Math.max(0.3, Math.min(5, s * ratio)))
      setLastDist(dist)
    }
  }
  function onTouchEnd() { setDragging(false); setLastPos(null); setLastDist(null) }

  // Scroll to zoom
  function onWheel(e) {
    e.preventDefault()
    setScale(s => Math.max(0.3, Math.min(5, s - e.deltaY * 0.001)))
  }

  function applyCrop() {
    const canvas = document.createElement('canvas')
    canvas.width = 300; canvas.height = 300
    const ctx = canvas.getContext('2d')
    const img = imgRef.current
    // pos ve scale'den gerçek koordinatları hesapla
    const scaleX = imgNatural.w / (imgNatural.w * scale)
    const scaleY = imgNatural.h / (imgNatural.h * scale)
    const srcX = -pos.x / scale
    const srcY = -pos.y / scale
    const srcW = CROP_SIZE / scale
    const srcH = CROP_SIZE / scale
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, 300, 300)
    setAvatarPhoto(canvas.toDataURL('image/jpeg', 0.85))
    setCropMode(false)
    setRawImage(null)
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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.95)', zIndex:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'Nunito,sans-serif', userSelect:'none' }}>
      <div style={{ color:'white', fontSize:15, fontWeight:700, marginBottom:16 }}>📸 Fotoğrafı Konumlandır</div>
      <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginBottom:12 }}>Sürükle • Kaydır yakınlaştır</div>

      {/* Kırpma alanı */}
      <div style={{ position:'relative', width:CROP_SIZE, height:CROP_SIZE, borderRadius:'50%', overflow:'hidden', border:'3px solid #4ade80', cursor:dragging?'grabbing':'grab', touchAction:'none' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onWheel={onWheel}>
        <img ref={imgRef} src={rawImage} onLoad={onImgLoad} draggable={false}
          style={{ position:'absolute', left:pos.x, top:pos.y, width:imgNatural.w * scale, height:imgNatural.h * scale, maxWidth:'none', pointerEvents:'none' }}/>
      </div>

      {/* Zoom slider */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:16, width:CROP_SIZE }}>
        <span style={{ color:'rgba(255,255,255,.4)', fontSize:16 }}>🔍</span>
        <input type="range" min="0.3" max="5" step="0.01" value={scale}
          onChange={e=>setScale(parseFloat(e.target.value))}
          style={{ flex:1, accentColor:'#4ade80' }}/>
        <span style={{ color:'rgba(255,255,255,.4)', fontSize:16 }}>🔎</span>
      </div>

      <div style={{ display:'flex', gap:10, marginTop:20 }}>
        <button onClick={()=>{setCropMode(false);setRawImage(null)}} style={{ padding:'11px 22px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.2)', background:'transparent', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>İptal</button>
        <button onClick={applyCrop} style={{ padding:'11px 28px', borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Kaydet ✓</button>
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
          📷 Fotoğraf Yükle
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
