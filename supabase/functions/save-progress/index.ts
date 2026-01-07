import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { client_id, configuration_id, step_id, status, completed_at, skipped_at, api_key } = body;

    console.log('[save-progress] Received:', { client_id, configuration_id, step_id, status });

    if (!client_id || !configuration_id || !api_key) {
      return new Response(
        JSON.stringify({ error: 'client_id, configuration_id, and api_key are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate API key matches configuration
    const { data: config, error: configError } = await supabase
      .from('setup_configurations')
      .select('id')
      .eq('id', configuration_id)
      .eq('api_key', api_key)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('[save-progress] Invalid configuration or API key:', configError);
      return new Response(
        JSON.stringify({ error: 'Invalid configuration or API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert progress - update if exists, insert if not
    const progressData: Record<string, unknown> = {
      client_id,
      configuration_id,
      status: status || 'pending',
      updated_at: new Date().toISOString(),
    };

    if (step_id) {
      progressData.step_id = step_id;
    }

    if (completed_at) {
      progressData.completed_at = completed_at;
    }

    if (skipped_at) {
      progressData.skipped_at = skipped_at;
    }

    // Check if record exists
    const { data: existing } = await supabase
      .from('user_progress')
      .select('id')
      .eq('client_id', client_id)
      .eq('configuration_id', configuration_id)
      .eq('step_id', step_id || '')
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing record
      result = await supabase
        .from('user_progress')
        .update(progressData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new record
      result = await supabase
        .from('user_progress')
        .insert(progressData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('[save-progress] Database error:', result.error);
      return new Response(
        JSON.stringify({ error: 'Failed to save progress', details: result.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[save-progress] Progress saved successfully:', result.data?.id);

    return new Response(
      JSON.stringify({ success: true, progress: result.data }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[save-progress] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
