import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import BibiFace from '../components/BibiFace'

export default function AuthScreen() {
  const { setCurrentUser, setScreen } = useApp()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function doLogin() {
    if (!email || !password) return setMsg('E-posta ve şifre gerekli')
    setLoading(true)
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setMsg(error.message)
    setCurrentUser(data.user)
    setScreen('children')
  }

  async function doRegister() {
    if (!email || !password || !fullName || !pin || pin.length !== 4) {
      return setMsg('Tüm alanları doldurun, PIN 4 haneli olmalı')
    }
    setLoading(true)
    const { data, error } = await sb.auth.signUp({ email, password })
    if (error) { setLoading(false); return setMsg(error.message) }
    await sb.from('parents').insert({
      id: data.user.id, email, phone: phone||null,
      full_name: fullName, pin, role: 'parent'
    })
    setLoading(false)
    setCurrentUser(data.user)
    setScreen('children')
  }

  async function doForgotPassword() {
    if (!forgotEmail) return setForgotMsg('E-posta adresinizi girin')
    setForgotLoading(true)
    const { error } = await sb.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: 'https://bibi-react-three.vercel.app'
    })
    setForgotLoading(false)
    if (error) return setForgotMsg(error.message)
    setForgotSent(true)
  }

  const inp = {
    width: '100%', padding: '13px 16px', borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.08)',
    color: 'white', fontSize: 15, fontFamily: 'Nunito, sans-serif', boxSizing: 'border-box'
  }

  if (showForgot) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#0f2535)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:380, textAlign:'center' }}>
        <BibiFace expr="curious" size={60}/>
        {forgotSent ? (
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📧</div>
            <div style={{ color:'#4ade80', fontSize:18, fontWeight:900, marginBottom:8 }}>Şifre sıfırlama e-postası gönderildi!</div>
            <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginBottom:20 }}>E-postanızı kontrol edin ve bağlantıya tıklayın.</div>
            <button onClick={()=>{setShowForgot(false);setForgotSent(false);setForgotEmail('');setForgotMsg('')}} style={{ padding:'12px 28px', borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, fontSize:14, cursor:'pointer' }}>← Giriş Ekranına Dön</button>
          </div>
        ) : (
          <div style={{ marginTop:20 }}>
            <div style={{ color:'white', fontSize:20, fontWeight:900, marginBottom:6 }}>Şifremi Unuttum</div>
            <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:20 }}>E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz.</div>
            <input placeholder="E-posta adresiniz" type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} style={{...inp, marginBottom:10}}/>
            {forgotMsg && <div style={{ color:'#fca88a', fontSize:13, marginBottom:10 }}>{forgotMsg}</div>}
            <button onClick={doForgotPassword} disabled={forgotLoading} style={{ width:'100%', padding:14, borderRadius:12, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, fontSize:14, cursor:'pointer', marginBottom:10 }}>
              {forgotLoading ? 'Gönderiliyor...' : 'Sıfırlama E-postası Gönder →'}
            </button>
            <button onClick={()=>{setShowForgot(false);setForgotMsg('');setForgotEmail('')}} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', fontSize:13, cursor:'pointer' }}>← Geri Dön</button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#0f2535)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <BibiFace expr="happy" size={70}/>
          <div style={{ color:'white', fontSize:26, fontWeight:900, marginTop:12 }}>Bibi</div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginTop:4 }}>Çocuğunun öğrenme arkadaşı</div>
        </div>

        <div style={{ display:'flex', background:'rgba(255,255,255,.06)', borderRadius:12, padding:4, marginBottom:20 }}>
          {['login','register'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:'10px', borderRadius:10, border:'none', cursor:'pointer',
              background: tab === t ? 'rgba(255,255,255,.15)' : 'transparent',
              color: tab === t ? 'white' : 'rgba(255,255,255,.4)',
              fontWeight:700, fontSize:14, fontFamily:'Nunito, sans-serif'
            }}>
              {t === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {tab === 'register' && (
            <input placeholder="Ad Soyad" value={fullName} onChange={e=>setFullName(e.target.value)} style={inp}/>
          )}
          <input placeholder="E-posta" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/>
          <div style={{ position:'relative' }}>
            <input placeholder="Şifre" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&doLogin()} style={{...inp, paddingRight:44}}/>
            <button onClick={()=>setShowPassword(!showPassword)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', fontSize:18 }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {tab === 'register' && (
            <>
              <input placeholder="Telefon (opsiyonel)" value={phone} onChange={e=>setPhone(e.target.value)} style={inp}/>
              <input placeholder="4 haneli PIN (rapor için)" type="number" maxLength={4}
                value={pin} onChange={e=>setPin(e.target.value.slice(0,4))} style={inp}/>
            </>
          )}
          {msg && <div style={{ color:'#fca88a', fontSize:13, textAlign:'center' }}>{msg}</div>}
          <button onClick={tab === 'login' ? doLogin : doRegister} disabled={loading} style={{
            width:'100%', padding:14, borderRadius:14, border:'none',
            background: loading ? 'rgba(13,155,126,.5)' : '#0D9B7E',
            color:'white', fontWeight:800, fontSize:15, cursor:'pointer',
            fontFamily:'Nunito, sans-serif', marginTop:4
          }}>
            {loading ? 'Bekleniyor...' : tab === 'login' ? 'Giriş Yap →' : 'Hesap Oluştur →'}
          </button>
          {tab === 'login' && (
            <button onClick={()=>setShowForgot(true)} style={{
              background:'none', border:'none', color:'rgba(255,255,255,.4)',
              fontSize:12, cursor:'pointer', textDecoration:'underline', fontFamily:'Nunito,sans-serif'
            }}>
              Şifremi Unuttum
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
