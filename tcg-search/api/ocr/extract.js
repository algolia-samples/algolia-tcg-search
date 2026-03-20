import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a Pokemon card expert. When shown a photo of a Pokemon card, identify it.

Respond with ONLY a valid JSON object, no explanation, no markdown fences:
{"name":"<Pokemon name, e.g. Pikachu or Charizard ex>","number":"<card number, e.g. 25/102 or TG01/TG30>","set":"<set name, e.g. Base Set>"}

Use null for any field you cannot identify. Example: {"name":"Pikachu","number":"25/102","set":"Base Set"}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image } = req.body;
  if (!image || typeof image !== 'string')
    return res.status(400).json({ error: 'Missing required field: image' });
  if (image.length > 10 * 1024 * 1024)
    return res.status(413).json({ error: 'Image too large' });
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: 'OCR service not configured' });

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: 'What Pokemon card is this?' },
        ],
      }],
    });

    let raw = message.content[0]?.text ?? '';
    // Strip markdown fences the model occasionally adds despite instructions
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('Claude returned non-JSON:', raw);
      return res.status(500).json({ error: 'Card identification failed' });
    }

    return res.status(200).json({
      name: parsed.name ?? null,
      number: parsed.number ?? null,
      set: parsed.set ?? null,
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
