import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for server-side operations
const supaClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Create a public client for Google Places API (using the published anon key for the Edge Function context)
const publicSupaClient = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default async function handler(req: Request, res: Response) {
  try {
    const { category, radiusM, forceRefresh, userLocation } = await req.json();

    if (!category || !userLocation) {
      res.status(400).json({ error: 'Missing required parameters: category, userLocation' });
      return;
    }

    // Validate the category against allowed values
    const validCategories = ['supermarket', 'pharmacy', 'bank', 'petrol', 'atm', 'post_office', 'hospital', 'hardware', 'laundromat'];
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: 'Invalid category specified' });
      return;
    }

    // Search for places using Google Places API via the Supabase Edge Function
    // The GOOGLE_PLACES_API_KEY is set as a secret in Supabase dashboard
    const { data, error } = await supaClient.rpc('search_places_by_category', {
      p_category: category,
      p_radius: radiusM || 500,
      p_latitude: userLocation.latitude,
      p_longitude: userLocation.longitude,
      p_force_refresh: forceRefresh ?? false,
    });

    if (error) {
      console.error('Supabase RPC error:', error);
      res.status(500).json({ error: 'Place search failed', details: error.message });
      return;
    }

    res.status(200).json({ data, message: 'Category place discovery successful' });
  } catch (err) {
    console.error('Edge function error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
}