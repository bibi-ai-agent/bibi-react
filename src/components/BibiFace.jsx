export default function BibiFace({ expr = "idle", size = 44 }) {
  // Göz animasyonu için kırpma state'i
  const [blink, setBlink] = useState(false)
  const [wingAngle, setWingAngle] = useState(0)

  useEffect(() => {
    // Göz kırpma
    const blinkInterval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 150)
    }, 3000 + Math.random() * 2000)

    // Kanat hareketi
    const wingInterval = setInterval(() => {
      setWingAngle(a => a === 0 ? -15 : 0)
    }, 800)

    return () => {
      clearInterval(blinkInterval)
      clearInterval(wingInterval)
    }
  }, [])

  // İfadeye göre göz ve ağız
  const expressions = {
    idle:     { eyeScale: 1,    mouthPath: "M52,72 Q60,78 68,72", pupilY: 0 },
    happy:    { eyeScale: 1.1,  mouthPath: "M48,68 Q60,82 72,68", pupilY: -1 },
    thinking: { eyeScale: 0.9,  mouthPath: "M54,74 Q60,77 66,74", pupilY: 1 },
    talking:  { eyeScale: 1,    mouthPath: "M50,70 Q60,80 70,70 Q60,88 50,70", pupilY: 0 },
    sad:      { eyeScale: 0.85, mouthPath: "M50,78 Q60,70 70,78", pupilY: 2 },
    excited:  { eyeScale: 1.2,  mouthPath: "M46,66 Q60,86 74,66", pupilY: -2 },
    curious:  { eyeScale: 1,    mouthPath: "M52,73 Q60,79 68,73", pupilY: -1 },
  }

  const ex = expressions[expr] || expressions.idle
  const eyeH = blink ? 1 : 9 * ex.eyeScale

  // Renk temaları ifadeye göre
  const colors = {
    idle:     { head: '#29B6F6', body: '#26C6DA', chest: '#FFEE58' },
    happy:    { head: '#4FC3F7', body: '#4DD0E1', chest: '#FFF176' },
    thinking: { head: '#1E88E5', body: '#00ACC1', chest: '#FFE082' },
    talking:  { head: '#29B6F6', body: '#26C6DA', chest: '#FFEE58' },
    sad:      { head: '#5C8EC4', body: '#5BB5C0', chest: '#B0BEC5' },
    excited:  { head: '#00E5FF', body: '#1DE9B6', chest: '#FFFF00' },
    curious:  { head: '#29B6F6', body: '#26C6DA', chest: '#FFE57F' },
  }
  const col = colors[expr] || colors.idle

  const W = 120
  const H = 130

  return (
    <svg width={size} height={size} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      {/* Gölge */}
      <ellipse cx="60" cy="126" rx="32" ry="5" fill="rgba(0,0,0,0.12)"/>

      {/* Sol kanat */}
      <g transform={`rotate(${wingAngle} 22 70)`} style={{ transformOrigin: '22px 70px' }}>
        <ellipse cx="22" cy="72" rx="18" ry="32" fill="#EF5350" transform="rotate(-15 22 72)"/>
        <ellipse cx="24" cy="70" rx="13" ry="25" fill="#FF7043" transform="rotate(-15 24 70)"/>
        <ellipse cx="26" cy="68" rx="9" ry="18" fill="#FFA726" transform="rotate(-15 26 68)"/>
      </g>

      {/* Sağ kanat */}
      <g transform={`rotate(${-wingAngle} 98 70)`} style={{ transformOrigin: '98px 70px' }}>
        <ellipse cx="98" cy="72" rx="18" ry="32" fill="#AB47BC" transform="rotate(15 98 72)"/>
        <ellipse cx="96" cy="70" rx="13" ry="25" fill="#7E57C2" transform="rotate(15 96 70)"/>
        <ellipse cx="94" cy="68" rx="9" ry="18" fill="#5C6BC0" transform="rotate(15 94 68)"/>
      </g>

      {/* Vücut */}
      <ellipse cx="60" cy="92" rx="32" ry="36" fill={col.body}/>
      {/* Göğüs */}
      <ellipse cx="60" cy="100" rx="22" ry="26" fill={col.chest}/>

      {/* Baş */}
      <circle cx="60" cy="52" r="38" fill={col.head}/>

      {/* Tepe tüyleri */}
      <ellipse cx="46" cy="17" rx="5" ry="14" fill="#EF5350" transform="rotate(-20 46 17)"/>
      <ellipse cx="53" cy="14" rx="5" ry="16" fill="#FF9800" transform="rotate(-10 53 14)"/>
      <ellipse cx="60" cy="13" rx="5" ry="17" fill="#FFEE58"/>
      <ellipse cx="67" cy="14" rx="5" ry="16" fill="#66BB6A" transform="rotate(10 67 14)"/>
      <ellipse cx="74" cy="17" rx="5" ry="14" fill="#42A5F5" transform="rotate(20 74 17)"/>

      {/* Yüz beyaz bölge */}
      <ellipse cx="60" cy="62" rx="22" ry="19" fill="#FFF9C4"/>

      {/* Sol göz */}
      <ellipse cx="46" cy="54" rx="9" ry={eyeH} fill="white"/>
      {!blink && <>
        <ellipse cx="46" cy={54 + ex.pupilY} rx="6" ry={Math.min(6, eyeH * 0.85)} fill="#1565C0"/>
        <ellipse cx="46" cy={54 + ex.pupilY} rx="3.5" ry={Math.min(3.5, eyeH * 0.5)} fill="#0D47A1"/>
        <ellipse cx="46" cy={54 + ex.pupilY} rx="1.5" ry={Math.min(1.5, eyeH * 0.22)} fill="black"/>
        <circle cx="43" cy={51 + ex.pupilY} r="1.5" fill="white"/>
      </>}

      {/* Sağ göz */}
      <ellipse cx="74" cy="54" rx="9" ry={eyeH} fill="white"/>
      {!blink && <>
        <ellipse cx="74" cy={54 + ex.pupilY} rx="6" ry={Math.min(6, eyeH * 0.85)} fill="#1565C0"/>
        <ellipse cx="74" cy={54 + ex.pupilY} rx="3.5" ry={Math.min(3.5, eyeH * 0.5)} fill="#0D47A1"/>
        <ellipse cx="74" cy={54 + ex.pupilY} rx="1.5" ry={Math.min(1.5, eyeH * 0.22)} fill="black"/>
        <circle cx="71" cy={51 + ex.pupilY} r="1.5" fill="white"/>
      </>}

      {/* Gözlük */}
      <circle cx="46" cy="54" r="11" fill="none" stroke="#B45309" strokeWidth="2.5"/>
      <circle cx="74" cy="54" r="11" fill="none" stroke="#B45309" strokeWidth="2.5"/>
      <line x1="57" y1="54" x2="63" y2="54" stroke="#B45309" strokeWidth="2.5"/>
      <path d="M35 50 Q30 48 27 51" stroke="#B45309" strokeWidth="2" fill="none"/>
      <path d="M85 50 Q90 48 93 51" stroke="#B45309" strokeWidth="2" fill="none"/>

      {/* Gaga */}
      <path d="M54,74 Q60,84 66,74 Q63,69 60,68 Q57,69 54,74Z" fill="#FF8F00"/>
      <line x1="54" y1="74" x2="66" y2="74" stroke="#E65100" strokeWidth="1.2"/>

      {/* Ağız / ifade */}
      <path d={ex.mouthPath} stroke="#E65100" strokeWidth="1.8" strokeLinecap="round"
        fill={expr === 'talking' ? 'rgba(0,0,0,0.2)' : 'none'}/>

      {/* Yanak */}
      <ellipse cx="34" cy="68" rx="8" ry="5" fill="rgba(255,138,128,0.4)"/>
      <ellipse cx="86" cy="68" rx="8" ry="5" fill="rgba(255,138,128,0.4)"/>

      {/* Şapka - bere */}
      <ellipse cx="60" cy="20" rx="30" ry="9" fill="#1A237E"/>
      <ellipse cx="60" cy="14" rx="25" ry="20" fill="#283593"/>
      <ellipse cx="60" cy="8" rx="18" ry="10" fill="#3949AB"/>
      <circle cx="60" cy="0" r="5" fill="#FF5252"/>
    </svg>
  )
}

// React import gerekli
import { useState, useEffect } from 'react'
