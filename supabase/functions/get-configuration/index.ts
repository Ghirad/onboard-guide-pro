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

  try {
    const url = new URL(req.url);
    const configId = url.searchParams.get('configId');
    const apiKey = url.searchParams.get('apiKey');

    if (!configId || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'configId and apiKey are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch configuration and validate API key
    const { data: config, error: configError } = await supabase
      .from('setup_configurations')
      .select('*')
      .eq('id', configId)
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('Configuration error:', configError);
      return new Response(
        JSON.stringify({ error: 'Invalid configuration or API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch steps for this configuration WITH their actions
    const { data: steps, error: stepsError } = await supabase
      .from('setup_steps')
      .select(`
        *,
        actions:step_actions(*)
      `)
      .eq('configuration_id', configId)
      .order('step_order', { ascending: true });

    if (stepsError) {
      console.error('Steps error:', stepsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch steps' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sort actions within each step by action_order and include theme_override
    const stepsWithSortedActions = (steps || []).map(step => ({
      ...step,
      actions: (step.actions || []).sort((a: any, b: any) => a.action_order - b.action_order),
      theme_override: step.theme_override || null,
    }));

    // Return configuration and steps
    const response = {
      configuration: {
        id: config.id,
        name: config.name,
        description: config.description,
        target_url: config.target_url,
        widget_position: config.widget_position,
        auto_start: config.auto_start,
        allowed_routes: config.allowed_routes || [],
        // Theme settings
        theme: {
          template: config.theme_template || 'modern',
          primaryColor: config.theme_primary_color || '#6366f1',
          secondaryColor: config.theme_secondary_color || '#8b5cf6',
          backgroundColor: config.theme_background_color || '#ffffff',
          textColor: config.theme_text_color || '#1f2937',
          highlightAnimation: config.theme_highlight_animation || 'pulse',
          borderRadius: config.theme_border_radius || 'rounded'
        },
        // Action type specific styles
        actionTypeStyles: config.action_type_styles || {}
      },
      steps: stepsWithSortedActions
    };

    console.log(`[get-configuration] Returned config ${configId} with ${steps?.length || 0} steps`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
