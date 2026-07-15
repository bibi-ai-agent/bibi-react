import { useState } from 'react'

export default function ActionMenu({ onImage, onPDF, onPresentation, onHomework }) {
  const [open, setOpen] = useState(false)

  function handle(fn) { setOpen(false); fn() }

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        width:46, height:46, borderRadius:'50%',
        background: open ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.12)',
        border:'1.5px solid rgba(255,255,255,.2)', cursor:'pointer',
        color:'white', fontSize:22, fontWeight:300,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all .2s'
      }}>
        {open ? '✕' : '+'}
      </button>

      {open && (
        <>
          {/* Dışarı tıklayınca kapat */}
          <div style={{ position:'fixed', inset:0, zIndex:98 }} onClick={() => setOpen(false)}/>

          <div style={{
            position:'absolute', bottom:54, right:0, zIndex:99,
            background:'rgba(20,30,28,0.97)', backdropFilter:'blur(20px)',
            border:'1.5px solid rgba(255,255,255,.12)', borderRadius:16,
            padding:8, minWidth:200, boxShadow:'0 8px 32px rgba(0,0,0,.4)',
            animation:'fadeUp .2s ease'
          }}>
            {[
              { icon:'🎨', label:'Görsel Oluştur', fn: onImage },
              { icon:'📚', label:'Ödev Modu', fn: onHomework },
              { icon:'📄', label:'PDF Oluştur', fn: onPDF },
              { icon:'📊', label:'Sunu Hazırla', fn: onPresentation },
            ].map(item => (
              <button key={item.label} onClick={() => handle(item.fn)} style={{
                width:'100%', padding:'11px 14px', border:'none',
                background:'transparent', color:'white', fontSize:14, fontWeight:700,
                cursor:'pointer', borderRadius:10,
                display:'flex', alignItems:'center', gap:10,
                textAlign:'left', fontFamily:'Nunito,sans-serif',
                transition:'background .15s'
              }}
                onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,.08)'}
                onMouseOut={e => e.currentTarget.style.background='transparent'}
              >
                <span style={{ fontSize:18 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
