import { useState } from 'react'
import { useApp } from '../lib/store'

const PLANS = [
  {
    id: 'free',
    name: 'Ücretsiz',
    price: '0',
    color: '#6B7280',
    gradient: 'linear-gradient(135deg,#374151,#1f2937)',
    icon: '🌱',
    tagline: 'Başlangıç için ideal',
    features: [
      { icon:'💬', text:'Günlük 30 mesaj' },
      { icon:'🎨', text:'Günlük 3 görsel üretme' },
      { icon:'📊', text:'Günlük 1 slayt' },
      { icon:'📖', text:'Hikaye modu' },
      { icon:'🎮', text:'Tüm oyunlar (tek kişi)' },
      { icon:'👤', text:'1 çocuk profili' },
    ],
    disabled: [
      { icon:'📸', text:'Ödev fotoğrafı modu yok' },
      { icon:'🤝', text:'Arkadaş bağlantısı yok' },
      { icon:'📋', text:'Veli raporu yok' },
      { icon:'💙', text:'Duygu analizi yok' },
      { icon:'🧠', text:'Kişilik profili yok' },
    ],
  },
  {
    id: 'go',
    name: 'Bibi Go',
    price: '124,99',
    color: '#2563EB',
    gradient: 'linear-gradient(135deg,#1d4ed8,#1e40af)',
    icon: '🚀',
    tagline: 'Aileler için en çok tercih edilen',
    popular: false,
    features: [
      { icon:'💬', text:'Günlük 150 mesaj' },
      { icon:'🎨', text:'Günlük 10 görsel üretme' },
      { icon:'📊', text:'Günlük 5 slayt' },
      { icon:'📸', text:'Günlük 3 ödev fotoğrafı' },
      { icon:'📖', text:'Hikaye modu' },
      { icon:'🎮', text:'Tüm oyunlar (tek & arkadaşla)' },
      { icon:'🤝', text:'Arkadaş bağlantısı & projeler' },
      { icon:'🌐', text:'Web arama (güncel bilgiler)' },
      { icon:'👤', text:'2 çocuk profili' },
    ],
    disabled: [
      { icon:'📋', text:'Veli raporu yok' },
      { icon:'💙', text:'Duygu analizi yok' },
      { icon:'🧠', text:'Kişilik profili yok' },
    ],
  },
  {
    id: 'pro',
    name: 'Bibi Pro',
    price: '199,99',
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg,#6d28d9,#5b21b6)',
    icon: '⭐',
    tagline: 'En kapsamlı deneyim',
    popular: true,
    features: [
      { icon:'💬', text:'Sınırsız mesajlaşma' },
      { icon:'🎨', text:'Günlük 50 görsel üretme' },
      { icon:'📊', text:'Günlük 15 slayt' },
      { icon:'📸', text:'Günlük 10 ödev fotoğrafı' },
      { icon:'📖', text:'Hikaye modu (resimli & sesli)' },
      { icon:'🎮', text:'Tüm oyunlar (tek & arkadaşla)' },
      { icon:'🤝', text:'Arkadaş bağlantısı & projeler' },
      { icon:'🌐', text:'Web arama (güncel bilgiler)' },
      { icon:'📋', text:'Haftalık & aylık veli raporu' },
      { icon:'💙', text:'Duygu durum analizi & grafik' },
      { icon:'🧠', text:'Kişilik profili (OCEAN modeli)' },
      { icon:'🎯', text:'Dolaylı yönde eğitim sistemi' },
      { icon:'👤', text:'3 çocuk profili' },
    ],
    disabled: [],
  },
]

export default function SubscriptionScreen() {
  const { currentUser, subscription, setScreen } = useApp()
  const [loading, setLoading] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)

  async function subscribe(plan) {
    if (plan === 'free') return
    setLoading(plan)
    try {
      const res = await fetch('https://bibi-app-rho.vercel.app/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          parentId: currentUser.id,
          parentEmail: currentUser.email,
          successUrl: `${window.location.origin}?success=true`,
          cancelUrl: `${window.location.origin}?cancel=true`,
        })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Ödeme sayfası açılamadı: ' + (data.error || 'Bilinmeyen hata'))
    } catch (e) {
      alert('Hata: ' + e.message)
    }
    setLoading(null)
  }

  const currentPlan = subscription?.plan || 'free'

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f1a16,#0a1520)', fontFamily:'Nunito,sans-serif' }}>
      
      {/* Header */}
      <div style={{ background:'rgba(255,255,255,.04)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.08)', padding:'16px 20px', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ maxWidth:520, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={()=>setScreen('parentDashboard')} style={{ background:'rgba(255,255,255,.1)', border:'1.5px solid rgba(255,255,255,.15)', borderRadius:20, padding:'8px 14px', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>← Geri</button>
          <div style={{ textAlign:'center' }}>
            <div style={{ color:'white', fontSize:18, fontWeight:900 }}>Bibi Planları</div>
            <div style={{ color:'rgba(255,255,255,.4)', fontSize:11, marginTop:1 }}>
              Aktif: <span style={{ color:'#FCD34D', fontWeight:700 }}>{PLANS.find(p=>p.id===currentPlan)?.name}</span>
            </div>
          </div>
          <div style={{ width:70 }}/>
        </div>
      </div>

      <div style={{ maxWidth:520, margin:'0 auto', padding:'24px 16px 60px' }}>

        {/* Üst başlık */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🌟</div>
          <div style={{ color:'white', fontSize:22, fontWeight:900, marginBottom:6 }}>Çocuğunuz için en iyisini seçin</div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:13, lineHeight:1.6 }}>Dai, yapay zeka destekli kişisel öğrenme arkadaşı.<br/>Her plan 7 gün ücretsiz deneme ile başlar.</div>
        </div>

        {/* Plan kartları */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.id
            const isSelected = selectedPlan === plan.id

            return (
              <div key={plan.id}
                onClick={() => setSelectedPlan(plan.id === selectedPlan ? null : plan.id)}
                style={{ background: isCurrent ? `${plan.color}18` : 'rgba(255,255,255,.04)', border:`2px solid ${isCurrent ? plan.color : isSelected ? plan.color+'88' : 'rgba(255,255,255,.1)'}`, borderRadius:20, overflow:'hidden', cursor:'pointer', transition:'all .2s' }}>

                {/* Plan başlık */}
                <div style={{ padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:48, height:48, borderRadius:14, background:plan.gradient, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{plan.icon}</div>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ color:'white', fontSize:17, fontWeight:900 }}>{plan.name}</div>
                        {plan.popular && !isCurrent && <div style={{ background:'#7C3AED', color:'white', fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:10, letterSpacing:.5 }}>POPÜLER</div>}
                        {isCurrent && <div style={{ background:'#F59E0B', color:'white', fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:10 }}>AKTİF</div>}
                      </div>
                      <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, marginTop:2 }}>{plan.tagline}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:plan.color, fontSize:20, fontWeight:900 }}>{plan.price === '0' ? 'Ücretsiz' : `₺${plan.price}`}</div>
                    {plan.price !== '0' && <div style={{ color:'rgba(255,255,255,.3)', fontSize:10 }}>/ ay</div>}
                  </div>
                </div>

                {/* Özellikler — her zaman görünsün */}
                <div style={{ padding:'0 20px 18px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ paddingTop:14 }}>
                    {plan.features.map((f,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                        <span style={{ fontSize:14 }}>{f.icon}</span>
                        <span style={{ color:'rgba(255,255,255,.8)', fontSize:13 }}>{f.text}</span>
                        <span style={{ marginLeft:'auto', color:'#FCD34D', fontSize:13, fontWeight:700 }}>✓</span>
                      </div>
                    ))}
                    {plan.disabled.map((f,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                        <span style={{ fontSize:14, opacity:.4 }}>{f.icon}</span>
                        <span style={{ color:'rgba(255,255,255,.25)', fontSize:13 }}>{f.text}</span>
                        <span style={{ marginLeft:'auto', color:'rgba(255,255,255,.2)', fontSize:13 }}>✗</span>
                      </div>
                    ))}
                  </div>

                  {/* Buton */}
                  {plan.id !== 'free' && !isCurrent && (
                    <button onClick={e => { e.stopPropagation(); subscribe(plan.id) }} disabled={!!loading}
                      style={{ width:'100%', padding:13, borderRadius:14, border:'none', background:plan.gradient, color:'white', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'Nunito,sans-serif', marginTop:14, boxShadow:`0 4px 20px ${plan.color}44` }}>
                      {loading === plan.id ? '⏳ Yönlendiriliyor...' : `${plan.name} Planına Geç →`}
                    </button>
                  )}
                  {isCurrent && plan.id !== 'free' && (
                    <div style={{ textAlign:'center', color:'#FCD34D', fontSize:13, fontWeight:700, padding:'10px 0 0' }}>✓ Aktif Planınız</div>
                  )}
                  {plan.id === 'free' && isCurrent && (
                    <div style={{ textAlign:'center', color:'rgba(255,255,255,.25)', fontSize:12, padding:'10px 0 0' }}>Daha fazlası için yukarıdaki planları inceleyin</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Alt bilgi */}
        <div style={{ marginTop:28, background:'rgba(255,255,255,.04)', borderRadius:16, padding:'16px 18px' }}>
          <div style={{ color:'rgba(255,255,255,.6)', fontSize:12, lineHeight:1.8 }}>
            <div style={{ color:'white', fontSize:13, fontWeight:800, marginBottom:8 }}>📋 Sık Sorulan Sorular</div>
            <div style={{ marginBottom:6 }}><span style={{ color:'#FCD34D' }}>•</span> İstediğiniz zaman iptal edebilirsiniz</div>
            <div style={{ marginBottom:6 }}><span style={{ color:'#FCD34D' }}>•</span> İlk 7 gün ücretsiz deneme</div>
            <div style={{ marginBottom:6 }}><span style={{ color:'#FCD34D' }}>•</span> Plan değişikliği anında aktif olur</div>
            <div><span style={{ color:'#FCD34D' }}>•</span> Güvenli ödeme Stripe ile sağlanır 🔒</div>
          </div>
        </div>
      </div>
    </div>
  )
}
