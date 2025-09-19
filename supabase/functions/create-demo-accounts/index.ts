import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const demoAccounts = [
      {
        email: 'admin@dubaitravel.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin'
      },
      {
        email: 'sales@dubaitravel.com',
        password: 'sales123',
        name: 'Sales Manager',
        role: 'sales'
      },
      {
        email: 'booking@dubaitravel.com',
        password: 'booking123',
        name: 'Booking Agent',
        role: 'booking'
      }
    ];

    const results = [];

    for (const account of demoAccounts) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(account.email);
        
        if (existingUser.user) {
          results.push({
            email: account.email,
            status: 'already_exists',
            message: 'User already exists'
          });
          continue;
        }

        // Create the user
        const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          user_metadata: {
            name: account.name,
            role: account.role
          },
          email_confirm: true
        });

        if (createError) {
          results.push({
            email: account.email,
            status: 'error',
            message: createError.message
          });
          continue;
        }

        results.push({
          email: account.email,
          status: 'created',
          message: 'User created successfully',
          user_id: user.user?.id
        });

      } catch (error) {
        results.push({
          email: account.email,
          status: 'error',
          message: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: 'Demo accounts creation process completed'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})