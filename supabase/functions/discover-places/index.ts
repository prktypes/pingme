import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for server-side operations
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

    // Use the Supabase database directly to check setup
    const { data, error } = await supaClient
      .from('reminder_targets')
      .select('*')
      .limit(1);

    if (error) {
      res.status(500).json({ error: 'Place search setup in progress', details: error.message });
      return;
    }

    res.status(200).json({ data, message: 'Category place discovery endpoint active' });
  } catch (err) {
    console.error('Edge function error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
}