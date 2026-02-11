import { createClient } from '@supabase/supabase-js';
import algoliasearch from 'algoliasearch';

// Initialize Supabase client with secret key for server-side operations
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Initialize Algolia client with admin API key for server-side operations
const algoliaClient = algoliasearch(
  process.env.REACT_APP_ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

// Simple in-memory rate limiting
// Map of email -> array of timestamps
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_CLAIMS_PER_WINDOW = 5;

function checkRateLimit(email) {
  const now = Date.now();
  const userClaims = rateLimitStore.get(email) || [];

  // Remove claims outside the time window
  const recentClaims = userClaims.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentClaims.length >= MAX_CLAIMS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }

  // Add current claim and update store
  recentClaims.push(now);
  rateLimitStore.set(email, recentClaims);

  return true; // Within rate limit
}

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

    // Check rate limit
    if (!checkRateLimit(claimerEmail)) {
      return res.status(429).json({
        error: 'Too many claims. Please wait before claiming again.'
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

    // Decrement inventory in Algolia atomically
    try {
      await algoliaClient.partialUpdateObject({
        indexName: process.env.REACT_APP_ALGOLIA_INDEX_NAME,
        objectID: cardId,
        attributesToUpdate: {
          machine_quantity: {
            _operation: 'Decrement',
            value: 1
          }
        }
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
