import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/store'

export default function FriendsScreen() {
  const { currentChild, setScreen, setProjectFriend } = useApp()
  const [friends, setFriends] = useState([])
  const [inviteCode, setInviteCode] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadFriends() }, [])

  async function loadFriends() {
    const { data } = await sb.from('friendships')
      .select('*, child1:children!child_id_1(id,name,age,avatar_emoji,avatar_photo), child2:children!child_id_2(id,name,age,avatar_emoji,avatar_photo)')
      .or(`child_id_1.eq.${currentChild.id},child_id_2.eq.${currentChild.id}`)
      .eq('status', 'accepted')
    setFriends(data || [])
  }

  async function addFriend() {
    if (!inviteCode.trim()) return
    setLoading(true)
    setMsg('')
    // Davet kodu ile çocuğu bul
    const { data: found } = await sb.from('children_invite_lookup')
      .select('*').eq('invite_code', inviteCode.toUpperCase().trim()).single()
    if (!found) { setMsg('Davet kodu bulunamadı.'); setLoading(false); return }
    if (found.id === currentChild.id) { setMsg('Kendi kodunu giremezsin!'); setLoading(false); return }

    // Arkadaşlık isteği gönder
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

  const getFriend = (f) => f.child1?.id === currentChild.id ? f.child2 : f.child1

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1A2E2A,#243d38)', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ background:'rgba(255,255,255,.06)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' }}>Arkadaşlar</div>
          <div style={{ color:'white', fontSize:18, fontWeight:900 }}>{currentChild.name}'in Arkadaşları</div>
        </div>
        <button onClick={()=>setScreen('children')} style={{ background:'rgba(255,255,255,.1)', border:'1.5px solid rgba(255,255,255,.2)', borderRadius:20, padding:'8px 14px', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>← Geri</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 80px', maxWidth:480, margin:'0 auto', width:'100%' }}>

        {/* Davet kodu ile ekle */}
        <div style={{ background:'rgba(255,255,255,.06)', border:'1.5px solid rgba(255,255,255,.1)', borderRadius:16, padding:18, marginBottom:20 }}>
          <div style={{ color:'white', fontSize:14, fontWeight:800, marginBottom:12 }}>🤝 Arkadaş Ekle</div>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, marginBottom:10 }}>
            Arkadaşının davet kodunu gir:
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              value={inviteCode}
              onChange={e=>setInviteCode(e.target.value.toUpperCase())}
              placeholder="6 haneli kod"
              maxLength={6}
              style={{ flex:1, padding:'11px 14px', borderRadius:10, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'white', fontSize:15, fontFamily:'Nunito,sans-serif', letterSpacing:3, textTransform:'uppercase' }}
            />
            <button onClick={addFriend} disabled={loading} style={{ padding:'11px 16px', borderRadius:10, border:'none', background:'#0D9B7E', color:'white', fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
              {loading ? '...' : 'Ekle'}
            </button>
          </div>
          {msg && <div style={{ color:msg.includes('!')? '#4ade80':'#fca88a', fontSize:12, marginTop:8 }}>{msg}</div>}
        </div>

        {/* Kendi davet kodu */}
        <div style={{ background:'rgba(13,155,126,.1)', border:'1.5px solid rgba(13,155,126,.2)', borderRadius:16, padding:16, marginBottom:20 }}>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, marginBottom:6 }}>SENİN DAVET KODUN</div>
          <div style={{ color:'white', fontSize:28, fontWeight:900, letterSpacing:6 }}>{currentChild.invite_code}</div>
          <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginTop:4 }}>Arkadaşlarına bu kodu ver</div>
        </div>

        {/* Arkadaş listesi */}
        <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:12 }}>
          Arkadaşlar ({friends.length})
        </div>

        {friends.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'rgba(255,255,255,.3)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
            <div style={{ fontSize:14 }}>Henüz arkadaş yok.<br/>Davet kodu ile ekle!</div>
          </div>
        ) : friends.map(f => {
          const friend = getFriend(f)
          if (!friend) return null
          return (
            <div key={f.id} style={{ background:'rgba(255,255,255,.06)', border:'1.5px solid rgba(255,255,255,.1)', borderRadius:16, padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', overflow:'hidden', background:'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                {friend.avatar_photo ? <img src={friend.avatar_photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : friend.avatar_emoji||'👤'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:'white', fontSize:15, fontWeight:800 }}>{friend.name}</div>
                <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginTop:2 }}>{friend.age} yaş</div>
              </div>
              <button onClick={() => { setProjectFriend(friend); setScreen('projectSelect') }} style={{ padding:'7px 14px', borderRadius:12, border:'none', background:'rgba(13,155,126,.3)', color:'#4ade80', fontSize:12, fontWeight:800, cursor:'pointer' }}>🚀 Proje Yap</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
