import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import EditAvatarModal from './EditAvatarModal'

const SPECIALTY_ICONS = { Matematik:"📐", Fen:"🔬", "Yabancı Dil":"🌐", Tarih:"🏛️", Sanat:"🎨", Genel:"🌍" }
const EMOJIS = ["👧","👦","🧒","👶","🦊","🐱","🐶","🐼","🐨","🦁","🐯","🐸","🦄","🐲","🤖","👾","🦸","🧙","🧚","🧜"]
const QUESTIONS = [
  "Bugün çocuğuna kaç dakika ayırdın? 💙","En son ne zaman birlikte oyun oynadınız? 🎮",
  "Bugün nasılsın diye sordun mu? 🌸","Onu dinlemek için zaman buldun mu? 👂",
  "Bu hafta birlikte güldünüz mü? 😊","Onun bir başarısını kutladın mı? 🌟",
  "Bugün onu kucakladın mı? 🤗","Hayalleri hakkında konuştunuz mu? ✨",
]

export default function ChildrenScreen() {
  const { currentUser, setCurrentChild, setScreen, subscription } = useApp()
  const [children, setChildren] = useState([])
  const [parentName, setParentName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAge, setNewAge] = useState('')
  const [newGender, setNewGender] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [gradeOptions, setGradeOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState('')
  const [avatarPhoto, setAvatarPhoto] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editingChild, setEditingChild] = useState(null)
  const [deletingChild, setDeletingChild] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const fileRef = useRef()

  useEffect(() => { loadChildren(); loadParent() }, [])

  async function loadChildren() {
    const { data } = await sb.from('children').select('*').eq('parent_id', currentUser.id)
    setChildren(data || [])
  }

  async function loadParent() {
    const { data } = await sb.from('parents').select('full_name').eq('id', currentUser.id).single()
    if (data) setParentName(data.full_name)
  }

  function updateGradeOptions(age) {
    const gradeMap = {
      6:["Okul öncesi","1. Sınıf"],7:["1. Sınıf","2. Sınıf"],8:["2. Sınıf","3. Sınıf"],
      9:["3. Sınıf","4. Sınıf"],10:["4. Sınıf","5. Sınıf"],11:["5. Sınıf","6. Sınıf"],
      12:["6. Sınıf","7. Sınıf"],13:["7. Sınıf","8. Sınıf"],14:["8. Sınıf"],15:["8. Sınıf"]
    }
    const opts = gradeMap[parseInt(age)] || []
    setGradeOptions(opts)
    if (opts.length === 1) setNewGrade(opts[0]); else setNewGrade('')
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = ev => { setAvatarPhoto(ev.target.result); setSelectedEmoji('') }
    reader.readAsDataURL(file)
  }

  async function addChild() {
    if (!newName || !newAge || !newGender || !newGrade) return
    setLoading(true)
    const defaultEmoji = newGender === 'kız' ? '👧' : '👦'
    const { data } = await sb.from('children').insert({
      parent_id: currentUser.id, name: newName, age: parseInt(newAge),
      gender: newGender, grade: newGrade,
      avatar_emoji: avatarPhoto ? null : (selectedEmoji || defaultEmoji),
      avatar_photo: avatarPhoto || null,
      invite_code: Math.random().toString(36).substr(2,6).toUpperCase()
    }).select().single()
    setLoading(false)
    if (data) { setChildren(c => [...c, data]); setShowAddForm(false); resetForm() }
  }

  async function deleteChild(child) {
    setDeleteLoading(true)
    await sb.from('messages').delete().eq('child_id', child.id)
    await sb.from('sessions').delete().eq('child_id', child.id)
    await sb.from('mastery').delete().eq('child_id', child.id)
    await sb.from('emotion_logs').delete().eq('child_id', child.id)
    await sb.from('chat_assets').delete().eq('child_id', child.id)
    await sb.from('children').delete().eq('id', child.id)
    setChildren(cs => cs.filter(c => c.id !== child.id))
    setDeletingChild(null)
    setDeleteLoading(false)
  }

  function resetForm() {
    setNewName(''); setNewAge(''); setNewGender(''); setNewGrade('')
    setGradeOptions([]); setSelectedEmoji(''); setAvatarPhoto(null); setShowEmojiPicker(false)
  }

  function handleAvatarSaved(updated) {
    setChildren(cs => cs.map(c => c.id === updated.id ? updated : c))
    setEditingChild(null)
  }

  function startChat(child) { setCurrentChild(child); setScreen('chat') }
  function openReport(child) { setCurrentChild(child); setScreen('report') }
  async function signOut() { await sb.auth.signOut() }

  const inp = { width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #e0f0ec', background:'#f9fafb', fontSize:14, fontFamily:'Nunito,sans-serif', boxSizing:'border-box', color:'#1A2E2A' }
  const avatarPreview = avatarPhoto
    ? <img src={avatarPhoto} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
    : <span style={{fontSize:36}}>{selectedEmoji||(newGender==='kız'?'👧':newGender==='erkek'?'👦':'😊')}</span>

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fce4ec 0%,#f8bbd0 15%,#e1bee7 32%,#d1c4e9 48%,#bbdefb 64%,#b2ebf2 78%,#c8e6c9 90%,#dcedc8 100%)', backgroundSize:'300% 300%', animation:'gradShift 12s ease infinite', position:'relative', overflow:'hidden' }}>

      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        {QUESTIONS.map((q,i)=>(
          <div key={i} style={{ position:'absolute', left:`${[5,52,8,48,6,50,18,58][i]}%`, top:`${[8,15,42,52,72,78,28,62][i]}%`, background:'rgba(180,120,200,0.12)', border:'1px solid rgba(180,120,200,0.25)', borderRadius:20, padding:'7px 13px', fontSize:11, fontWeight:600, color:'rgba(120,60,160,0.65)', whiteSpace:'nowrap', animation:`floatBubble ${[14,18,16,20,15,17,13,19][i]}s ${i*0.8}s ease-in-out infinite` }}>{q}</div>
        ))}
      </div>

      <div style={{ background:'rgba(248,251,250,0.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(13,155,126,.08)', padding:'18px 20px 14px', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ maxWidth:500, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:22, fontWeight:900, color:'#1A2E2A' }}>Merhaba! 👋</div>
            <div style={{ fontSize:13, color:'#6B7280', marginTop:2 }}>{parentName||'Hoş geldiniz'}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setScreen('subscription')} style={{ padding:'8px 16px', borderRadius:20, background:'linear-gradient(135deg,#7C3AED,#0D9B7E)', border:'none', color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {subscription?.plan === 'free' ? '⭐ Planı Yükselt' : `⭐ ${(subscription?.plan||'free').toUpperCase()}`}
            </button>
            <button onClick={signOut} style={{ padding:'8px 18px', borderRadius:20, background:'white', border:'1.5px solid #e0f0ec', color:'#6B7280', fontSize:13, fontWeight:700, cursor:'pointer' }}>Çıkış</button>
          </div>
        </div>
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:500, margin:'0 auto', padding:'20px 20px 60px' }}>
        <div style={{ fontSize:12, fontWeight:800, color:'#9c4dcc', letterSpacing:2, textTransform:'uppercase', marginBottom:16 }}>Kim oynayacak?</div>

        {children.map(c=>(
          <div key={c.id} style={{ background:'rgba(255,255,255,0.82)', borderRadius:18, padding:'16px 18px', boxShadow:'0 4px 24px rgba(180,120,200,.12)', display:'flex', alignItems:'center', gap:14, marginBottom:12, border:'1px solid rgba(255,255,255,.7)', backdropFilter:'blur(8px)', animation:'fadeUp .3s ease' }}>
            
            <div style={{ position:'relative', flexShrink:0 }}>
              <div onClick={()=>startChat(c)} style={{ width:56, height:56, borderRadius:'50%', overflow:'hidden', background:'#e8f7f3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, border:'2px solid #c5e8e0', cursor:'pointer' }}>
                {c.avatar_photo ? <img src={c.avatar_photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : c.avatar_emoji||'👤'}
              </div>
              <button onClick={e=>{e.stopPropagation();setEditingChild(c)}} style={{ position:'absolute', bottom:-2, right:-2, width:20, height:20, borderRadius:'50%', background:'#0D9B7E', border:'2px solid white', cursor:'pointer', fontSize:10, color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>✏️</button>
            </div>

            <div onClick={()=>startChat(c)} style={{ flex:1, cursor:'pointer' }}>
              <div style={{ fontSize:17, fontWeight:900, color:'#1A2E2A' }}>{c.name}</div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{c.age} yaş • {c.grade}</div>
              {c.bibi_specialty
                ? <div style={{ fontSize:11, color:'#0D9B7E', fontWeight:700, marginTop:3 }}>{SPECIALTY_ICONS[c.bibi_specialty]||'⭐'} {c.bibi_specialty} Uzmanı Bibi</div>
                : <div style={{ fontSize:11, color:'#9CA3AF', marginTop:3 }}>✨ {c.name} ile konuştukça Bibi gelişecek</div>
              }
            </div>

            <button onClick={e=>{e.stopPropagation();openReport(c)}} style={{ width:32, height:32, borderRadius:'50%', background:'#e8f7f3', border:'1px solid #c5e8e0', cursor:'pointer', fontSize:14 }}>📊</button>
            <button onClick={e=>{e.stopPropagation();setCurrentChild(c);setScreen('friends')}} style={{ width:32, height:32, borderRadius:'50%', background:'#ede9fe', border:'1px solid #d4c5f9', cursor:'pointer', fontSize:14 }}>🤝</button>
            <button onClick={e=>{e.stopPropagation();setDeletingChild(c)}} style={{ width:32, height:32, borderRadius:'50%', background:'#fee2e2', border:'1px solid #fca5a5', cursor:'pointer', fontSize:14 }}>🗑️</button>
          </div>
        ))}

        {!showAddForm ? (
          <button onClick={()=>setShowAddForm(true)} style={{ width:'100%', padding:15, borderRadius:18, border:'2.5px dashed #b8ddd6', background:'rgba(255,255,255,.7)', color:'#0D9B7E', fontSize:15, fontWeight:800, cursor:'pointer' }}>
            + Yeni Profil Ekle
          </button>
        ) : (
          <div style={{ background:'rgba(255,255,255,0.85)', borderRadius:18, padding:'22px 20px', boxShadow:'0 4px 24px rgba(180,120,200,.12)', backdropFilter:'blur(8px)' }}>
            <div style={{ fontSize:16, fontWeight:800, color:'#1A2E2A', marginBottom:16 }}>Yeni Profil Ekle</div>
            
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:16, gap:10 }}>
              <div style={{ width:80, height:80, borderRadius:'50%', overflow:'hidden', background:'#e8f7f3', border:'2.5px solid #0D9B7E', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }} onClick={()=>setShowEmojiPicker(!showEmojiPicker)}>
                {avatarPreview}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setShowEmojiPicker(!showEmojiPicker)} style={{ padding:'6px 14px', borderRadius:10, border:'1.5px solid #e0f0ec', background:'white', fontSize:12, fontWeight:700, cursor:'pointer', color:'#0D9B7E' }}>😊 Emoji Seç</button>
                <button onClick={()=>fileRef.current.click()} style={{ padding:'6px 14px', borderRadius:10, border:'1.5px solid #e0f0ec', background:'white', fontSize:12, fontWeight:700, cursor:'pointer', color:'#7C3AED' }}>📷 Fotoğraf</button>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>
              </div>
              {showEmojiPicker && (
                <div style={{ background:'white', borderRadius:14, padding:12, border:'1.5px solid #e0f0ec', boxShadow:'0 4px 16px rgba(0,0,0,.1)' }}>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxWidth:280 }}>
                    {EMOJIS.map(em=>(
                      <button key={em} onClick={()=>{setSelectedEmoji(em);setAvatarPhoto(null);setShowEmojiPicker(false)}} style={{ width:36, height:36, borderRadius:8, border:`2px solid ${selectedEmoji===em?'#0D9B7E':'transparent'}`, background:selectedEmoji===em?'#e8f7f3':'transparent', fontSize:22, cursor:'pointer' }}>{em}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input placeholder="Çocuğun adı" value={newName} onChange={e=>setNewName(e.target.value)} style={inp}/>
              <select value={newAge} onChange={e=>{setNewAge(e.target.value);updateGradeOptions(e.target.value)}} style={inp}>
                <option value="">Yaş seçin</option>
                {Array.from({length:10},(_,i)=>i+6).map(a=><option key={a} value={a}>{a} yaş</option>)}
              </select>
              <div style={{ display:'flex', gap:8 }}>
                {['kız','erkek'].map(g=>(
                  <button key={g} onClick={()=>setNewGender(g)} style={{ flex:1, padding:10, borderRadius:10, border:`1.5px solid ${newGender===g?'#0D9B7E':'#e0f0ec'}`, background:newGender===g?'#e8f7f3':'white', cursor:'pointer', fontWeight:700, color:newGender===g?'#0D9B7E':'#6B7280', fontFamily:'Nunito,sans-serif' }}>
                    {g==='kız'?'👧 Kız':'👦 Erkek'}
                  </button>
                ))}
              </div>
              <select value={newGrade} onChange={e=>setNewGrade(e.target.value)} style={inp} disabled={!newAge}>
                <option value="">{newAge?'Sınıf seçin':'Önce yaş seçin'}</option>
                {gradeOptions.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button onClick={()=>{setShowAddForm(false);resetForm()}} style={{ flex:1, padding:11, borderRadius:12, border:'1.5px solid #e0f0ec', background:'white', cursor:'pointer', fontWeight:700, color:'#6B7280', fontFamily:'Nunito,sans-serif' }}>İptal</button>
                <button onClick={addChild} disabled={loading} style={{ flex:2, padding:11, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>{loading?'Ekleniyor...':'Ekle →'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {editingChild && <EditAvatarModal child={editingChild} onClose={()=>setEditingChild(null)} onSave={handleAvatarSaved}/>}

      {/* Profil silme onay modalı */}
      {deletingChild && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
          <div style={{ background:'white', borderRadius:20, padding:'28px 24px', maxWidth:320, width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🗑️</div>
            <div style={{ fontSize:17, fontWeight:900, color:'#1A2E2A', marginBottom:8 }}>{deletingChild.name} profilini sil</div>
            <div style={{ fontSize:13, color:'#6B7280', marginBottom:20, lineHeight:1.5 }}>
              Bu işlem geri alınamaz. Tüm sohbet geçmişi, görseller ve veriler silinecek.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setDeletingChild(null)} style={{ flex:1, padding:12, borderRadius:12, border:'1.5px solid #e0f0ec', background:'white', cursor:'pointer', fontWeight:700, color:'#6B7280', fontFamily:'Nunito,sans-serif' }}>İptal</button>
              <button onClick={()=>deleteChild(deletingChild)} disabled={deleteLoading} style={{ flex:1, padding:12, borderRadius:12, border:'none', background:'#DC2626', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
                {deleteLoading ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes floatBubble{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  )
}
