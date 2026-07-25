import { sb } from './supabase'

const BASE = "https://image.pollinations.ai/prompt"

function makeUrl(prompt, seed) {
  return `${BASE}/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`
}

export async function updateStoryImages() {
  const { data: stories, error } = await sb.from('stories').select('id, image_prompts')
  if (error) { console.error(error); return }

  console.log(`${stories.length} hikaye için URL'ler hesaplanıyor...`)

  for (const story of stories) {
    const image_urls = (story.image_prompts || []).map((prompt, i) =>
      makeUrl(prompt, story.id.slice(0, 8) + i)
    )
    await sb.from('stories').update({ image_urls }).eq('id', story.id)
  }

  console.log('✅ Tüm görsel URL\'leri güncellendi!')
}
