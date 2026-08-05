import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import BibiFace from '../components/BibiFace'

export default function RegisterScreen({ onBack }) {
  const { setCurrentUser, setScreen } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function doRegister() {
    if (!email || !password || !fullName || !pin || pin.length !== 4) {
      return setMsg('Tüm alanları doldurun, PIN 4 haneli olmalı')
    }
    setLoading(true)
    const { data, error } = await sb.auth.signUp({ email, password })
    if (error) { setLoading(false); return setMsg(error.message) }
    await sb.from('parents').insert({
      id: data.user.id, email, phone: phone || null,
      full_name: fullName, pin, role: 'parent'
    })
    setLoading(false)
    setCurrentUser(data.user)
    setScreen('parentDashboard')
  }

  const inp = {
    width: '100%', padding: '14px 16px', borderRadius: 14,
    border: '1.5px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.08)',
    color: 'white', fontSize: 15, fontFamily: 'Nunito, sans-serif', boxSizing: 'border-box',
    outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #1C1410 0%, #2C1E0F 50%, #1C1008 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Nunito, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: '50%', width: 38, height: 38, color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: 700 }}>Hesap Oluştur</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px 40px', overflowY: 'auto' }}>
        {/* Papağan */}
        <div style={{ marginBottom: 12, marginTop: 8 }}>
          <BibiFace expr="excited" size={80}/>
        </div>
        <div style={{ color: 'white', fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Aramıza Katıl!</div>
        <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginBottom: 24 }}>Çocuğunuz için ücretsiz hesap oluştur</div>

        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Ad Soyad" value={fullName} onChange={e => setFullName(e.target.value)} style={inp}/>
          <input placeholder="E-posta" type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp}/>
          <div style={{ position: 'relative' }}>
            <input
              placeholder="Şifre"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ ...inp, paddingRight: 50 }}
            />
            <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', fontSize: 18 }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <input placeholder="Telefon (opsiyonel)" value={phone} onChange={e => setPhone(e.target.value)} style={inp}/>

          {/* PIN */}
          <div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize:12, fontWeight:700, marginBottom:6, letterSpacing:0.5 }}>
              VELİ PIN KODU (4 haneli — rapor girişi için)
            </div>
            <input
              placeholder="Örn: 1234"
              type="number"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.slice(0,4))}
              style={inp}
            />
          </div>

          {msg && <div style={{ color: '#fca88a', fontSize: 13, textAlign: 'center' }}>{msg}</div>}

          <button onClick={doRegister} disabled={loading} style={{
            width: '100%', padding: 16, borderRadius: 14, border: 'none',
            background: loading ? 'rgba(245,158,11,.5)' : '#F59E0B',
            color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif', marginTop: 4,
          }}>
            {loading ? 'Oluşturuluyor...' : 'Hesap Oluştur →'}
          </button>

          <div style={{ color: 'rgba(255,255,255,.25)', fontSize: 11, textAlign: 'center', lineHeight: 1.5 }}>
            Hesap oluşturarak kullanım koşullarını kabul etmiş olursunuz.
          </div>
        </div>
      </div>
    </div>
  )
}
