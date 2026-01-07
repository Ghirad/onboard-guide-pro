import { createClient } from "npm:@supabase/supabase-js@2";

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
    const clientId = url.searchParams.get('clientId');

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

    // Fetch steps for this configuration WITH their actions AND branches
    // Use explicit FK reference to avoid ambiguity (step_branches has 2 FKs to setup_steps)
    const { data: steps, error: stepsError } = await supabase
      .from('setup_steps')
      .select(`
        *,
        actions:step_actions(*),
        branches:step_branches!step_branches_step_id_fkey(*)
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

    // Sort actions and branches within each step
    const stepsWithSortedData = (steps || []).map(step => ({
      ...step,
      actions: (step.actions || []).sort((a: any, b: any) => a.action_order - b.action_order),
      branches: (step.branches || []).sort((a: any, b: any) => a.branch_order - b.branch_order),
      theme_override: step.theme_override || null,
    }));

    // Fetch saved progress if clientId is provided
    let savedProgress: Record<string, { status: string; completed_at?: string; skipped_at?: string }> = {};
    let branchChoices: Record<string, string> = {};
    
    if (clientId) {
      console.log('[get-configuration] Fetching progress for clientId:', clientId);
      
      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('step_id, status, completed_at, skipped_at')
        .eq('client_id', clientId)
        .eq('configuration_id', configId);

      if (progressError) {
        console.error('[get-configuration] Progress fetch error:', progressError);
      } else if (progressData && progressData.length > 0) {
        console.log('[get-configuration] Found progress entries:', progressData.length);
        
        for (const entry of progressData) {
          if (entry.step_id) {
            savedProgress[entry.step_id] = {
              status: entry.status,
              completed_at: entry.completed_at || undefined,
              skipped_at: entry.skipped_at || undefined,
            };
          }
        }
      }

      // Fetch branch choices
      const { data: choicesData, error: choicesError } = await supabase
        .from('user_branch_choices')
        .select('step_id, branch_id')
        .eq('client_id', clientId)
        .eq('configuration_id', configId);

      if (choicesError) {
        console.error('[get-configuration] Branch choices fetch error:', choicesError);
      } else if (choicesData && choicesData.length > 0) {
        console.log('[get-configuration] Found branch choices:', choicesData.length);
        
        for (const choice of choicesData) {
          branchChoices[choice.step_id] = choice.branch_id;
        }
      }
    }

    // Return configuration, steps, saved progress, and branch choices
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
      steps: stepsWithSortedData,
      progress: savedProgress,
      branchChoices: branchChoices
    };

    console.log(`[get-configuration] Returned config ${configId} with ${steps?.length || 0} steps and ${Object.keys(savedProgress).length} progress entries`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
