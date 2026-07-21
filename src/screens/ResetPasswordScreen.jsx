import { useState } from 'react'
import { sb } from '../lib/supabase'
import BibiFace from '../components/BibiFace'

export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPw1, setShowPw1] = useState(false)
  const [showPw2, setShowPw2] = useState(false)

  async function updatePassword() {
    if (!password || password.length < 6) return setMsg('Şifre en az 6 karakter olmalı')
    if (password !== password2) return setMsg('Şifreler eşleşmiyor')
    setLoading(true)
    const { error } = await sb.auth.updateUser({ password })
    setLoading(false)
    if (error) return setMsg(error.message)
    setDone(true)
    setTimeout(() => onDone(), 2000)
  }

  const inp = { width:'100%', padding:'13px 16px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'white', fontSize:15, fontFamily:'Nunito,sans-serif', boxSizing:'border-box' }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#0f2535)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:380, textAlign:'center' }}>
        <BibiFace expr={done?'happy':'curious'} size={70}/>
        {done ? (
          <div style={{ marginTop:16 }}>
            <div style={{ color:'#4ade80', fontSize:20, fontWeight:900, marginBottom:8 }}>Şifre güncellendi! ✅</div>
            <div style={{ color:'rgba(255,255,255,.5)', fontSize:13 }}>Giriş ekranına yönlendiriliyorsunuz...</div>
          </div>
        ) : (
          <div style={{ marginTop:16 }}>
            <div style={{ color:'white', fontSize:22, fontWeight:900, marginBottom:6 }}>Yeni Şifre Belirle</div>
            <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:24 }}>Hesabınız için yeni bir şifre oluşturun.</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ position:'relative' }}>
                <input type={showPw1?'text':'password'} placeholder="Yeni şifre (min 6 karakter)" value={password} onChange={e=>setPassword(e.target.value)} style={{...inp, paddingRight:44}}/>
                <button onClick={()=>setShowPw1(!showPw1)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', fontSize:18 }}>{showPw1?'🙈':'👁️'}</button>
              </div>
              <div style={{ position:'relative' }}>
                <input type={showPw2?'text':'password'} placeholder="Şifre tekrar" value={password2} onChange={e=>setPassword2(e.target.value)} style={{...inp, paddingRight:44}}/>
                <button onClick={()=>setShowPw2(!showPw2)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', fontSize:18 }}>{showPw2?'🙈':'👁️'}</button>
              </div>
              {msg && <div style={{ color:'#fca88a', fontSize:13 }}>{msg}</div>}
              <button onClick={updatePassword} disabled={loading} style={{ width:'100%', padding:14, borderRadius:14, border:'none', background:loading?'rgba(13,155,126,.5)':'#0D9B7E', color:'white', fontWeight:800, fontSize:15, cursor:'pointer', marginTop:4 }}>
                {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
