import { useEffect, useState } from 'react'
import BibiFace from '../components/BibiFace'

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0)
  // 0: papağan giriyor, 1: hoş geldin, 2: çıkış

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800)
    const t2 = setTimeout(() => setPhase(2), 2800)
    const t3 = setTimeout(() => onDone(), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const messages = [
    'Öğrenmek bu kadar eğlenceli olmamıştı! 🎉',
    'Dai ile her gün yeni bir macera! 🦜',
    'Merak et, keşfet, öğren! ✨',
    'Bugün harika şeyler öğreneceğiz! 🚀',
  ]
  const msg = messages[Math.floor(Math.random() * messages.length)]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #1C1410 0%, #2C1E0F 50%, #1C1008 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Nunito, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Arka plan daireler */}
      <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(245,158,11,.06)', top:'-50px', right:'-80px' }}/>
      <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(245,158,11,.04)', bottom:'80px', left:'-60px' }}/>

      {/* Papağan */}
      <div style={{
        transform: phase === 0 ? 'scale(0) rotate(-20deg)' : phase === 2 ? 'scale(1.1) translateY(-10px)' : 'scale(1) rotate(0deg)',
        transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        marginBottom: 24,
      }}>
        <BibiFace expr={phase >= 1 ? 'excited' : 'idle'} size={140}/>
      </div>

      {/* İsim */}
      <div style={{
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease 0.2s',
        textAlign: 'center',
      }}>
        <div style={{ color: '#F59E0B', fontSize: 48, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>dai</div>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, marginTop: 6, fontWeight: 600 }}>Öğrenme Arkadaşın</div>
      </div>

      {/* Mesaj */}
      <div style={{
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease 0.4s',
        marginTop: 28,
        background: 'rgba(245,158,11,.12)',
        border: '1px solid rgba(245,158,11,.25)',
        borderRadius: 16,
        padding: '12px 20px',
        maxWidth: 280,
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>{msg}</div>
      </div>

      {/* Loading dots */}
      <div style={{
        position: 'absolute',
        bottom: 50,
        display: 'flex',
        gap: 8,
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 0.5s ease 0.6s',
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: '#F59E0B',
            animation: `dotPulse 1.2s ease ${i * 0.2}s infinite`,
          }}/>
        ))}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
