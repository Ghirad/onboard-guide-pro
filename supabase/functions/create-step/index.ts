import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      console.error('[create-step] Missing x-api-key header');
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { 
      configuration_id, 
      step_type, 
      selector, 
      title, 
      description, 
      position,
      element_data 
    } = body;

    console.log('[create-step] Received request:', { configuration_id, step_type, selector, title });

    // Validate required fields
    if (!configuration_id || !selector || !title) {
      console.error('[create-step] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'configuration_id, selector, and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key matches configuration
    const { data: config, error: configError } = await supabase
      .from('setup_configurations')
      .select('id, api_key')
      .eq('id', configuration_id)
      .single();

    if (configError || !config) {
      console.error('[create-step] Configuration not found:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (config.api_key !== apiKey) {
      console.error('[create-step] Invalid API key');
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the next step order
    const { data: existingSteps, error: stepsError } = await supabase
      .from('setup_steps')
      .select('step_order')
      .eq('configuration_id', configuration_id)
      .order('step_order', { ascending: false })
      .limit(1);

    if (stepsError) {
      console.error('[create-step] Error fetching steps:', stepsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch existing steps' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nextOrder = existingSteps && existingSteps.length > 0 
      ? existingSteps[0].step_order + 1 
      : 0;

    console.log('[create-step] Next step order:', nextOrder);

    // Determine target_type based on step_type
    const targetType = step_type === 'modal' ? 'modal' : 'page';

    // Create the step
    const { data: newStep, error: insertError } = await supabase
      .from('setup_steps')
      .insert({
        configuration_id,
        title,
        description: description || null,
        target_selector: selector,
        target_type: targetType,
        step_order: nextOrder,
        is_required: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[create-step] Error inserting step:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create step', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-step] Step created:', newStep.id);

    // For action types (click, input, wait, highlight), create an action too
    const actionTypes = ['click', 'input', 'wait', 'highlight'];
    if (actionTypes.includes(step_type)) {
      const { error: actionError } = await supabase
        .from('step_actions')
        .insert({
          step_id: newStep.id,
          action_type: step_type,
          selector: selector,
          action_order: 0,
          description: description || null,
        });

      if (actionError) {
        console.error('[create-step] Error creating action:', actionError);
        // Don't fail the whole request, step is already created
      } else {
        console.log('[create-step] Action created for step');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        step: newStep,
        step_number: nextOrder
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-step] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
