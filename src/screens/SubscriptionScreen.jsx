import { useState } from 'react'
import { useApp } from '../lib/store'

const PLANS = [
  {
    id: 'free',
    name: 'Ücretsiz',
    price: '0',
    color: '#6B7280',
    icon: '🌱',
    features: [
      '30 mesaj / gün',
      '3 görsel üretme / gün',
      '1 slayt / gün',
      'Temel öğrenme',
    ],
    disabled: ['Arkadaş bağlantısı yok', 'Rapor yok'],
  },
  {
    id: 'go',
    name: 'Bibi Go',
    price: '124,99',
    color: '#2563EB',
    icon: '🚀',
    popular: false,
    features: [
      '150 mesaj / gün',
      '10 görsel üretme / gün',
      '5 slayt / gün',
      'Ödev modu',
      'Arkadaş bağlantısı',
    ],
    disabled: ['Veli raporu yok'],
  },
  {
    id: 'pro',
    name: 'Bibi Pro',
    price: '199,99',
    color: '#7C3AED',
    icon: '⭐',
    popular: true,
    features: [
      'Sınırsız mesajlaşma',
      '50 görsel üretme / gün',
      '15 slayt / gün',
      'Ödev modu',
      'Arkadaş bağlantısı',
      'Veli raporları',
      'Duygu analizi',
    ],
    disabled: [],
  },
]

export default function SubscriptionScreen() {
  const { currentUser, subscription, setScreen } = useApp()
  const [loading, setLoading] = useState(null)

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
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#0f2535)', fontFamily:'Nunito,sans-serif', padding:'20px 16px 60px' }}>
      
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <button onClick={()=>setScreen('children')} style={{ background:'rgba(255,255,255,.1)', border:'1.5px solid rgba(255,255,255,.2)', borderRadius:20, padding:'8px 14px', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>← Geri</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ color:'white', fontSize:20, fontWeight:900 }}>Bibi Planları</div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginTop:2 }}>
            Mevcut plan: <span style={{ color:'#4ade80', fontWeight:700 }}>{currentPlan.toUpperCase()}</span>
          </div>
        </div>
        <div style={{ width:70 }}/>
      </div>

      {/* Plan kartları */}
      <div style={{ maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column', gap:14 }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id
          return (
            <div key={plan.id} style={{ background: isCurrent ? `${plan.color}22` : 'rgba(255,255,255,.05)', border:`2px solid ${isCurrent ? plan.color : 'rgba(255,255,255,.1)'}`, borderRadius:20, padding:'20px 18px', position:'relative', overflow:'hidden' }}>
              
              {plan.popular && (
                <div style={{ position:'absolute', top:12, right:12, background:'#7C3AED', color:'white', fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:20, letterSpacing:1 }}>EN POPÜLER</div>
              )}
              {isCurrent && (
                <div style={{ position:'absolute', top:12, right:12, background:'#0D9B7E', color:'white', fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:20 }}>AKTİF PLAN</div>
              )}

              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ fontSize:32 }}>{plan.icon}</div>
                <div>
                  <div style={{ color:'white', fontSize:18, fontWeight:900 }}>{plan.name}</div>
                  <div style={{ color:plan.color, fontSize:22, fontWeight:900 }}>
                    {plan.price === '0' ? 'Ücretsiz' : `₺${plan.price} / ay`}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ color:'#4ade80', fontSize:14 }}>✓</span>
                    <span style={{ color:'rgba(255,255,255,.8)', fontSize:13 }}>{f}</span>
                  </div>
                ))}
                {plan.disabled.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ color:'rgba(255,255,255,.25)', fontSize:14 }}>✗</span>
                    <span style={{ color:'rgba(255,255,255,.3)', fontSize:13 }}>{f}</span>
                  </div>
                ))}
              </div>

              {plan.id !== 'free' && !isCurrent && (
                <button onClick={() => subscribe(plan.id)} disabled={!!loading} style={{ width:'100%', padding:13, borderRadius:14, border:'none', background:`linear-gradient(135deg,${plan.color},${plan.color}bb)`, color:'white', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
                  {loading === plan.id ? '⏳ Yönlendiriliyor...' : `${plan.name} Planına Geç →`}
                </button>
              )}
              {isCurrent && plan.id !== 'free' && (
                <div style={{ textAlign:'center', color:'#4ade80', fontSize:13, fontWeight:700, padding:'10px 0' }}>✓ Aktif Planınız</div>
              )}
              {plan.id === 'free' && isCurrent && (
                <div style={{ textAlign:'center', color:'rgba(255,255,255,.3)', fontSize:12, padding:'8px 0' }}>Ücretsiz plandaki sınırları aşmak için yükseltin</div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ textAlign:'center', marginTop:24, color:'rgba(255,255,255,.3)', fontSize:11 }}>
        Güvenli ödeme Stripe ile sağlanmaktadır 🔒<br/>
        İstediğiniz zaman iptal edebilirsiniz
      </div>
    </div>
  )
}
