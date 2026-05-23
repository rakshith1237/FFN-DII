import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as fs from 'fs'

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const serviceKey  = process.env['SUPABASE_SERVICE_ROLE_KEY']!
const openaiKey   = process.env['OPENAI_API_KEY']!

if (!supabaseUrl || !serviceKey || !openaiKey) {
  console.error('Missing env vars'); process.exit(1)
}

const db = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const openai = new OpenAI({ apiKey: openaiKey })

async function embedText(text: string): Promise<number[]> {
  const r = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text.trim(), dimensions: 1536 })
  const v = r.data[0]?.embedding
  if (!v || v.length !== 1536) throw new Error('Bad dimensions')
  return v
}

async function main() {
  const { data: rows, error } = await db.from('x_ffn_bench_index').select('id, skill_text').eq('is_current', true)
  if (error) { console.error('Fetch failed:', error.message); process.exit(1) }
  if (!rows?.length) { console.log('No rows.'); process.exit(0) }
  console.log('Generating SQL for', rows.length, 'candidates...')
  const lines: string[] = ['-- FFN bench vectors', 'BEGIN;']
  let i = 0
  for (const row of rows) {
    if (!row.skill_text?.trim()) { console.warn('SKIP', row.id); continue }
    try {
      const v = await embedText(row.skill_text)
      const vStr = '[' + v.join(',') + ']'
      lines.push(`UPDATE x_ffn_bench_index SET skill_vector = '${vStr}'::vector, embedded_at = now(), embedding_model = 'text-embedding-3-small' WHERE id = '${row.id}';`)
      i++
      console.log('OK', i, '/', rows.length, row.id)
    } catch(e) { console.error('FAIL', row.id, (e as Error).message) }
    await new Promise(r => setTimeout(r, 100))
  }
  lines.push('COMMIT;')
  fs.writeFileSync('scripts/bench-vectors.sql', lines.join('\n'))
  console.log('\nDone. SQL written to scripts/bench-vectors.sql')
  console.log('Paste that file into Supabase SQL Editor and run it.')
}

main().catch(e => { console.error(e); process.exit(1) })