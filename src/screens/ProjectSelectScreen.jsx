import { useApp } from '../lib/store'

const TYPES = [
  { id:"homework",  icon:"📚", name:"Birlikte Ödev Yap",      desc:"İki Bibi birlikte ödev sorularını çözer",           bg:"rgba(37,99,235,.2)",   border:"rgba(37,99,235,.4)" },
  { id:"experiment",icon:"🔬", name:"Birlikte Deney/Proje Yap", desc:"İki Bibi birlikte deney tasarlar ve araştırır",    bg:"rgba(13,155,126,.15)", border:"rgba(13,155,126,.3)" },
  { id:"quiz",      icon:"🎯", name:"Bilgi Yarışması",          desc:"5 dersten 5 soru, yaşına göre zorluk",              bg:"rgba(245,158,11,.12)", border:"rgba(245,158,11,.3)" },
]

export default function ProjectSelectScreen() {
  const { currentChild, projectFriend, setProjectType, setScreen } = useApp()

  if (!currentChild || !projectFriend) {
    setScreen('friends'); return null
  }

  function select(type) {
    setProjectType(type)
    setScreen('project')
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Nunito,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:420, animation:'fadeUp .4s ease' }}>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🚀</div>
          <div style={{ color:'white', fontSize:20, fontWeight:900 }}>{currentChild.name} & {projectFriend.name}</div>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginTop:4 }}>Hangi aktiviteyi yapmak istiyorsun?</div>
          <div style={{ color:'rgba(255,255,255,.35)', fontSize:12, marginTop:6 }}>{projectFriend.name}'e bildirim gidecek ve onaylaması beklenecek</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {TYPES.map(t => (
            <button key={t.id} onClick={() => select(t.id)} style={{ background:t.bg, border:`1.5px solid ${t.border}`, borderRadius:16, padding:18, cursor:'pointer', textAlign:'left', width:'100%', transition:'transform .2s', fontFamily:'Nunito,sans-serif' }}
              onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'}
              onMouseOut={e=>e.currentTarget.style.transform=''}>
              <div style={{ fontSize:24 }}>{t.icon}</div>
              <div style={{ color:'white', fontSize:15, fontWeight:800, marginTop:8 }}>{t.name}</div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, marginTop:3 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        <button onClick={() => setScreen('friends')} style={{ width:'100%', marginTop:16, padding:12, borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>← Geri</button>
      </div>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
