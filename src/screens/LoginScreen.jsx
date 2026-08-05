import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'
import BibiFace from '../components/BibiFace'

export default function LoginScreen({ onBack, onForgot }) {
  const { setCurrentUser, setScreen } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function doLogin() {
    if (!email || !password) return setMsg('E-posta ve şifre gerekli')
    setLoading(true)
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setMsg(error.message)
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
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: 700 }}>Giriş Yap</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px 40px' }}>
        {/* Papağan */}
        <div style={{ marginBottom: 16 }}>
          <BibiFace expr="happy" size={90}/>
        </div>
        <div style={{ color: 'white', fontSize: 26, fontWeight: 900, marginBottom: 4 }}>Hoş Geldin!</div>
        <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginBottom: 32 }}>Devam etmek için giriş yap</div>

        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            placeholder="E-posta"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inp}
          />
          <div style={{ position: 'relative' }}>
            <input
              placeholder="Şifre"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()}
              style={{ ...inp, paddingRight: 50 }}
            />
            <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', fontSize: 18 }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {msg && <div style={{ color: '#fca88a', fontSize: 13, textAlign: 'center' }}>{msg}</div>}

          <button onClick={doLogin} disabled={loading} style={{
            width: '100%', padding: 16, borderRadius: 14, border: 'none',
            background: loading ? 'rgba(245,158,11,.5)' : '#F59E0B',
            color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif', marginTop: 4,
          }}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
          </button>

          <button onClick={onForgot} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,.35)',
            fontSize: 13, cursor: 'pointer', textAlign: 'center', fontFamily: 'Nunito, sans-serif', marginTop: 4,
          }}>
            Şifremi Unuttum
          </button>
        </div>
      </div>
    </div>
  )
}
