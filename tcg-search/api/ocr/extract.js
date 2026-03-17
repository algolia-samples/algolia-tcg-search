function parseCardNumber(text) {
  const match = text.match(/\b(\d{1,3}\/\d{2,4})\b/);
  return match ? match[1] : null;
}

function parsePokemonName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Try: find a line containing "HP" and extract the name before it
  for (const line of lines) {
    const match = line.match(/^([A-Za-z][A-Za-z\s\-'.éÉ]+?)\s+\d+\s*HP\b/i);
    if (match) return match[1].trim();
  }

  // Fallback: return the line immediately before the first line matching "^\d+\s*HP"
  for (let i = 1; i < lines.length; i++) {
    if (/^\d+\s*HP\b/i.test(lines[i])) return lines[i - 1];
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
      potential_number: parseCardNumber(text),
      potential_name: parsePokemonName(text),
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
