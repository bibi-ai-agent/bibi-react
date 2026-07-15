export default function BibiFace({ expr = "idle", size = 44 }) {
  const expressions = {
    idle:     { eyes: "M42,48 Q45,44 48,48 M82,48 Q85,44 88,48", mouth: "M52,72 Q65,80 78,72", eyebrows: "" },
    happy:    { eyes: "M42,46 Q45,42 48,46 M82,46 Q85,42 88,46", mouth: "M48,68 Q65,85 82,68", eyebrows: "" },
    thinking: { eyes: "M42,48 Q45,46 48,48 M82,48 Q85,46 88,48", mouth: "M55,74 Q65,78 75,74", eyebrows: "M40,40 Q50,36 55,40 M75,40 Q80,36 90,38" },
    talking:  { eyes: "M42,47 Q45,43 48,47 M82,47 Q85,43 88,47", mouth: "M52,68 Q65,80 78,68 Q65,88 52,68", eyebrows: "" },
    sad:      { eyes: "M42,50 Q45,46 48,50 M82,50 Q85,46 88,50", mouth: "M52,78 Q65,70 78,78", eyebrows: "M40,42 Q50,46 55,42 M75,42 Q80,46 90,42" },
    excited:  { eyes: "M42,44 Q45,40 48,44 M82,44 Q85,40 88,44", mouth: "M46,66 Q65,88 84,66", eyebrows: "M40,36 Q50,32 55,36 M75,36 Q80,32 90,36" },
    curious:  { eyes: "M42,48 Q45,44 48,48 M84,46 Q87,42 90,46", mouth: "M54,74 Q65,80 76,74", eyebrows: "M40,40 Q50,36 55,40 M77,38 Q84,34 90,38" },
  }
  const e = expressions[expr] || expressions.idle

  return (
    <svg width={size} height={size} viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={"bibig" + expr + size} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#1aefb0"/>
          <stop offset="100%" stopColor="#0a8a63"/>
        </radialGradient>
      </defs>
      <ellipse cx="65" cy="120" rx="40" ry="8" fill="rgba(0,0,0,0.15)"/>
      <circle cx="65" cy="65" r="60" fill={"url(#bibig" + expr + size + ")"}/>
      <circle cx="65" cy="65" r="60" fill="rgba(255,255,255,0.06)"/>
      <ellipse cx="45" cy="35" rx="18" ry="10" fill="rgba(255,255,255,0.15)" transform="rotate(-30 45 35)"/>
      <line x1="55" y1="8" x2="50" y2="22" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="50" cy="7" r="5" fill="#4ade80"/>
      <circle cx="50" cy="7" r="3" fill="#86efac"/>
      <line x1="75" y1="8" x2="80" y2="22" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="80" cy="7" r="5" fill="#4ade80"/>
      <circle cx="80" cy="7" r="3" fill="#86efac"/>
      {e.eyebrows && <path d={e.eyebrows} stroke="rgba(255,255,255,0.75)" strokeWidth="3" strokeLinecap="round" fill="none"/>}
      <path d={e.eyes} stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <circle cx="43" cy="46" r="1.5" fill="rgba(255,255,255,0.8)"/>
      <circle cx="83" cy="46" r="1.5" fill="rgba(255,255,255,0.8)"/>
      <path d={e.mouth} stroke="white" strokeWidth="3" strokeLinecap="round" fill={expr === "talking" ? "rgba(0,0,0,0.25)" : "none"}/>
      <ellipse cx="30" cy="76" rx="11" ry="7" fill="rgba(255,150,150,0.3)"/>
      <ellipse cx="100" cy="76" rx="11" ry="7" fill="rgba(255,150,150,0.3)"/>
    </svg>
  )
}
