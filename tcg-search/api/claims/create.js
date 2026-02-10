import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with secret key for server-side operations
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      cardId,
      pokemonName,
      cardNumber,
      setName,
      cardValue,
      imageUrl,
      claimerName,
      claimerEmail,
    } = req.body;

    // Validate required fields
    if (!cardId || !pokemonName || !claimerName || !claimerEmail) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Validate claimer name (2-50 characters, alphanumeric and spaces)
    if (claimerName.trim().length < 2 || claimerName.length > 50) {
      return res.status(400).json({
        error: 'Name must be between 2 and 50 characters'
      });
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(claimerName)) {
      return res.status(400).json({
        error: 'Name can only contain letters, numbers, and spaces'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(claimerEmail)) {
      return res.status(400).json({
        error: 'Invalid email address'
      });
    }

    // Insert claim into Supabase
    const { data, error } = await supabase
      .from('claims')
      .insert([
        {
          card_id: cardId,
          pokemon_name: pokemonName,
          card_number: cardNumber,
          set_name: setName,
          card_value: cardValue,
          image_url: imageUrl,
          claimer_name: claimerName.trim(),
          claimer_email: claimerEmail.trim(),
        },
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to save claim'
      });
    }

    // Return success with the created claim
    return res.status(200).json({
      success: true,
      claim: data[0]
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
