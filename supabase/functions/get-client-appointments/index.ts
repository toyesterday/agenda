import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to normalize phone numbers
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phone } = await req.json()
    if (!phone) {
      throw new Error("Phone number is required.")
    }

    const normalizedPhone = normalizePhone(phone);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Step 1: Find all client records matching the phone number, including loyalty points
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('id, loyalty_points')
      .filter('phone', 'ilike', `%${normalizedPhone}%`);

    if (clientsError) throw clientsError;
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ appointments: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const clientIds = clients.map((c: { id: number }) => c.id);
    const loyaltyMap = new Map(clients.map((c: { id: number; loyalty_points: any }) => [c.id, c.loyalty_points]));

    // Step 2: Fetch appointments for those client IDs
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        user_id,
        client_id,
        start_time,
        service_name,
        status,
        cancellation_token,
        professionals ( full_name )
      `)
      .in('client_id', clientIds)
      .order('start_time', { ascending: false });

    if (appointmentsError) throw appointmentsError;
    if (!appointments || appointments.length === 0) {
        return new Response(JSON.stringify({ appointments: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Step 3: Get unique business owner IDs
    const ownerIds = [...new Set(appointments.map((a: { user_id: string }) => a.user_id))];

    // Step 4: Fetch the profiles for these owners
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, business_name')
      .in('id', ownerIds);

    if (profilesError) throw profilesError;

    // Step 5: Create a map for easy lookup
    const profilesMap = new Map(profiles.map((p: { id: string; business_name: string | null }) => [p.id, p]));

    // Step 6: Stitch the data together
    const results = appointments.map((appt: any) => {
      const profile = profilesMap.get(appt.user_id) as { business_name: string | null } | undefined;
      const loyalty_points = loyaltyMap.get(appt.client_id);
      // We remove user_id from the final result to not expose it to the client
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user_id, ...rest } = appt; 
      return {
        ...rest,
        profiles: profile ? { business_name: profile.business_name } : null,
        loyalty_points: loyalty_points || null,
      };
    });

    return new Response(JSON.stringify({ appointments: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})