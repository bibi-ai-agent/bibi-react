import { sb } from './supabase'
import { callAI } from './api'

export const EMOTIONS = [
  { id:'mutlu',     label:'Mutlu',     emoji:'😄', color:'#fbbf24' },
  { id:'heyecanlı', label:'Heyecanlı', emoji:'🤩', color:'#f97316' },
  { id:'sakin',     label:'Sakin',     emoji:'😌', color:'#4ade80' },
  { id:'üzgün',     label:'Üzgün',     emoji:'😢', color:'#60a5fa' },
  { id:'sinirli',   label:'Sinirli',   emoji:'😤', color:'#f87171' },
]

export async function detectEmotionFromMessage(text) {
  try {
    const result = await callAI(null, [{
      role: 'user',
      content: `Şu mesajdaki duygu durumunu tek kelimeyle belirle: "${text}"
Sadece şunlardan birini yaz: mutlu, heyecanlı, sakin, üzgün, sinirli
Başka hiçbir şey yazma.`
    }], 20)
    const emotion = result?.trim().toLowerCase()
    if (EMOTIONS.find(e => e.id === emotion)) return emotion
    return 'sakin'
  } catch { return 'sakin' }
}

export async function saveEmotionLog(childId, emotion, notes = '') {
  const today = new Date().toISOString().split('T')[0]
  try {
    await sb.from('emotion_logs').upsert({
      child_id: childId,
      date: today,
      emotion,
      notes,
    }, { onConflict: 'child_id,date', ignoreDuplicates: false })
  } catch {}
}

export async function getWeeklyEmotions(childId) {
  const week = new Date()
  week.setDate(week.getDate() - 7)
  const { data } = await sb.from('emotion_logs')
    .select('date,emotion,notes')
    .eq('child_id', childId)
    .gte('date', week.toISOString().split('T')[0])
    .order('date', { ascending: true })
  return data || []
}

export async function getMonthlyEmotions(childId) {
  const month = new Date()
  month.setDate(month.getDate() - 30)
  const { data } = await sb.from('emotion_logs')
    .select('date,emotion,notes')
    .eq('child_id', childId)
    .gte('date', month.toISOString().split('T')[0])
    .order('date', { ascending: true })
  return data || []
}

export function shouldAskDailyEmotion(messages) {
  // Günde bir kez, 5. mesajdan sonra sor
  return messages.length === 5
}
