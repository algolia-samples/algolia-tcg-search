function parseCardNumber(text) {
  // No word boundaries — the number is often embedded in surrounding digits (e.g. "300156/137")
  // Take the last match since the card number is printed at the bottom of the card
  const matches = [...text.matchAll(/(\d{1,3}\/\d{2,4})/g)];
  return matches.length > 0 ? matches[matches.length - 1][1] : null;
}

// Stage/type labels that appear before the Pokemon name
const STAGE_LABEL = /^(basic|stage\s*\d*|vmax|vstar|v\b|tag\s*team)/i;

function parsePokemonName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (STAGE_LABEL.test(line)) continue;
    // GCV concatenates name + HP digits with no space — strip trailing digits
    const name = line.replace(/\s*\d{2,3}$/, '').trim();
    // Must start with a letter and be at least 2 chars
    if (/^[A-Za-zÀ-ÖØ-öø-ÿ]/.test(name) && name.length >= 2) return name;
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Missing required field: image' });
  }

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OCR service not configured' });
  }

  try {
    const gcvResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [{ type: 'TEXT_DETECTION' }],
            },
          ],
        }),
      }
    );

    if (!gcvResponse.ok) {
      const errorBody = await gcvResponse.text();
      console.error('GCV error:', gcvResponse.status, errorBody);
      return res.status(500).json({ error: 'OCR request failed' });
    }

    const data = await gcvResponse.json();
    const text = data.responses?.[0]?.fullTextAnnotation?.text ?? '';

    return res.status(200).json({
      text,
      parsed_number: parseCardNumber(text),
      parsed_name: parsePokemonName(text),
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
