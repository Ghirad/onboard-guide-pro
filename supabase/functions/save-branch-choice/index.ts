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
    const { clientId, configurationId, stepId, branchId } = await req.json();

    if (!clientId || !configurationId || !stepId || !branchId) {
      return new Response(
        JSON.stringify({ error: 'clientId, configurationId, stepId and branchId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert branch choice (update if exists, insert if not)
    const { data, error } = await supabase
      .from('user_branch_choices')
      .upsert(
        {
          client_id: clientId,
          configuration_id: configurationId,
          step_id: stepId,
          branch_id: branchId,
        },
        {
          onConflict: 'client_id,configuration_id,step_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[save-branch-choice] Error saving choice:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save branch choice' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[save-branch-choice] Saved choice for client ${clientId}: step ${stepId} -> branch ${branchId}`);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[save-branch-choice] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
