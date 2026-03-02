import { createClient } from '@supabase/supabase-js';
import { algoliasearch } from 'algoliasearch';

// Validate required environment variables at startup
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'VITE_ALGOLIA_APP_ID',
  'ALGOLIA_WRITE_API_KEY',
];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Initialize Supabase client with secret key for server-side operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Initialize Algolia client with write API key for server-side operations
const algoliaClient = algoliasearch(
  process.env.VITE_ALGOLIA_APP_ID,
  process.env.ALGOLIA_WRITE_API_KEY
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      eventId,
      cardId,
      pokemonName,
      cardNumber,
      setName,
      cardValue,
      imageUrl,
      claimerFirstName,
      claimerLastName,
    } = req.body;

    if (!eventId || !cardId || !pokemonName || !claimerFirstName || !claimerLastName) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Validate first name (2-50 characters, alphanumeric and spaces)
    if (claimerFirstName.trim().length < 2 || claimerFirstName.length > 50) {
      return res.status(400).json({
        error: 'First name must be between 2 and 50 characters'
      });
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(claimerFirstName)) {
      return res.status(400).json({
        error: 'First name can only contain letters, numbers, and spaces'
      });
    }

    // Validate last name (2-50 characters, alphanumeric and spaces)
    if (claimerLastName.trim().length < 2 || claimerLastName.length > 50) {
      return res.status(400).json({
        error: 'Last name must be between 2 and 50 characters'
      });
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(claimerLastName)) {
      return res.status(400).json({
        error: 'Last name can only contain letters, numbers, and spaces'
      });
    }

    // Insert claim into Supabase
    const { data, error } = await supabase
      .from('claims')
      .insert([
        {
          event_id: eventId,
          card_id: cardId,
          pokemon_name: pokemonName,
          card_number: cardNumber,
          set_name: setName,
          card_value: cardValue,
          image_url: imageUrl,
          claimer_first_name: claimerFirstName.trim(),
          claimer_last_name: claimerLastName.trim(),
        },
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to save claim'
      });
    }

    // Decrement inventory in Algolia atomically
    try {
      await algoliaClient.partialUpdateObject({
        indexName: `tcg_cards_${eventId}`,
        objectID: cardId,
        attributesToUpdate: {
          machine_quantity: {
            _operation: 'Decrement',
            value: 1
          }
        },
        createIfNotExists: false
      });
    } catch (algoliaError) {
      // Log the error but don't fail the claim since it's already saved to Supabase
      console.error('Failed to update Algolia inventory:', algoliaError);
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
