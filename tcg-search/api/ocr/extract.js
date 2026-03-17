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

    return res.status(200).json({ text });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
