import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'

export default function FriendsScreen() {
  const { currentChild, setScreen, setProjectFriend, setProjectType, setIsProjectHost, subscription } = useApp()
  const plan = subscription?.plan || 'free'
  const hasFriends = plan === 'go' || plan === 'pro'

  const [friends, setFriends] = useState([])
  const [pending, setPending] = useState([])
  const [inviteCode, setInviteCode] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    await loadFriends()
    await loadPending()
  }

  async function loadFriends() {
    const { data } = await sb.from('friendships')
      .select('id, child_id_1, child_id_2, status')
      .or(`child_id_1.eq.${currentChild.id},child_id_2.eq.${currentChild.id}`)
      .eq('status', 'active')
    if (!data || data.length === 0) { setFriends([]); return }
    const friendIds = data.map(f => f.child_id_1 === currentChild.id ? f.child_id_2 : f.child_id_1)
    const { data: childrenData } = await sb.from('children_invite_lookup')
      .select('id, name, age, avatar_emoji, avatar_photo, bibi_specialty')
      .in('id', friendIds)
    const friendsWithData = data.map(f => {
      const friendId = f.child_id_1 === currentChild.id ? f.child_id_2 : f.child_id_1
      const friendData = childrenData?.find(c => c.id === friendId)
      return { ...f, friendData }
    }).filter(f => f.friendData)
    setFriends(friendsWithData)
  }

  async function loadPending() {
    const { data } = await sb.from('friendships')
      .select('id, child_id_1, child_id_2, status')
      .eq('child_id_2', currentChild.id)
      .eq('status', 'pending')
    if (!data || data.length === 0) { setPending([]); return }
    const senderIds = data.map(f => f.child_id_1)
    const { data: childrenData } = await sb.from('children_invite_lookup')
      .select('id, name, age, avatar_emoji, avatar_photo')
      .in('id', senderIds)
    const pendingWithData = data.map(f => {
      const senderData = childrenData?.find(c => c.id === f.child_id_1)
      return { ...f, senderData }
    }).filter(f => f.senderData)
    setPending(pendingWithData)
  }

  async function acceptFriend(friendship) {
    await sb.from('friendships').update({ status: 'active' }).eq('id', friendship.id)
    setPending(p => p.filter(f => f.id !== friendship.id))
    loadFriends()
  }

  async function rejectFriend(friendship) {
    await sb.from('friendships').delete().eq('id', friendship.id)
    setPending(p => p.filter(f => f.id !== friendship.id))
  }

  async function addFriend() {
    if (!inviteCode.trim()) return
    setLoading(true); setMsg('')
    const { data: found } = await sb.from('children_invite_lookup')
      .select('id, name').eq('invite_code', inviteCode.toUpperCase().trim()).single()
    if (!found) { setMsg('Davet kodu bulunamadı.'); setLoading(false); return }
    if (found.id === currentChild.id) { setMsg('Kendi kodunu giremezsin!'); setLoading(false); return }
    const { error } = await sb.from('friendships').insert({
      child_id_1: currentChild.id,
      child_id_2: found.id,
      status: 'pending',
      invited_by: currentChild.id,
      invite_code: inviteCode.toUpperCase()
    })
    if (error) setMsg('Zaten arkadaş isteği gönderilmiş.')
    else { setMsg(`${found.name} isimli çocuğa arkadaşlık isteği gönderildi! 🎉`); setInviteCode('') }
    setLoading(false)
  }

  function startProject(friendData) {
    setProjectFriend(friendData)
    setIsProjectHost(true)
    setScreen('projectSelect')
  }

  const [showProjectMenu, setShowProjectMenu] = useState(null)

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', flexDirection:'column', fontFamily:'Nunito,sans-serif' }}>

      <div style={{ background:'rgba(255,255,255,.06)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.08)', flexShrink:0 }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' }}>Arkadaşlar</div>
          <div style={{ color:'white', fontSize:18, fontWeight:900 }}>{currentChild.name}'in Arkadaşları</div>
        </div>
        <button onClick={()=>setScreen('children')} style={{ background:'rgba(255,255,255,.1)', border:'1.5px solid rgba(255,255,255,.2)', borderRadius:20, padding:'8px 14px', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>← Geri</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 80px', maxWidth:480, margin:'0 auto', width:'100%' }}>

        {!hasFriends ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
            <div style={{ color:'white', fontSize:18, fontWeight:900, marginBottom:8 }}>Arkadaş Sistemi</div>
            <div style={{ color:'rgba(255,255,255,.5)', fontSize:14, marginBottom:24, lineHeight:1.6 }}>
              Arkadaş ekleme ve proje yapma özelliği<br/>Bibi Go ve Bibi Pro planlarında kullanılabilir.
            </div>
            <button onClick={()=>setScreen('subscription')} style={{ padding:'13px 28px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#7C3AED,#0D9B7E)', color:'white', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>⭐ Planı Yükselt</button>
          </div>
        ) : (
          <div>
            {pending.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ color:'#fbbf24', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>
                  🔔 Bekleyen İstekler ({pending.length})
                </div>
                {pending.map(f => (
                  <div key={f.id} style={{ background:'rgba(251,191,36,.1)', border:'1.5px solid rgba(251,191,36,.3)', borderRadius:16, padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:'50%', overflow:'hidden', background:'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                      {f.senderData?.avatar_photo ? <img src={f.senderData.avatar_photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : f.senderData?.avatar_emoji || '👤'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ color:'white', fontSize:14, fontWeight:800 }}>{f.senderData?.name}</div>
                      <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginTop:2 }}>Arkadaşlık isteği gönderdi</div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>acceptFriend(f)} style={{ padding:'7px 12px', borderRadius:10, border:'none', background:'#0D9B7E', color:'white', fontSize:12, fontWeight:800, cursor:'pointer' }}>✓ Kabul</button>
                      <button onClick={()=>rejectFriend(f)} style={{ padding:'7px 10px', borderRadius:10, border:'none', background:'rgba(239,68,68,.3)', color:'#fca5a5', fontSize:12, fontWeight:800, cursor:'pointer' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background:'rgba(255,255,255,.06)', border:'1.5px solid rgba(255,255,255,.1)', borderRadius:16, padding:18, marginBottom:20 }}>
              <div style={{ color:'white', fontSize:14, fontWeight:800, marginBottom:12 }}>🤝 Arkadaş Ekle</div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, marginBottom:10 }}>Arkadaşının davet kodunu gir:</div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={inviteCode} onChange={e=>setInviteCode(e.target.value.toUpperCase())} placeholder="6 haneli kod" maxLength={6}
                  style={{ flex:1, padding:'11px 14px', borderRadius:10, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'white', fontSize:15, fontFamily:'Nunito,sans-serif', letterSpacing:3, textTransform:'uppercase' }}/>
                <button onClick={addFriend} disabled={loading} style={{ padding:'11px 16px', borderRadius:10, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
                  {loading ? '...' : 'Ekle'}
                </button>
              </div>
              {msg && <div style={{ color:msg.includes('!')? '#4ade80':'#fca88a', fontSize:12, marginTop:8 }}>{msg}</div>}
            </div>

            <div style={{ background:'rgba(13,155,126,.1)', border:'1.5px solid rgba(13,155,126,.2)', borderRadius:16, padding:16, marginBottom:20 }}>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, marginBottom:6 }}>SENİN DAVET KODUN</div>
              <div style={{ color:'white', fontSize:28, fontWeight:900, letterSpacing:6 }}>{currentChild.invite_code}</div>
              <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginTop:4 }}>Arkadaşlarına bu kodu ver</div>
            </div>

            <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:12 }}>
              Arkadaşlar ({friends.length})
            </div>
            {friends.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'rgba(255,255,255,.3)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
                <div style={{ fontSize:14 }}>Henüz arkadaş yok.<br/>Davet kodu ile ekle!</div>
              </div>
            ) : friends.map(f => (
              <div key={f.id} style={{ background:'rgba(255,255,255,.06)', border:'1.5px solid rgba(255,255,255,.1)', borderRadius:16, padding:'14px 16px', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:showProjectMenu===f.id?12:0 }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', overflow:'hidden', background:'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                    {f.friendData?.avatar_photo ? <img src={f.friendData.avatar_photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : f.friendData?.avatar_emoji || '👤'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:'white', fontSize:15, fontWeight:800 }}>{f.friendData?.name}</div>
                    <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginTop:2 }}>{f.friendData?.age} yaş</div>
                    {f.friendData?.bibi_specialty && <div style={{ color:'#4ade80', fontSize:11, marginTop:2 }}>⭐ {f.friendData.bibi_specialty} Uzmanı</div>}
                  </div>
                  <button onClick={() => setShowProjectMenu(showProjectMenu === f.id ? null : f.id)}
                    style={{ padding:'7px 14px', borderRadius:12, border:'none', background:'rgba(13,155,126,.3)', color:'#4ade80', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                    🚀 Proje Yap
                  </button>
                </div>
                {showProjectMenu === f.id && (
                  <div>
                    <button onClick={() => { setShowProjectMenu(null); startProject(f.friendData) }}
                      style={{ width:'100%', padding:'11px', borderRadius:12, border:'1.5px solid rgba(124,58,237,.4)', background:'rgba(124,58,237,.15)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
                      🎮 Aktivite Seç →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
