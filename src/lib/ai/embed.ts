import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env['OPENAI_API_KEY']! })

export async function embedText(text: string): Promise<number[]> {
  if (!text.trim()) throw new Error('[FFN][embed] Cannot embed empty text')

  const response = await openai.embeddings.create({
    model:      'text-embedding-3-small',
    input:      text.trim(),
    dimensions: 1536,
  })

  const vector = response.data[0]?.embedding
  if (!vector || vector.length !== 1536) {
    throw new Error('[FFN][embed] Unexpected embedding dimensions')
  }
  return vector
}

export function vectorToSql(vector: number[]): string {
  return '[' + vector.join(',') + ']'
}
