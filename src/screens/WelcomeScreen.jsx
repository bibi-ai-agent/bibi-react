import { useEffect, useState } from 'react'
import BibiFace from '../components/BibiFace'

export default function WelcomeScreen({ onLogin, onRegister }) {
  const [show, setShow] = useState(false)
  useEffect(() => { setTimeout(() => setShow(true), 100) }, [])

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f0a05 0%,#1C1410 60%,#0f0a05 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', fontFamily:'Nunito,sans-serif', overflow:'hidden' }}>

      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'rgba(245,158,11,.04)', top:'-100px', right:'-120px', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(245,158,11,.03)', bottom:'60px', left:'-100px', pointerEvents:'none' }}/>

      <div style={{ opacity:show?1:0, transform:show?'scale(1)':'scale(0.85)', transition:'all 0.6s cubic-bezier(0.34,1.56,0.64,1)', display:'flex', flexDirection:'column', alignItems:'center', gap:4, marginBottom:16 }}>
        <BibiFace expr="happy" size={130}/>
        <div style={{ color:'#F59E0B', fontSize:46, fontWeight:900, letterSpacing:-2, lineHeight:1 }}>Dai</div>
        <div style={{ color:'rgba(255,255,255,.35)', fontSize:13, fontWeight:600 }}>Çocuğunun öğrenme arkadaşı 🦜</div>
      </div>

      <div style={{ opacity:show?1:0, transition:'all 0.5s ease 0.3s', display:'flex', gap:20, marginBottom:40 }}>
        {[['🧠','Yapay Zeka'],['🎮','Eğlenceli'],['🔒','Güvenli']].map(([icon,label]) => (
          <div key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <span style={{ fontSize:22 }}>{icon}</span>
            <span style={{ color:'rgba(255,255,255,.35)', fontSize:10, fontWeight:700 }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ opacity:show?1:0, transform:show?'translateY(0)':'translateY(20px)', transition:'all 0.5s ease 0.4s', width:'100%', maxWidth:340, display:'flex', flexDirection:'column', gap:12 }}>
        <button onClick={onLogin} style={{ width:'100%', padding:'18px', borderRadius:18, border:'none', background:'#F59E0B', color:'#0f0a05', fontWeight:900, fontSize:16, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
          Giriş Yap →
        </button>
        <button onClick={onRegister} style={{ width:'100%', padding:'18px', borderRadius:18, border:'2px solid rgba(245,158,11,.3)', background:'rgba(245,158,11,.08)', color:'#F59E0B', fontWeight:900, fontSize:16, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
          Hesap Oluştur
        </button>
        <div style={{ color:'rgba(255,255,255,.2)', fontSize:11, textAlign:'center', marginTop:4 }}>
          Çocuklar veli girişi üzerinden erişir
        </div>
      </div>
    </div>
  )
}
