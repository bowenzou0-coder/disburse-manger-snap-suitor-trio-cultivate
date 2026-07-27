import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Modern Supabase Edge Function pattern with RLS enforcement
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase client with the request's authorization header
    // This ensures Row Level Security (RLS) policies are automatically enforced
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // 2. Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse request body
    const { action, payload, todoistToken } = await req.json();

    if (!action || !todoistToken) {
      return new Response(JSON.stringify({ error: "Missing action or todoistToken" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Queue the job atomically (or execute directly based on action)
    // Using the new sync_jobs table for robust background processing
    const { data: job, error: jobError } = await supabaseClient
      .from("sync_jobs")
      .insert({
        user_id: user.id,
        job_type: action === "push" ? "todoist_push" : "todoist_pull",
        payload: { ...payload, todoistToken }, // Note: In production, store token securely in vault, not payload
        status: "pending",
      })
      .select()
      .single();

    if (jobError) {
      throw jobError;
    }

    // 5. Return success (actual sync can be triggered via pg_cron or immediate execution here)
    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync job ${action} queued successfully`,
        jobId: job.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});